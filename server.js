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

app.post('/api/auth/check', async (req, res) => {
  try {
    const { chatId, playerName, playerLanguage } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }

    const { data: existingPlayer, error: selectError } = await supabase
      .from('players')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (existingPlayer) {
      const { data: activeSession, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('player', existingPlayer.id)
        .eq('active', true)
        .single();

      const { data: reputationData, error: repError } = await supabase
        .from('reputation')
        .select('*')
        .eq('player', existingPlayer.id)
        .eq('session', activeSession.id)
        .single();

      const { data: inventoryData, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('player', existingPlayer.id)
        .eq('session', activeSession.id)
        .single();

      return res.json({ 
        exists: true, 
        player: existingPlayer,
        session: activeSession,
        reputation: reputationData?.reputation || { town: 1, church: 1, apothecary: 1 },
        inventory: inventoryData?.items || { 'holy water': 2, 'lantern fuel': 2, 'medicinal herbs': 2 }
      });
    }

    const { data: newPlayer, error: playerError } = await supabase
      .from('players')
      .insert([
        {
          chat_id: chatId,
          player_name: playerName || 'Player',
          player_language: playerLanguage || 'EN'
        }
      ])
      .select()
      .single();

    if (playerError) {
      throw playerError;
    }

    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert([
        {
          player: newPlayer.id,
          status: {
            town: 1,
            church: 1,
            apothecary: 1
          },
          active: true,
          day: 1
        }
      ])
      .select()
      .single();

    if (sessionError) {
      throw sessionError;
    }

    const { error: reputationError } = await supabase
      .from('reputation')
      .insert([
        {
          player: newPlayer.id,
          session: newSession.id,
          reputation: {
            town: 1,
            church: 1,
            apothecary: 1
          }
        }
      ]);

    if (reputationError) {
      throw reputationError;
    }

    const { error: inventoryError } = await supabase
      .from('inventory')
      .insert([
        {
          player: newPlayer.id,
          session: newSession.id,
          items: {
            'holy water': 2,
            'lantern fuel': 2,
            'medicinal herbs': 2
          }
        }
      ]);

    if (inventoryError) {
      throw inventoryError;
    }

    return res.json({ 
      exists: false, 
      player: newPlayer,
      session: newSession,
      reputation: { town: 1, church: 1, apothecary: 1 },
      inventory: { 'holy water': 2, 'lantern fuel': 2, 'medicinal herbs': 2 }
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});