const tg = window.Telegram.WebApp;
tg.expand();

let currentPlayer = null;
let currentSession = null;
let currentReputation = null;
let currentInventory = null;

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
        currentSession = data.session;
        currentReputation = data.reputation;
        currentInventory = data.inventory;

        document.getElementById('player-name').textContent = currentPlayer.player_name;

        renderReputation();
        renderInventory();

        await new Promise(resolve => setTimeout(resolve, 1500));

        switchScreen('loading-screen', 'home-screen');

    } catch (error) {
        console.error('Initialization error:', error);
        document.querySelector('.loading-text').textContent = 'Error loading game. Please try again.';
    }
}

function renderReputation() {
    const reputationContainer = document.getElementById('reputation-container');
    reputationContainer.innerHTML = '';

    const factions = [
        { key: 'town', name: 'Town', icon: 'town' },
        { key: 'church', name: 'Church', icon: 'church' },
        { key: 'apothecary', name: 'Apothecary', icon: 'apothecary' }
    ];

    factions.forEach(faction => {
        const level = currentReputation[faction.key] || 1;
        
        const repItem = document.createElement('div');
        repItem.className = 'reputation-item';
        
        repItem.innerHTML = `
            <img src="assets/art/icons/${faction.icon}.png" alt="${faction.name}" class="reputation-icon">
            <span class="reputation-level">${level}</span>
        `;
        
        reputationContainer.appendChild(repItem);
    });
}

function renderInventory() {
    const inventoryContainer = document.getElementById('inventory-container');
    inventoryContainer.innerHTML = '';

    const items = [
        { key: 'holy water', name: 'Holy Water', icon: 'holy_water' },
        { key: 'lantern fuel', name: 'Lantern Fuel', icon: 'lantern_fuel' },
        { key: 'medicinal herbs', name: 'Medicinal Herbs', icon: 'medicinal_herbs' }
    ];

    items.forEach(item => {
        const count = currentInventory[item.key] || 0;
        
        const invItem = document.createElement('div');
        invItem.className = 'inventory-item';
        
        invItem.innerHTML = `
            <img src="assets/art/icons/${item.icon}.png" alt="${item.name}" class="inventory-icon">
            <span class="inventory-count">${count}</span>
        `;
        
        inventoryContainer.appendChild(invItem);
    });
}

function renderInventory() {
    const inventoryContainer = document.getElementById('inventory-container');
    inventoryContainer.innerHTML = '';

    const items = [
        { key: 'holy water', name: 'Holy Water', icon: 'holy_water' },
        { key: 'lantern fuel', name: 'Lantern Fuel', icon: 'lantern_fuel' },
        { key: 'medicinal herbs', name: 'Medicinal Herbs', icon: 'medicinal_herbs' }
    ];

    items.forEach(item => {
        const count = currentInventory[item.key] || 0;
        
        const invItem = document.createElement('div');
        invItem.className = 'inventory-item';
        
        invItem.innerHTML = `
            <img src="assets/art/icons/${item.icon}.png" alt="${item.name}" class="inventory-icon">
            <span class="inventory-count">${count}</span>
        `;
        
        inventoryContainer.appendChild(invItem);
    });
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