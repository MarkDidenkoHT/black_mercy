const tg = window.Telegram.WebApp;
tg.expand();

let currentPlayer = null;
let currentSession = null;
let currentReputation = null;
let currentInventory = null;
let currentEvents = [];
let currentTravelers = [];
let currentTravelerIndex = 0;
let currentDayTravelers = [];
let currentTraveler = null;

const factionDescriptions = {
    town: "Remaining population. Everything is lost if no townsfolk remain.",
    church: "Members of the church. They can provide holy water supplies.",
    apothecary: "Apothecaries. Provides medicinal herbs."
};

const itemDescriptions = {
    'holy water': "A vial of blessed water. Causes possessed to shriek in pain.",
    'lantern fuel': "Fuel for your lantern. Essential for inspecting travel papers.",
    'medicinal herbs': "Medicinal herbs. Burning these causes the infected to cough."
};

async function initializeApp() {
    try {
        const initData = tg.initDataUnsafe;
        const chatId = initData?.user?.id?.toString() || 'test_user';
        const playerName = initData?.user?.first_name || 'Player';
        const playerLanguage = initData?.user?.language_code?.toUpperCase() || 'EN';

        const response = await fetch('/api/auth/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, playerName, playerLanguage })
        });

        if (!response.ok) throw new Error('Failed to authenticate');

        const data = await response.json();
        currentPlayer = data.player;
        currentSession = data.session;
        currentReputation = data.reputation;
        currentInventory = data.inventory;
        currentEvents = data.events || [];
        currentTravelers = data.travelers || [];

        document.getElementById('current-day').textContent = currentSession.day || 1;

        renderReputation();
        renderInventory();
        renderEvents();
        setupModalEvents();
        setupBottomButtons();
        setupTravelersScreen();
        checkForPendingTravelers();

        await new Promise(resolve => setTimeout(resolve, 1500));
        switchScreen('loading-screen', 'home-screen');

    } catch (error) {
        document.querySelector('.loading-text').textContent = 'Error loading game. Please try again.';
    }
}

function renderReputation() {
    const container = document.getElementById('reputation-container');
    container.innerHTML = '';

    [
        { key: 'town', name: 'Town', icon: 'town' },
        { key: 'church', name: 'Church', icon: 'church' },
        { key: 'apothecary', name: 'Apothecary', icon: 'apothecary' }
    ].forEach(faction => {
        const level = currentReputation[faction.key] || 1;
        const item = document.createElement('div');
        item.className = 'reputation-item';
        Object.assign(item.dataset, { type: 'faction', key: faction.key, name: faction.name, icon: faction.icon, level });
        item.innerHTML = `
            <img src="assets/art/icons/${faction.icon}.png" alt="${faction.name}" class="reputation-icon">
            <span class="reputation-level">${level}</span>
        `;
        container.appendChild(item);
    });
}

function renderInventory() {
    const container = document.getElementById('inventory-container');
    container.innerHTML = '';

    [
        { key: 'holy water', name: 'Holy Water', icon: 'holy_water' },
        { key: 'lantern fuel', name: 'Lantern Fuel', icon: 'lantern_fuel' },
        { key: 'medicinal herbs', name: 'Medicinal Herbs', icon: 'medicinal_herbs' }
    ].forEach(item => {
        const count = currentInventory[item.key] || 0;
        const invItem = document.createElement('div');
        invItem.className = 'inventory-item';
        Object.assign(invItem.dataset, { type: 'item', key: item.key, name: item.name, icon: item.icon, count });
        invItem.innerHTML = `
            <img src="assets/art/icons/${item.icon}.png" alt="${item.name}" class="inventory-icon">
            <span class="inventory-count">${count}</span>
        `;
        container.appendChild(invItem);
    });
}

