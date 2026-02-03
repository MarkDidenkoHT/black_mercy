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

      const displayReputation = activeSession.status || reputationData?.reputation || { town: 5, church: 3, apothecary: 3 };

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
        reputation: displayReputation,
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
        status: { town: 1, church: 1, apothecary: 1 },
        status_hidden: { cult: 0, inquisition: 0, undead: 0 },
        active: true,
        day: 1,
        rep_change: { town: 0, church: 0, apothecary: 0 },
        rep_change_hidden: { cult: 0, inquisition: 0, undead: 0 }
      }])
      .select()
      .single();

    if (sessionError) throw sessionError;

    await callGenerateTravelers(newPlayer.id, newSession.id);

    await supabase.from('reputation').insert([{
      player: newPlayer.id,
      session: newSession.id,
      reputation: { town: 1, church: 1, apothecary: 1 },
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

    return res.json({ 
      exists: false, 
      player: newPlayer,
      session: newSession,
      reputation: { town: 1, church: 1, apothecary: 1 },
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

app.post('/api/game/advance-day', async (req, res) => {
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

    const { data: reputation } = await supabase
      .from('reputation')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .single();

    const currentReputation = reputation?.reputation || { town: 1, church: 1, apothecary: 1 };
    const currentHiddenReputation = reputation?.hidden_reputation || { cult: 0, inquisition: 0, undead: 0 };
    const repChange = session.rep_change || { town: 0, church: 0, apothecary: 0 };
    const repChangeHidden = session.rep_change_hidden || { cult: 0, inquisition: 0, undead: 0 };

    const newReputation = {
      town: Math.max(0, Math.min(10, currentReputation.town + repChange.town)),
      church: Math.max(0, Math.min(10, currentReputation.church + repChange.church)),
      apothecary: Math.max(0, Math.min(10, currentReputation.apothecary + repChange.apothecary))
    };

    const newHiddenReputation = {
      cult: Math.max(0, Math.min(10, currentHiddenReputation.cult + repChangeHidden.cult)),
      inquisition: Math.max(0, Math.min(10, currentHiddenReputation.inquisition + repChangeHidden.inquisition)),
      undead: Math.max(0, Math.min(10, currentHiddenReputation.undead + repChangeHidden.undead))
    };

    await supabase
      .from('reputation')
      .update({ 
        reputation: newReputation,
        hidden_reputation: newHiddenReputation
      })
      .eq('id', reputation.id);

    const nextDay = session.day + 1;
    
    const { data: updatedSession } = await supabase
      .from('sessions')
      .update({ 
        day: nextDay,
        status: newReputation,
        status_hidden: newHiddenReputation,
        rep_change: { town: 0, church: 0, apothecary: 0 },
        rep_change_hidden: { cult: 0, inquisition: 0, undead: 0 }
      })
      .eq('id', session.id)
      .select()
      .single();

    const { data: nextDayTravelers } = await supabase
      .from('travelers')
      .select('*')
      .eq('player', player.id)
      .eq('session', session.id)
      .eq('day', nextDay)
      .order('order->position');

    return res.json({
      success: true,
      new_day: nextDay,
      travelers: nextDayTravelers || [],
      session: updatedSession,
      reputation: newReputation
    });

  } catch (error) {
    console.error('Advance day error:', error);
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
    let currentRepChange = { ...(session.rep_change || { town: 0, church: 0, apothecary: 0 }) };
    let currentHiddenRepChange = { ...(session.rep_change_hidden || { cult: 0, inquisition: 0, undead: 0 }) };

    const effectMap = {
      allow: [travelerData.effect_in, travelerData.effect_in_hidden],
      deny: [travelerData.effect_out, null],
      execute: [travelerData.effect_ex, null],
      complete_fixed: [null, null]
    };

    const [effectToApply, hiddenEffectToApply] = effectMap[decision] || [null, null];

    const applyEffect = (effect, repObj) => {
      if (effect && typeof effect === 'string') {
        const parts = effect.split(' ');
        if (parts.length === 2) {
          const [factionKey, value] = parts;
          const effectValue = parseInt(value);
          if (factionKey in repObj) {
            repObj[factionKey] = repObj[factionKey] + effectValue;
          }
        }
      }
    };

    applyEffect(effectToApply, currentRepChange);
    applyEffect(hiddenEffectToApply, currentHiddenRepChange);

    await supabase
      .from('sessions')
      .update({
        rep_change: currentRepChange,
        rep_change_hidden: currentHiddenRepChange
      })
      .eq('id', session.id);

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

    return res.json({
      success: true,
      message: `Traveler ${travelerData.name} processed with decision: ${decision}`,
      rep_change: currentRepChange,
      rep_change_hidden: currentHiddenRepChange
    });

  } catch (error) {
    console.error('Decision error:', error);
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