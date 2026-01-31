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

        console.log('Initializing app with chatId:', chatId);

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
        console.log('Auth check response:', data);
        
        currentPlayer = data.player;
        currentSession = data.session;
        currentReputation = data.reputation;
        currentInventory = data.inventory;
        currentEvents = data.events || [];
        currentTravelers = data.travelers || [];

        console.log('Current travelers:', currentTravelers);

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

function renderEvents() {
    const eventsList = document.getElementById('events-list');
    eventsList.innerHTML = '';

    if (currentEvents.length === 0) {
        const noEvents = document.createElement('div');
        noEvents.className = 'event-item';
        noEvents.textContent = 'No events yet. Your adventure begins now!';
        eventsList.appendChild(noEvents);
        return;
    }

    currentEvents.slice(-10).reverse().forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        eventElement.textContent = event.event;
        eventsList.appendChild(eventElement);
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
    const travelersButton = document.getElementById('travelers-button');
    const eventsButton = document.getElementById('events-button');
    const preparationButton = document.getElementById('preparation-button');
    const settingsButton = document.getElementById('settings-button');
    const eventsContainer = document.getElementById('events-container');

    travelersButton.addEventListener('click', () => {
        eventsContainer.style.display = 'none';
        travelersButton.classList.add('active');
        eventsButton.classList.remove('active');
        preparationButton.classList.remove('active');
        settingsButton.classList.remove('active');
        loadTravelersForCurrentDay();
    });

    eventsButton.addEventListener('click', () => {
        eventsContainer.style.display = 'block';
        travelersButton.classList.remove('active');
        eventsButton.classList.add('active');
        preparationButton.classList.remove('active');
        settingsButton.classList.remove('active');
    });

    preparationButton.addEventListener('click', () => {
        eventsContainer.style.display = 'none';
        travelersButton.classList.remove('active');
        eventsButton.classList.remove('active');
        preparationButton.classList.add('active');
        settingsButton.classList.remove('active');
        alert('Preparation functionality will be added later.');
    });

    settingsButton.addEventListener('click', () => {
        eventsContainer.style.display = 'none';
        travelersButton.classList.remove('active');
        eventsButton.classList.remove('active');
        preparationButton.classList.remove('active');
        settingsButton.classList.add('active');
        alert('Settings functionality will be added later.');
    });
}

function setupTravelersScreen() {
    const backButton = document.getElementById('back-button');
    const continueButton = document.getElementById('continue-button');
    const checkPapersButton = document.getElementById('check-papers');
    const holyWaterButton = document.getElementById('holy-water');
    const medicinalHerbsButton = document.getElementById('medicinal-herbs');
    const allowButton = document.getElementById('allow');
    const denyButton = document.getElementById('deny');
    const executeButton = document.getElementById('execute');

    backButton.addEventListener('click', () => {
        console.log('Back button clicked');
        switchScreen('travelers-screen', 'home-screen');
        checkForPendingTravelers();
    });

    continueButton.addEventListener('click', () => {
        console.log('Continue button clicked, currentTraveler:', currentTraveler);
        if (currentTraveler) {
            showTravelerGreeting();
        }
    });

    checkPapersButton.addEventListener('click', () => {
        console.log('Check papers button clicked');
        handleTravelerAction('check_papers');
    });

    holyWaterButton.addEventListener('click', () => {
        console.log('Holy water button clicked');
        handleTravelerAction('holy_water');
    });

    medicinalHerbsButton.addEventListener('click', () => {
        console.log('Medicinal herbs button clicked');
        handleTravelerAction('medicinal_herbs');
    });

    allowButton.addEventListener('click', () => {
        console.log('Allow button clicked');
        handleTravelerDecision('allow');
    });

    denyButton.addEventListener('click', () => {
        console.log('Deny button clicked');
        handleTravelerDecision('deny');
    });

    executeButton.addEventListener('click', () => {
        console.log('Execute button clicked');
        handleTravelerDecision('execute');
    });
}

