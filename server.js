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
      return res.json({ 
        exists: true, 
        player: existingPlayer 
      });
    }

    const { data: newPlayer, error: insertError } = await supabase
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

    if (insertError) {
      throw insertError;
    }

    return res.json({ 
      exists: false, 
      player: newPlayer 
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});