function renderEvents() {
    const list = document.getElementById('events-list');
    list.innerHTML = '';

    if (currentEvents.length === 0) {
        const noEvents = document.createElement('div');
        noEvents.className = 'event-item';
        noEvents.textContent = 'No events yet. Your adventure begins now!';
        list.appendChild(noEvents);
        return;
    }

    currentEvents.slice(-10).reverse().forEach(event => {
        const el = document.createElement('div');
        el.className = 'event-item';
        el.textContent = event.event;
        list.appendChild(el);
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

function setupBottomButtons() {
    const buttons = {
        travelers: document.getElementById('travelers-button'),
        events: document.getElementById('events-button'),
        preparation: document.getElementById('preparation-button'),
        settings: document.getElementById('settings-button')
    };
    const eventsContainer = document.getElementById('events-container');

    buttons.travelers.addEventListener('click', () => {
        eventsContainer.style.display = 'none';
        setActiveButton('travelers', buttons);
        loadTravelersForCurrentDay();
    });

    buttons.events.addEventListener('click', () => {
        eventsContainer.style.display = 'block';
        setActiveButton('events', buttons);
    });

    buttons.preparation.addEventListener('click', () => {
        eventsContainer.style.display = 'none';
        setActiveButton('preparation', buttons);
    });

    buttons.settings.addEventListener('click', () => {
        eventsContainer.style.display = 'none';
        setActiveButton('settings', buttons);
    });
}

function setActiveButton(active, buttons) {
    Object.entries(buttons).forEach(([key, btn]) => {
        btn.classList.toggle('active', key === active);
    });
}

function setupTravelersScreen() {
    document.getElementById('back-button').addEventListener('click', () => {
        switchScreen('travelers-screen', 'home-screen');
        checkForPendingTravelers();
    });

    document.getElementById('continue-button').addEventListener('click', () => {
        if (currentTraveler) showTravelerGreeting();
    });

    document.getElementById('check-papers').addEventListener('click', () => handleTravelerAction('check_papers'));
    document.getElementById('holy-water').addEventListener('click', () => handleTravelerAction('holy_water'));
    document.getElementById('medicinal-herbs').addEventListener('click', () => handleTravelerAction('medicinal_herbs'));
    document.getElementById('allow').addEventListener('click', () => handleTravelerDecision('allow'));
    document.getElementById('deny').addEventListener('click', () => handleTravelerDecision('deny'));
    document.getElementById('execute').addEventListener('click', () => handleTravelerDecision('execute'));
}

function checkForPendingTravelers() {
    const button = document.getElementById('travelers-button');
    const pending = currentTravelers.filter(t => !t.complete);
    button.classList.toggle('glow', pending.length > 0);
}

async function loadTravelersForCurrentDay() {
    try {
        const response = await fetch('/api/travelers/get-day', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: currentPlayer.chat_id,
                day: currentSession.day
            })
        });

        if (!response.ok) throw new Error('Failed to load travelers');

        const data = await response.json();
        currentDayTravelers = data.travelers.filter(t => !t.complete);
        
        if (currentDayTravelers.length > 0) {
            currentTravelerIndex = 0;
            loadCurrentTraveler();
            switchScreen('home-screen', 'travelers-screen');
        } else {
            alert('No travelers available for today.');
        }
    } catch (error) {
        alert('Failed to load travelers.');
    }
}

function loadCurrentTraveler() {
    if (currentTravelerIndex >= currentDayTravelers.length) {
        switchScreen('travelers-screen', 'home-screen');
        checkForPendingTravelers();
        return;
    }

    currentTraveler = currentDayTravelers[currentTravelerIndex];
    const travelerData = currentTraveler.traveler;
    
    document.getElementById('traveler-day').textContent = `Day ${currentSession.day}`;
    document.getElementById('traveler-art').src = `assets/art/travelers/${travelerData.art}.png`;
    document.getElementById('traveler-dialog').textContent = travelerData.description || "A traveler approaches...";
    
    const continueButton = document.getElementById('continue-button');
    continueButton.textContent = 'Continue';
    continueButton.style.display = 'block';
    continueButton.onclick = showTravelerGreeting;
    
    document.querySelectorAll('.action-row').forEach(row => row.style.display = 'none');
}

function showTravelerGreeting() {
    if (!currentTraveler) return;
    
    const travelerData = currentTraveler.traveler;
    const continueButton = document.getElementById('continue-button');
    
    document.getElementById('traveler-dialog').textContent = travelerData.dialog?.greeting || "Greetings. I seek entry to your town.";
    
    if (travelerData.is_fixed) {
        continueButton.style.display = 'block';
        continueButton.textContent = 'Complete';
        continueButton.onclick = () => completeCurrentTraveler('complete_fixed');
        document.querySelectorAll('.action-row').forEach(row => row.style.display = 'none');
    } else {
        continueButton.style.display = 'none';
        document.querySelectorAll('.action-row').forEach(row => row.style.display = 'flex');
    }
}

