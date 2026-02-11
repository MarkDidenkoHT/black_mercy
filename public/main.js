const tg = window.Telegram.WebApp;
tg.expand();

let currentPlayer = null;
let currentSession = null;
let currentPopulation = null;
let currentHiddenReputation = null;
let currentInventory = null;
let currentEvents = [];
let currentTravelers = [];
let currentTravelerIndex = 0;
let currentDayTravelers = [];
let currentTraveler = null;
let availableInteractions = ['check-papers']; // Default interactions

const populationDescriptions = {
    total: "Total population in your town. Everything is lost if no one remains."
};

const itemDescriptions = {
    'holy water': "A vial of blessed water. Causes possessed to shriek in pain.",
    'lantern fuel': "Fuel for your lantern. Essential for inspecting travel papers.",
    'medicinal herbs': "Medicinal herbs. Burning these causes the infected to cough."
};

const dayPhases = ['Dawn', 'Morning', 'Noon', 'Afternoon', 'Dusk', 'Night'];

// Map interaction names to button IDs
const interactionButtonMap = {
    'check-papers': 'check-papers',
    'holy-water': 'holy-water',
    'medicinal-herbs': 'medicinal-herbs',
    'allow': 'allow',
    'deny': 'deny',
    'execute': 'execute'
};

async function initializeApp() {
    try {
        const initData = tg.initDataUnsafe;
        const chatId = initData?.user?.id?.toString() || 'test_user';
        const playerName = initData?.user?.first_name || 'Player';
        const playerLanguage = initData?.user?.language_code?.toUpperCase() || 'EN';
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        const response = await fetch('/api/auth/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chatId, 
                playerName, 
                playerLanguage,
                timezone
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Auth failed:', response.status, errorText);
            throw new Error('Failed to authenticate');
        }

        const data = await response.json();
        currentPlayer = data.player;
        currentSession = data.session;
        currentPopulation = data.population;
        currentHiddenReputation = data.hidden_reputation;
        currentInventory = data.inventory;
        currentEvents = data.events || [];
        currentTravelers = data.travelers || [];
        availableInteractions = data.available_interactions || ['check-papers'];

        updateDayDisplay();
        renderPopulation();
        renderInventory();
        renderEvents();
        setupModalEvents();
        setupBottomButtons();
        setupTravelersScreen();
        checkForPendingTravelers();

        await new Promise(resolve => setTimeout(resolve, 1500));
        switchScreen('loading-screen', 'home-screen');

    } catch (error) {
        console.error('Init failed:', error.message, error.stack);
        document.querySelector('.loading-text').textContent = 'Error loading game. Please try again.';
    }
}

function updateDayDisplay() {
    const dayElement = document.getElementById('current-day');
    if (!dayElement) {
        console.error('Day element not found');
        return;
    }
    const phase = getCurrentPhase();
    dayElement.textContent = `Day ${currentSession.day || 1} - ${phase}`;
}

function getCurrentPhase() {
    const completedCount = currentTravelers.filter(t => t.complete).length;
    const phaseIndex = Math.min(completedCount, 5);
    return dayPhases[phaseIndex];
}

function renderPopulation() {
    const container = document.getElementById('reputation-container');
    if (!container) {
        console.error('Reputation container not found');
        return;
    }
    container.innerHTML = '';

    const totalPop = (currentPopulation.human || 0) + (currentPopulation.infected || 0) + (currentPopulation.possessed || 0);
    
    const item = document.createElement('div');
    item.className = 'reputation-item';
    Object.assign(item.dataset, { type: 'population', key: 'total', name: 'Population', icon: 'town', count: totalPop });
    item.innerHTML = `
        <img src="assets/art/icons/town.png" alt="Population" class="reputation-icon">
        <span class="reputation-level">${totalPop}</span>
    `;
    container.appendChild(item);
}