function checkForPendingTravelers() {
    const travelersButton = document.getElementById('travelers-button');
    const pendingTravelers = currentTravelers.filter(t => !t.complete);
    console.log('Pending travelers:', pendingTravelers.length);
    
    if (pendingTravelers.length > 0) {
        travelersButton.classList.add('glow');
    } else {
        travelersButton.classList.remove('glow');
    }
}

async function loadTravelersForCurrentDay() {
    try {
        console.log('Loading travelers for day:', currentSession.day);
        
        const response = await fetch('/api/travelers/get-day', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatId: currentPlayer.chat_id,
                day: currentSession.day
            })
        });

        if (!response.ok) {
            throw new Error('Failed to load travelers');
        }

        const data = await response.json();
        console.log('Travelers response:', data);
        
        currentDayTravelers = data.travelers.filter(t => !t.complete);
        console.log('Filtered travelers (not complete):', currentDayTravelers);
        
        if (currentDayTravelers.length > 0) {
            currentTravelerIndex = 0;
            console.log('Loading traveler index:', currentTravelerIndex);
            loadCurrentTraveler();
            switchScreen('home-screen', 'travelers-screen');
        } else {
            alert('No travelers available for today.');
        }
    } catch (error) {
        console.error('Error loading travelers:', error);
        alert('Failed to load travelers.');
    }
}

function loadCurrentTraveler() {
    console.log('loadCurrentTraveler called, index:', currentTravelerIndex, 'total:', currentDayTravelers.length);
    
    if (currentTravelerIndex >= currentDayTravelers.length) {
        console.log('No more travelers, switching to home screen');
        switchScreen('travelers-screen', 'home-screen');
        checkForPendingTravelers();
        return;
    }

    const traveler = currentDayTravelers[currentTravelerIndex];
    currentTraveler = traveler;
    
    console.log('Loading traveler:', traveler);
    console.log('Traveler data:', traveler.traveler);
    
    document.getElementById('traveler-day').textContent = `Day ${currentSession.day}`;
    document.getElementById('traveler-art').src = `assets/art/travelers/${traveler.traveler.art}.png`;
    
    const descriptionContainer = document.getElementById('traveler-description');
    descriptionContainer.textContent = traveler.traveler.description || "A traveler approaches...";
    
    document.getElementById('traveler-dialog').textContent = '';
    
    const continueButton = document.getElementById('continue-button');
    const actionRows = document.querySelectorAll('.action-row');
    
    console.log('Traveler is_fixed:', traveler.traveler.is_fixed);
    
    continueButton.textContent = 'Continue';
    continueButton.style.display = 'block';
    
    actionRows.forEach(row => {
        row.style.display = 'none';
    });
    
    console.log('Traveler loaded successfully');
}

function showTravelerGreeting() {
    console.log('showTravelerGreeting called');
    console.log('currentTraveler:', currentTraveler);
    
    if (!currentTraveler) {
        console.log('No current traveler!');
        return;
    }
    
    const dialogContainer = document.getElementById('traveler-dialog');
    const travelerData = currentTraveler.traveler;
    const continueButton = document.getElementById('continue-button');
    const actionRows = document.querySelectorAll('.action-row');
    
    console.log('Traveler data:', travelerData);
    console.log('Is fixed?', travelerData.is_fixed);
    
    if (travelerData.is_fixed) {
        console.log('Fixed traveler detected');
        let fixedText = travelerData.fixed_trigger || "Fixed traveler - Continue to proceed.";
        
        if (travelerData.dialog && travelerData.dialog.greeting) {
            fixedText = travelerData.dialog.greeting;
        }
        
        dialogContainer.textContent = fixedText;
        continueButton.style.display = 'block';
        continueButton.textContent = 'Complete';
        continueButton.onclick = () => {
            console.log('Fixed traveler complete button clicked');
            handleTravelerDecision('complete_fixed');
        };
        
        actionRows.forEach(row => {
            row.style.display = 'none';
        });
        return;
    }
    
    console.log('Regular traveler detected');
    let greetingText = "Greetings. I seek entry to your town.";
    
    if (travelerData.dialog && travelerData.dialog.greeting) {
        greetingText = travelerData.dialog.greeting;
        console.log('Found greeting:', greetingText);
    }
    
    dialogContainer.textContent = greetingText;
    
    continueButton.style.display = 'none';
    actionRows.forEach(row => {
        row.style.display = 'flex';
    });
    
    console.log('Greeting displayed');
}