async function handleTravelerAction(action) {
    if (!currentTraveler) return;
    
    const travelerData = currentTraveler.traveler;
    const dialogContainer = document.getElementById('traveler-dialog');
    const itemMap = {
        check_papers: 'lantern fuel',
        holy_water: 'holy water',
        medicinal_herbs: 'medicinal herbs'
    };
    
    const item = itemMap[action];
    
    if (currentInventory[item] <= 0) {
        dialogContainer.textContent = `Not enough ${item}.`;
        return;
    }
    
    const responses = {
        check_papers: travelerData.dialog?.papers || "The papers seem to be in order.",
        holy_water: travelerData.dialog?.holy_water || (travelerData.faction === 'possessed' ? "The traveler shrieks in pain!" : "The traveler reacts normally to the holy water."),
        medicinal_herbs: travelerData.dialog?.medicinal_herbs || (travelerData.faction === 'infected' ? "The traveler coughs violently!" : "The traveler shows no unusual reaction.")
    };
    
    dialogContainer.textContent = responses[action];
    await updateInventory(item, -1);
    renderInventory();
}

async function completeCurrentTraveler(decision) {
    if (!currentTraveler) return;
    
    const travelerData = currentTraveler.traveler;
    const dialogContainer = document.getElementById('traveler-dialog');
    
    const responseDialogs = {
        allow: travelerData.dialog?.in || "Thank you for allowing me passage.",
        deny: travelerData.dialog?.out || "I understand. I will leave peacefully.",
        execute: travelerData.dialog?.execution || "Please, have mercy!",
        complete_fixed: null
    };
    
    const responseDialog = responseDialogs[decision];
    
    if (responseDialog) {
        dialogContainer.textContent = responseDialog;
        document.querySelectorAll('.action-row').forEach(row => row.style.display = 'none');
        document.getElementById('continue-button').style.display = 'none';
    }
    
    try {
        const response = await fetch('/api/travelers/decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: currentPlayer.chat_id,
                travelerId: currentTraveler.id,
                decision: decision
            })
        });

        if (!response.ok) throw new Error('Failed to process decision');

        const data = await response.json();
        
        if (data.success) {
            const eventsResponse = await fetch('/api/auth/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: currentPlayer.chat_id,
                    playerName: currentPlayer.player_name,
                    playerLanguage: currentPlayer.player_language
                })
            });
            
            if (eventsResponse.ok) {
                const updatedData = await eventsResponse.json();
                currentEvents = updatedData.events || [];
                renderEvents();
            }
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            currentTravelerIndex++;
            
            if (currentTravelerIndex >= currentDayTravelers.length) {
                switchScreen('travelers-screen', 'home-screen');
                checkForPendingTravelers();
            } else {
                loadCurrentTraveler();
            }
        }
    } catch (error) {
        alert('Failed to complete traveler.');
    }
}

async function handleTravelerDecision(decision) {
    await completeCurrentTraveler(decision);
}

async function updateInventory(item, amount) {
    currentInventory[item] = Math.max(0, (currentInventory[item] || 0) + amount);
    
    try {
        await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: currentPlayer.chat_id,
                item: item,
                amount: amount
            })
        });
    } catch (error) {
    }
}

function handleIconClick(e) {
    const item = e.currentTarget;
    const { type, key, name, icon, level, count } = item.dataset;
    const value = level || count;

    const overlay = document.getElementById('modal-overlay');
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-description');

    modalIcon.src = `assets/art/icons/${icon}.png`;
    modalIcon.alt = name;
    
    if (type === 'faction') {
        modalTitle.textContent = `${name} Reputation: Level ${value}`;
        modalDesc.textContent = factionDescriptions[key] || "No description available.";
    } else {
        modalTitle.textContent = `${name}: ${value}`;
        modalDesc.textContent = itemDescriptions[key] || "No description available.";
    }

    overlay.classList.add('active');
}

function switchScreen(fromScreenId, toScreenId) {
    const fromScreen = document.getElementById(fromScreenId);
    const toScreen = document.getElementById(toScreenId);

    if (fromScreen) fromScreen.classList.remove('active');
    if (toScreen) toScreen.classList.add('active');
}

window.addEventListener('load', initializeApp);
tg.ready();