function renderInventory() {
    const container = document.getElementById('inventory-container');
    if (!container) {
        console.error('Inventory container not found');
        return;
    }
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
    if (!list) {
        console.error('Events list not found');
        return;
    }
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
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('modal-overlay');

    if (!modalClose || !modalOverlay) {
        console.error('Missing modal elements:', {
            modalClose: !!modalClose,
            modalOverlay: !!modalOverlay
        });
        return;
    }

    document.querySelectorAll('.reputation-item, .inventory-item').forEach(item => {
        item.addEventListener('click', handleIconClick);
    });

    modalClose.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });
}

function setupBottomButtons() {
    const buttons = {
        travelers: document.getElementById('travelers-button'),
        endDay: document.getElementById('end-day-button'),
        events: document.getElementById('events-button'),
        preparation: document.getElementById('preparation-button'),
        settings: document.getElementById('settings-button')
    };
    const eventsContainer = document.getElementById('events-container');

    if (!buttons.travelers || !buttons.endDay || !buttons.events || !buttons.preparation || !buttons.settings || !eventsContainer) {
        console.error('Missing button elements:', {
            travelers: !!buttons.travelers,
            endDay: !!buttons.endDay,
            events: !!buttons.events,
            preparation: !!buttons.preparation,
            settings: !!buttons.settings,
            eventsContainer: !!eventsContainer
        });
        return;
    }

    buttons.travelers.addEventListener('click', () => {
        eventsContainer.style.display = 'none';
        setActiveButton('travelers', buttons);
        loadTravelersForCurrentDay();
    });

    buttons.endDay.addEventListener('click', async () => {
        eventsContainer.style.display = 'none';
        await handleEndDay();
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
        if (btn) btn.classList.toggle('active', key === active);
    });
}

function setupTravelersScreen() {
    const backButton = document.getElementById('back-button');
    const continueButton = document.getElementById('continue-button');
    const checkPapers = document.getElementById('check-papers');
    const holyWater = document.getElementById('holy-water');
    const medicinalHerbs = document.getElementById('medicinal-herbs');
    const allow = document.getElementById('allow');
    const deny = document.getElementById('deny');
    const execute = document.getElementById('execute');

    if (!backButton || !continueButton || !checkPapers || !holyWater || !medicinalHerbs || !allow || !deny || !execute) {
        console.error('Missing traveler screen elements:', {
            backButton: !!backButton,
            continueButton: !!continueButton,
            checkPapers: !!checkPapers,
            holyWater: !!holyWater,
            medicinalHerbs: !!medicinalHerbs,
            allow: !!allow,
            deny: !!deny,
            execute: !!execute
        });
        return;
    }

    backButton.addEventListener('click', () => {
        switchScreen('travelers-screen', 'home-screen');
        refreshGameData();
    });

    continueButton.addEventListener('click', () => {
        if (currentTraveler) showTravelerGreeting();
    });

    checkPapers.addEventListener('click', () => handleTravelerAction('check_papers'));
    holyWater.addEventListener('click', () => handleTravelerAction('holy_water'));
    medicinalHerbs.addEventListener('click', () => handleTravelerAction('medicinal_herbs'));
    allow.addEventListener('click', () => handleTravelerDecision('allow'));
    deny.addEventListener('click', () => handleTravelerDecision('deny'));
    execute.addEventListener('click', () => handleTravelerDecision('execute'));
}

function updateAvailableInteractions() {
    // Update action buttons based on available interactions
    const actionButtons = {
        'check-papers': document.getElementById('check-papers'),
        'holy-water': document.getElementById('holy-water'),
        'medicinal-herbs': document.getElementById('medicinal-herbs'),
        'allow': document.getElementById('allow'),
        'deny': document.getElementById('deny'),
        'execute': document.getElementById('execute')
    };

    // Hide unavailable buttons, show available ones
    Object.entries(actionButtons).forEach(([key, button]) => {
        if (button) {
            const isAvailable = availableInteractions.includes(key);
            button.style.display = isAvailable ? '' : 'none';
        }
    });

    console.log('Available interactions updated:', availableInteractions);
}