async function handleTravelerAction(action) {
    console.log('handleTravelerAction called:', action);
    
    if (!currentTraveler) {
        console.log('No current traveler for action');
        return;
    }
    
    const travelerData = currentTraveler.traveler;
    const dialogContainer = document.getElementById('traveler-dialog');
    
    if (action === 'check_papers') {
        if (currentInventory['lantern fuel'] <= 0) {
            dialogContainer.textContent = "Not enough lantern fuel to check papers.";
            return;
        }
        
        let papersText = "The papers seem to be in order.";
        
        if (travelerData.dialog && travelerData.dialog.papers) {
            papersText = travelerData.dialog.papers;
        }
        
        dialogContainer.textContent = papersText;
        await updateInventory('lantern fuel', -1);
        
    } else if (action === 'holy_water') {
        if (currentInventory['holy water'] <= 0) {
            dialogContainer.textContent = "Not enough holy water.";
            return;
        }
        
        let holyWaterText = travelerData.faction === 'possessed' 
            ? "The traveler shrieks in pain!" 
            : "The traveler reacts normally to the holy water.";
        
        if (travelerData.dialog && travelerData.dialog.holy_water) {
            holyWaterText = travelerData.dialog.holy_water;
        }
        
        dialogContainer.textContent = holyWaterText;
        await updateInventory('holy water', -1);
        
    } else if (action === 'medicinal_herbs') {
        if (currentInventory['medicinal herbs'] <= 0) {
            dialogContainer.textContent = "Not enough medicinal herbs.";
            return;
        }
        
        let medicinalHerbsText = travelerData.faction === 'infected'
            ? "The traveler coughs violently!"
            : "The traveler shows no unusual reaction.";
        
        if (travelerData.dialog && travelerData.dialog.medicinal_herbs) {
            medicinalHerbsText = travelerData.dialog.medicinal_herbs;
        }
        
        dialogContainer.textContent = medicinalHerbsText;
        await updateInventory('medicinal herbs', -1);
    }
    
    renderInventory();
}

async function handleTravelerDecision(decision) {
    console.log('handleTravelerDecision called:', decision);
    console.log('currentTraveler:', currentTraveler);
    
    if (!currentTraveler) {
        console.log('No current traveler for decision');
        return;
    }
    
    try {
        const response = await fetch('/api/travelers/decision', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatId: currentPlayer.chat_id,
                travelerId: currentTraveler.id,
                decision: decision
            })
        });

        if (!response.ok) {
            throw new Error('Failed to process decision');
        }

        const data = await response.json();
        console.log('Decision response:', data);
        
        if (data.success) {
            console.log('Decision successful, moving to next traveler');
            currentTravelerIndex++;
            console.log('New traveler index:', currentTravelerIndex);
            
            if (currentTravelerIndex >= currentDayTravelers.length) {
                console.log('No more travelers, going home');
                switchScreen('travelers-screen', 'home-screen');
                checkForPendingTravelers();
            } else {
                console.log('Loading next traveler');
                loadCurrentTraveler();
            }
        }
    } catch (error) {
        console.error('Error processing decision:', error);
        alert('Failed to process decision.');
    }
}

async function updateInventory(item, amount) {
    console.log('Updating inventory:', item, amount);
    currentInventory[item] = Math.max(0, (currentInventory[item] || 0) + amount);
    
    try {
        await fetch('/api/inventory/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatId: currentPlayer.chat_id,
                item: item,
                amount: amount
            })
        });
    } catch (error) {
        console.error('Error updating inventory:', error);
    }
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
    console.log('Switching screen from', fromScreenId, 'to', toScreenId);
    
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
    console.log('Window loaded, initializing app');
    initializeApp();
});

tg.ready();
console.log('Telegram Web App ready');