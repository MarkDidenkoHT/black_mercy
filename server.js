require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function callGenerateTravelers(playerId, sessionId) {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/generate-travelers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      player_id: playerId,
      session_id: sessionId
    })
  });

  if (!response.ok) throw new Error('Failed to generate travelers');
  return await response.json();
}

async function calculateStructureTotals(playerId, sessionId) {
  const { data: structures } = await supabase
    .from('structures')
    .select('status')
    .eq('player', playerId)
    .eq('session', sessionId);

  const totals = {
    human: 0,
    infected: 0,
    possessed: 0
  };

  if (structures && structures.length > 0) {
    structures.forEach(structure => {
      if (structure.status) {
        totals.human += parseInt(structure.status.human || 0);
        totals.infected += parseInt(structure.status.infected || 0);
        totals.possessed += parseInt(structure.status.possessed || 0);
      }
    });
  }

  return totals;
}

app.post('/api/auth/check', async (req, res) => {
  try {
    const { chatId, playerName, playerLanguage, timezone } = req.body;

    if (!chatId) return res.status(400).json({ error: 'Chat ID is required' });

    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (existingPlayer) {
      if (timezone && timezone !== existingPlayer.timezone) {
        await supabase
          .from('players')
          .update({ timezone: timezone })
          .eq('id', existingPlayer.id);
        existingPlayer.timezone = timezone;
      }

      const { data: activeSession } = await supabase
        .from('sessions')
        .select('*')
        .eq('player', existingPlayer.id)
        .eq('active', true)
        .single();

      if (!activeSession) {
        return res.json({ 
          exists: true, 
          player: existingPlayer,
          needsPetSelection: true
        });
      }

      const { data: reputationData } = await supabase
        .from('reputation')
        .select('*')
        .eq('player', existingPlayer.id)
        .eq('session', activeSession.id)
        .single();

      const structureTotals = await calculateStructureTotals(existingPlayer.id, activeSession.id);

      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*')
        .eq('player', existingPlayer.id)
        .eq('session', activeSession.id)
        .single();

      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('player', existingPlayer.id)
        .eq('session', activeSession.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: currentTravelers } = await supabase
        .from('travelers')
        .select('*')
        .eq('player', existingPlayer.id)
        .eq('session', activeSession.id)
        .eq('day', activeSession.day || 1)
        .order('order->position');

      return res.json({ 
        exists: true, 
        player: existingPlayer,
        session: activeSession,
        population: structureTotals,
        hidden_reputation: reputationData?.hidden_reputation || { cult: 0, inquisition: 0, undead: 0 },
        inventory: inventoryData?.items || {},
        available_interactions: activeSession.available_interactions || ['check-papers', 'let-in', 'push-out'],
        events: eventsData || [],
        travelers: currentTravelers || [],
        pet: activeSession.pet || null
      });
    }

    const { data: newPlayer, error: playerError } = await supabase
      .from('players')
      .insert([{
        chat_id: chatId,
        player_name: playerName || 'Player',
        player_language: playerLanguage || 'EN',
        timezone: timezone || null
      }])
      .select()
      .single();

    if (playerError) throw playerError;

    return res.json({ 
      exists: false, 
      player: newPlayer,
      needsPetSelection: true
    });

  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/pet/select', async (req, res) => {
  try {
    const { chatId, pet } = req.body;

    if (!chatId || !pet) {
      return res.status(400).json({ error: 'chatId and pet are required' });
    }

    if (!['cat', 'owl'].includes(pet)) {
      return res.status(400).json({ error: 'Invalid pet selection' });
    }

    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (!player) return res.status(404).json({ error: 'Player not found' });

    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert([{
        player: player.id,
        active: true,
        day: 1,
        pet: pet
      }])
      .select()
      .single();

    if (sessionError) throw sessionError;

    await callGenerateTravelers(player.id, newSession.id);

    await supabase.from('reputation').insert([{
      player: player.id,
      session: newSession.id,
      hidden_reputation: { cult: 0, inquisition: 0, undead: 0 }
    }]);

    await supabase.from('inventory').insert([{
      player: player.id,
      session: newSession.id,
      items: { 'holy water': 2, 'lantern fuel': 2, 'medicinal herbs': 2 }
    }]);

    await supabase.from('events').insert([{
      player: player.id,
      session: newSession.id,
      event: `Your adventure begins with your faithful ${pet} by your side.`
    }]);

    const { data: day1Travelers } = await supabase
      .from('travelers')
      .select('*')
      .eq('player', player.id)
      .eq('session', newSession.id)
      .eq('day', 1)
      .order('order->position');

    const structureTotals = await calculateStructureTotals(player.id, newSession.id);

    return res.json({ 
      success: true,
      session: newSession,
      population: structureTotals,
      hidden_reputation: { cult: 0, inquisition: 0, undead: 0 },
      inventory: { 'holy water': 2, 'lantern fuel': 2, 'medicinal herbs': 2 },
      available_interactions: ['check-papers', 'let-in', 'push-out'],
      events: [{ event: `Your adventure begins with your faithful ${pet} by your side.` }],
      travelers: day1Travelers || [],
      pet: pet
    });

  } catch (error) {
    console.error('Pet selection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/travelers/get-day', async (req, res) => {
  try {
    const { chatId, day } = req.body;

    if (!chatId || !day) return res.status(400).json({ error: 'chatId and day are required' });

    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (!player) return res.status(404).json({ error: 'Player not found' });

    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('player', player.id)
      .eq('active', true)
      .single();

    if (!session) return res.status(404).json({ error: 'Active session not found' });

    const { data: travelers } = await supabase
      .from('travelers')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .eq('day', day)
      .order('order->position');

    return res.json({
      success: true,
      day: day,
      travelers: travelers || [],
      available_interactions: session.available_interactions || ['check-papers', 'let-in', 'push-out']
    });

  } catch (error) {
    console.error('Get day travelers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/travelers/decision', async (req, res) => {
  try {
    const { chatId, travelerId, decision } = req.body;

    if (!chatId || !travelerId || !decision) {
      return res.status(400).json({ error: 'chatId, travelerId, and decision are required' });
    }

    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (!player) return res.status(404).json({ error: 'Player not found' });

    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('player', player.id)
      .eq('active', true)
      .single();

    if (!session) return res.status(404).json({ error: 'Active session not found' });

    const { data: traveler } = await supabase
      .from('travelers')
      .select('*')
      .eq('id', travelerId)
      .eq('player', player.id)
      .eq('session', session.id)
      .single();

    if (!traveler) return res.status(404).json({ error: 'Traveler not found' });

    const { data: reputation } = await supabase
      .from('reputation')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .single();

    const travelerData = traveler.traveler;
    
    const structureId = travelerData.structure;
    
    const { data: structure } = await supabase
      .from('structures')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .eq('structure', structureId)
      .single();

    if (!structure) {
      return res.status(404).json({ error: 'Structure not found' });
    }

    let currentStatus = { ...structure.status };
    let currentHiddenRep = { ...(reputation.hidden_reputation || { cult: 0, inquisition: 0, undead: 0 }) };

    const applyEffect = (effect, target) => {
      if (effect && typeof effect === 'string') {
        const parts = effect.split(' ');
        if (parts.length === 2) {
          const [key, value] = parts;
          const effectValue = parseInt(value);
          if (key in target) {
            target[key] = Math.max(0, Math.min(10, target[key] + effectValue));
          }
        }
      }
    };

    if (decision === 'allow') {
      if (travelerData.effect_in && typeof travelerData.effect_in === 'string') {
        const parts = travelerData.effect_in.split(' ');
        if (parts.length === 2) {
          const [type, value] = parts;
          const amount = parseInt(value);
          if (type in currentStatus) {
            currentStatus[type] = parseInt(currentStatus[type] || 0) + amount;
          }
        }
      }
      applyEffect(travelerData.effect_in_hidden, currentHiddenRep);
    } else if (decision === 'deny') {
      applyEffect(travelerData.effect_out, currentHiddenRep);
    } else if (decision === 'execute') {
      applyEffect(travelerData.effect_ex, currentHiddenRep);
    }

    await supabase
      .from('structures')
      .update({ status: currentStatus })
      .eq('id', structure.id);

    await supabase
      .from('reputation')
      .update({ hidden_reputation: currentHiddenRep })
      .eq('id', reputation.id);

    await supabase
      .from('travelers')
      .update({
        complete: true,
        decision: decision
      })
      .eq('id', travelerId);

    if (decision !== 'complete_fixed') {
      const decisionText = { allow: 'allowed', deny: 'denied', execute: 'executed' }[decision];
      await supabase.from('events').insert([{
        player: player.id,
        session: session.id,
        event: `${travelerData.name} (${travelerData.faction}) was ${decisionText}.`
      }]);
    }

    const structureTotals = await calculateStructureTotals(player.id, session.id);

    return res.json({
      success: true,
      message: `Traveler ${travelerData.name} processed with decision: ${decision}`,
      population: structureTotals,
      hidden_reputation: currentHiddenRep
    });

  } catch (error) {
    console.error('Decision error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/day/advance', async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) return res.status(400).json({ error: 'chatId is required' });

    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (!player) return res.status(404).json({ error: 'Player not found' });

    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('player', player.id)
      .eq('active', true)
      .single();

    if (!session) return res.status(404).json({ error: 'Active session not found' });

    const { data: currentDayTravelers } = await supabase
      .from('travelers')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .eq('day', session.day);

    const completedCount = currentDayTravelers?.filter(t => t.complete).length || 0;

    if (completedCount < 6) {
      return res.status(400).json({ 
        error: 'Cannot advance day until all 6 travelers are processed',
        completedCount,
        requiredCount: 6
      });
    }

    const nextDay = (session.day || 1) + 1;

    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({ day: nextDay })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) throw updateError;

    await supabase.from('events').insert([{
      player: player.id,
      session: session.id,
      event: `Day ${nextDay} begins. New travelers approach the town.`
    }]);

    const { data: newDayTravelers } = await supabase
      .from('travelers')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .eq('day', nextDay)
      .order('order->position');

    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return res.json({
      success: true,
      message: `Advanced to day ${nextDay}`,
      session: updatedSession,
      travelers: newDayTravelers || [],
      events: eventsData || []
    });

  } catch (error) {
    console.error('Day advance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inventory/update', async (req, res) => {
  try {
    const { chatId, item, amount } = req.body;

    if (!chatId || !item) return res.status(400).json({ error: 'chatId and item are required' });

    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (!player) return res.status(404).json({ error: 'Player not found' });

    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('player', player.id)
      .eq('active', true)
      .single();

    if (!session) return res.status(404).json({ error: 'Active session not found' });

    const { data: inventory } = await supabase
      .from('inventory')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .single();

    if (!inventory) return res.status(404).json({ error: 'Inventory not found' });

    const currentItems = { ...(inventory.items || {}) };
    currentItems[item] = Math.max(0, (currentItems[item] || 0) + (amount || -1));

    await supabase
      .from('inventory')
      .update({ items: currentItems })
      .eq('id', inventory.id);

    return res.json({
      success: true,
      items: currentItems
    });

  } catch (error) {
    console.error('Inventory update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inventory/give', async (req, res) => {
  try {
    const { chatId, items } = req.body;

    if (!chatId || !items) return res.status(400).json({ error: 'chatId and items are required' });

    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (!player) return res.status(404).json({ error: 'Player not found' });

    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('player', player.id)
      .eq('active', true)
      .single();

    if (!session) return res.status(404).json({ error: 'Active session not found' });

    const { data: inventory } = await supabase
      .from('inventory')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .single();

    if (!inventory) return res.status(404).json({ error: 'Inventory not found' });

    const updatedItems = { ...inventory.items };
    Object.entries(items).forEach(([key, amount]) => {
      updatedItems[key] = (updatedItems[key] || 0) + amount;
    });

    await supabase
      .from('inventory')
      .update({ items: updatedItems })
      .eq('id', inventory.id);

    return res.json({ success: true, inventory: updatedItems });

  } catch (error) {
    console.error('Inventory give error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/structures/set-active', async (req, res) => {
  try {
    const { chatId, structureTemplateId } = req.body;

    if (!chatId || !structureTemplateId) return res.status(400).json({ error: 'chatId and structureTemplateId are required' });

    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (!player) return res.status(404).json({ error: 'Player not found' });

    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('player', player.id)
      .eq('active', true)
      .single();

    if (!session) return res.status(404).json({ error: 'Active session not found' });

    const { data: structure } = await supabase
      .from('structures')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .eq('structure', structureTemplateId)
      .single();

    if (!structure) return res.status(404).json({ error: 'Structure not found' });

    await supabase
      .from('structures')
      .update({ is_active: true })
      .eq('id', structure.id);

    return res.json({ success: true });

  } catch (error) {
    console.error('Structure set-active error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/pets/description', async (req, res) => {
  try {
    const { pet } = req.body;

    if (!pet) {
      return res.status(400).json({ error: 'pet is required' });
    }

    const { data, error } = await supabase
      .from('pets')
      .select('description')
      .eq('pet', pet)
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      description: data?.description || 'A faithful companion.'
    });

  } catch (error) {
    console.error('Pet description error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});