function checkForPendingTravelers() {
    const travelersButton = document.getElementById('travelers-button');
    const endDayButton = document.getElementById('end-day-button');
    
    if (!travelersButton || !endDayButton) {
        console.error('Missing pending travelers buttons');
        return;
    }

    const pendingTravelers = currentTravelers.filter(t => !t.complete);
    const completedTravelers = currentTravelers.filter(t => t.complete);
    
    if (pendingTravelers.length > 0) {
        travelersButton.style.display = 'flex';
        travelersButton.classList.add('glow');
        endDayButton.style.display = 'none';
    } 
    else if (completedTravelers.length === 6) {
        travelersButton.style.display = 'none';
        endDayButton.style.display = 'flex';
        endDayButton.classList.add('glow');
    }
    else {
        travelersButton.style.display = 'flex';
        travelersButton.classList.remove('glow');
        endDayButton.style.display = 'none';
    }
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

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Load travelers failed:', response.status, errorText);
            throw new Error('Failed to load travelers');
        }

        const data = await response.json();
        
        currentDayTravelers = data.travelers.filter(t => !t.complete);
        
        // Update available interactions from server response
        if (data.available_interactions) {
            availableInteractions = data.available_interactions;
        }
        
        if (currentDayTravelers.length > 0) {
            currentTravelerIndex = 0;
            loadCurrentTraveler();
            switchScreen('home-screen', 'travelers-screen');
        } else {
            alert('No travelers available for today. All travelers have been processed.');
        }
    } catch (error) {
        console.error('Load travelers error:', error.message, error.stack);
        alert('Failed to load travelers.');
    }
}

function loadCurrentTraveler() {
    if (currentTravelerIndex >= currentDayTravelers.length) {
        switchScreen('travelers-screen', 'home-screen');
        refreshGameData();
        return;
    }

    currentTraveler = currentDayTravelers[currentTravelerIndex];
    const travelerData = currentTraveler.traveler;
    
    const phase = getCurrentPhase();
    const travelerDay = document.getElementById('traveler-day');
    const travelerArt = document.getElementById('traveler-art');
    const travelerDialog = document.getElementById('traveler-dialog');
    const continueButton = document.getElementById('continue-button');

    if (!travelerDay || !travelerArt || !travelerDialog || !continueButton) {
        console.error('Missing traveler display elements');
        return;
    }

    travelerDay.textContent = `Day ${currentSession.day} - ${phase}`;
    travelerArt.src = `assets/art/travelers/${travelerData.art}.png`;
    travelerDialog.textContent = travelerData.description || "A traveler approaches...";
    
    continueButton.textContent = 'Continue';
    continueButton.style.display = 'block';
    continueButton.onclick = showTravelerGreeting;
    
    document.querySelectorAll('.action-row').forEach(row => row.style.display = 'none');
    
    // Update available interactions for this traveler
    updateAvailableInteractions();
}

function showTravelerGreeting() {
    if (!currentTraveler) return;
    
    const travelerData = currentTraveler.traveler;
    const continueButton = document.getElementById('continue-button');
    const travelerDialog = document.getElementById('traveler-dialog');

    if (!continueButton || !travelerDialog) {
        console.error('Missing greeting elements');
        return;
    }
    
    let greetingText;
    if (travelerData.is_fixed) {
        greetingText = travelerData.dialog?.greeting1 || travelerData.dialog?.greeting2 || "A special visitor arrives.";
    } else {
        greetingText = travelerData.dialog?.greeting || "Greetings. I seek entry to your town.";
    }
    
    travelerDialog.textContent = greetingText;
    
    if (travelerData.is_fixed) {
        const newButton = continueButton.cloneNode(true);
        continueButton.parentNode.replaceChild(newButton, continueButton);
        
        newButton.style.display = 'block';
        newButton.textContent = 'Complete';
        newButton.onclick = () => completeCurrentTraveler('complete_fixed');
        document.querySelectorAll('.action-row').forEach(row => row.style.display = 'none');
    } else {
        continueButton.style.display = 'none';
        document.querySelectorAll('.action-row').forEach(row => row.style.display = 'flex');
        
        // Update available interactions when showing action buttons
        updateAvailableInteractions();
    }
}

