const tg = window.Telegram.WebApp;
tg.expand();

let currentPlayer = null;

async function initializeApp() {
    try {
        const initData = tg.initDataUnsafe;
        const chatId = initData?.user?.id?.toString() || 'test_user';
        const playerName = initData?.user?.first_name || 'Player';
        const playerLanguage = initData?.user?.language_code?.toUpperCase() || 'EN';

        const response = await fetch('/api/auth/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatId,
                playerName,
                playerLanguage
            })
        });

        if (!response.ok) {
            throw new Error('Failed to authenticate');
        }

        const data = await response.json();
        currentPlayer = data.player;

        document.getElementById('player-name').textContent = currentPlayer.player_name;

        await new Promise(resolve => setTimeout(resolve, 1500));

        switchScreen('loading-screen', 'home-screen');

    } catch (error) {
        console.error('Initialization error:', error);
        document.querySelector('.loading-text').textContent = 'Error loading game. Please try again.';
    }
}

function switchScreen(fromScreenId, toScreenId) {
    const fromScreen = document.getElementById(fromScreenId);
    const toScreen = document.getElementById(toScreenId);

    if (fromScreen) {
        fromScreen.classList.remove('active');
    }

    if (toScreen) {
        toScreen.classList.add('active');
    }
}

window.addEventListener('load', () => {
    initializeApp();
});

tg.ready();