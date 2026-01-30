const express = require('express');
//const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.post('/login', async (req, res) => {
  const { chat_id, player_name, player_language = 'EN' } = req.body;
  if (!chat_id) return res.status(400).json({ error: 'Missing chat_id' });

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('players')
    .select('*')
    .eq('chat_id', chat_id)
    .single();

  if (existingUser) {
    return res.json({ success: true, user: existingUser });
  }

  // Register new user
  const { data, error } = await supabase
    .from('players')
    .insert([{ chat_id, player_name, player_language }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, user: data });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