async function handleTravelerAction(action) {
    if (!currentTraveler) return;
    
    const travelerData = currentTraveler.traveler;
    const dialogContainer = document.getElementById('traveler-dialog');
    
    if (!dialogContainer) {
        console.error('Dialog container not found');
        return;
    }

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
    
    if (!dialogContainer) {
        console.error('Dialog container not found');
        return;
    }

    const responseDialogs = {
        allow: travelerData.dialog?.in || "Thank you for allowing me passage.",
        deny: travelerData.dialog?.out || "Very well. I will leave peacefully.",
        execute: travelerData.dialog?.execution || "Please, have mercy!",
        complete_fixed: null
    };
    
    const responseDialog = responseDialogs[decision];
    
    if (responseDialog) {
        dialogContainer.textContent = responseDialog;
        document.querySelectorAll('.action-row').forEach(row => row.style.display = 'none');
        const continueButton = document.getElementById('continue-button');
        if (continueButton) continueButton.style.display = 'none';
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

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Decision failed:', response.status, errorText);
            throw new Error('Failed to process decision');
        }

        const data = await response.json();
        
        if (data.success) {
            if (data.population) currentPopulation = data.population;
            if (data.hidden_reputation) currentHiddenReputation = data.hidden_reputation;
            
            switchScreen('travelers-screen', 'home-screen');
            await refreshGameData();
        }
    } catch (error) {
        console.error('Complete traveler error:', error.message, error.stack);
        alert('Failed to complete traveler.');
    }
}

async function handleTravelerDecision(decision) {
    await completeCurrentTraveler(decision);
}

async function handleEndDay() {
    try {
        const response = await fetch('/api/day/advance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: currentPlayer.chat_id
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('End day failed:', response.status, errorText);
            throw new Error('Failed to advance day');
        }

        const data = await response.json();
        
        if (data.success) {
            currentSession = data.session;
            currentTravelers = data.travelers || [];
            currentEvents = data.events || [];
            
            updateDayDisplay();
            renderEvents();
            checkForPendingTravelers();
            
            alert(`Day ${data.session.day} begins!`);
        }
    } catch (error) {
        console.error('End day error:', error.message, error.stack);
        alert('Failed to advance to next day.');
    }
}

async function refreshGameData() {
    try {
        const response = await fetch('/api/auth/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: currentPlayer.chat_id,
                playerName: currentPlayer.player_name,
                playerLanguage: currentPlayer.player_language,
                timezone: currentPlayer.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Refresh failed:', response.status, errorText);
            return;
        }
        
        const data = await response.json();
        currentSession = data.session;
        currentPopulation = data.population;
        currentHiddenReputation = data.hidden_reputation;
        currentInventory = data.inventory;
        currentEvents = data.events || [];
        currentTravelers = data.travelers || [];
        availableInteractions = data.available_interactions || ['check-papers'];
        
        updateDayDisplay();
        renderPopulation();
        renderInventory();
        renderEvents();
        checkForPendingTravelers();
    } catch (error) {
        console.error('Refresh error:', error.message, error.stack);
    }
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
        console.error('Inventory update error:', error.message);
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

    if (!overlay || !modalIcon || !modalTitle || !modalDesc) {
        console.error('Missing modal elements for icon click');
        return;
    }

    modalIcon.src = `assets/art/icons/${icon}.png`;
    modalIcon.alt = name;
    
    if (type === 'population') {
        modalTitle.textContent = `${name}: ${value}`;
        modalDesc.textContent = populationDescriptions[key] || "No description available.";
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