const tg = window.Telegram.WebApp;
tg.expand();

let currentPlayer = null;
let currentSession = null;
let currentReputation = null;
let currentInventory = null;

const factionDescriptions = {
    town: "Your standing with the townsfolk. Higher reputation unlocks better trade deals and local support.",
    church: "Your relationship with the church. Higher reputation grants access to holy blessings and divine protection.",
    apothecary: "Your connection with the apothecary. Higher reputation provides better healing items and rare concoctions."
};

const itemDescriptions = {
    'holy water': "A vial of blessed water. Can be used to cleanse corruption and ward off evil spirits.",
    'lantern fuel': "Fuel for your lantern. Essential for exploring dark areas and surviving the night.",
    'medicinal herbs': "Healing herbs. Can be used to treat wounds and recover health during your adventures."
};

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
        setupModalEvents();

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
        repItem.dataset.type = 'faction';
        repItem.dataset.key = faction.key;
        repItem.dataset.name = faction.name;
        repItem.dataset.icon = faction.icon;
        repItem.dataset.level = level;
        
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
        invItem.dataset.type = 'item';
        invItem.dataset.key = item.key;
        invItem.dataset.name = item.name;
        invItem.dataset.icon = item.icon;
        invItem.dataset.count = count;
        
        invItem.innerHTML = `
            <img src="assets/art/icons/${item.icon}.png" alt="${item.name}" class="inventory-icon">
            <span class="inventory-count">${count}</span>
        `;
        
        inventoryContainer.appendChild(invItem);
    });
}

function setupModalEvents() {
    document.querySelectorAll('.reputation-item, .inventory-item').forEach(item => {
        item.addEventListener('click', handleIconClick);
    });

    document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('modal-overlay').classList.remove('active');
    });

    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-overlay')) {
            document.getElementById('modal-overlay').classList.remove('active');
        }
    });
}

function handleIconClick(e) {
    const item = e.currentTarget;
    const type = item.dataset.type;
    const key = item.dataset.key;
    const name = item.dataset.name;
    const icon = item.dataset.icon;
    const value = item.dataset.level || item.dataset.count;

    const modalOverlay = document.getElementById('modal-overlay');
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');

    modalIcon.src = `assets/art/icons/${icon}.png`;
    modalIcon.alt = name;
    
    if (type === 'faction') {
        modalTitle.textContent = `${name} Reputation: Level ${value}`;
        modalDescription.textContent = factionDescriptions[key] || "No description available.";
    } else {
        modalTitle.textContent = `${name}: ${value}`;
        modalDescription.textContent = itemDescriptions[key] || "No description available.";
    }

    modalOverlay.classList.add('active');
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