document.addEventListener('DOMContentLoaded', async () => {
  if (window.Telegram && window.Telegram.WebApp) {
    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    if (!user) {
      alert('Unable to get user data from Telegram.');
      return;
    }

    const { id: chat_id, first_name: player_name } = user;

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat_id.toString(), player_name })
      });

      const result = await response.json();
      if (result.success) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('home-screen').style.display = 'block';
      } else {
        alert('Login failed: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  } else {
    alert('This app must be opened from Telegram.');
  }
});
