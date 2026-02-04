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

// Helper function to calculate total NPC counts from structures
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

      const { data: reputationData } = await supabase
        .from('reputation')
        .select('*')
        .eq('player', existingPlayer.id)
        .eq('session', activeSession.id)
        .single();

      // Calculate structure totals for display
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

      // Get all travelers for current day
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
        inventory: inventoryData?.items || { 'holy water': 2, 'lantern fuel': 2, 'medicinal herbs': 2 },
        events: eventsData || [],
        travelers: currentTravelers || []
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

    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert([{
        player: newPlayer.id,
        active: true,
        day: 1
      }])
      .select()
      .single();

    if (sessionError) throw sessionError;

    await callGenerateTravelers(newPlayer.id, newSession.id);

    await supabase.from('reputation').insert([{
      player: newPlayer.id,
      session: newSession.id,
      hidden_reputation: { cult: 0, inquisition: 0, undead: 0 }
    }]);

    await supabase.from('inventory').insert([{
      player: newPlayer.id,
      session: newSession.id,
      items: { 'holy water': 2, 'lantern fuel': 2, 'medicinal herbs': 2 }
    }]);

    await supabase.from('events').insert([{
      player: newPlayer.id,
      session: newSession.id,
      event: 'Your adventure begins.'
    }]);

    const { data: day1Travelers } = await supabase
      .from('travelers')
      .select('*')
      .eq('player', newPlayer.id)
      .eq('session', newSession.id)
      .eq('day', 1)
      .order('order->position');

    // Get structure totals created by generate-travelers
    const structureTotals = await calculateStructureTotals(newPlayer.id, newSession.id);

    return res.json({ 
      exists: false, 
      player: newPlayer,
      session: newSession,
      population: structureTotals,
      hidden_reputation: { cult: 0, inquisition: 0, undead: 0 },
      inventory: { 'holy water': 2, 'lantern fuel': 2, 'medicinal herbs': 2 },
      events: [{ event: 'Your adventure begins.' }],
      travelers: day1Travelers || []
    });

  } catch (error) {
    console.error('Auth check error:', error);
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
      travelers: travelers || []
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
    
    // Get the structure this traveler affects
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

    // Apply effects based on decision
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
      // Apply effect_in to structure
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
      // Apply effect_in_hidden to hidden reputation
      applyEffect(travelerData.effect_in_hidden, currentHiddenRep);
    } else if (decision === 'deny') {
      // Apply effect_out to hidden reputation
      applyEffect(travelerData.effect_out, currentHiddenRep);
    } else if (decision === 'execute') {
      // Apply effect_ex to hidden reputation
      applyEffect(travelerData.effect_ex, currentHiddenRep);
    }

    // Update structure
    await supabase
      .from('structures')
      .update({ status: currentStatus })
      .eq('id', structure.id);

    // Update hidden reputation
    await supabase
      .from('reputation')
      .update({ hidden_reputation: currentHiddenRep })
      .eq('id', reputation.id);

    // Mark traveler as complete
    await supabase
      .from('travelers')
      .update({
        complete: true,
        decision: decision
      })
      .eq('id', travelerId);

    // Add event
    if (decision !== 'complete_fixed') {
      const decisionText = { allow: 'allowed', deny: 'denied', execute: 'executed' }[decision];
      await supabase.from('events').insert([{
        player: player.id,
        session: session.id,
        event: `${travelerData.name} (${travelerData.faction}) was ${decisionText}.`
      }]);
    }

    // Calculate updated structure totals
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

    // Check if all 6 travelers for current day are complete
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

    // Advance to next day
    const nextDay = (session.day || 1) + 1;

    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({ day: nextDay })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Add event for new day
    await supabase.from('events').insert([{
      player: player.id,
      session: session.id,
      event: `Day ${nextDay} begins. New travelers approach the town.`
    }]);

    // Get new day travelers
    const { data: newDayTravelers } = await supabase
      .from('travelers')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .eq('day', nextDay)
      .order('order->position');

    // Get updated events
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

    const currentItems = { ...(inventory.items || { 'holy water': 2, 'lantern fuel': 2, 'medicinal herbs': 2 }) };
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});