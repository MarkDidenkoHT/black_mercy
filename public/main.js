const tg = window.Telegram.WebApp;
tg.expand();

let currentPlayer = null;
let currentSession = null;
let currentPopulation = null;
let currentHiddenReputation = null;
let currentInventory = null;
let currentAvailableInteractions = [];
let currentEvents = [];
let currentTravelers = [];
let currentTravelerIndex = 0;
let currentDayTravelers = [];
let currentTraveler = null;
let currentPet = null;
let currentStructures = [];

const populationDescriptions = {
    total: "Total population in your town. Everything is lost if no one remains."
};

const itemDescriptions = {
    'holy water':       "A vial of blessed water. Causes possessed to shriek in pain.",
    'lantern fuel':     "Fuel for your lantern. Essential for inspecting travel papers.",
    'medicinal herbs':  "Medicinal herbs. Burning these causes the infected to cough."
};

const dayPhases = ['Dawn', 'Morning', 'Noon', 'Afternoon', 'Dusk', 'Night'];

async function initializeApp() {
    try {
        animateLoadingBar();

        const initData       = tg.initDataUnsafe;
        const chatId         = initData?.user?.id?.toString() || 'test_user';
        const playerName     = initData?.user?.first_name || 'Player';
        const playerLanguage = initData?.user?.language_code?.toUpperCase() || 'EN';
        const timezone       = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        const response = await fetch('/api/auth/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, playerName, playerLanguage, timezone })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Auth failed:', response.status, errorText);
            throw new Error('Failed to authenticate');
        }

        const data = await response.json();
        currentPlayer = data.player;

        finishLoadingBar();
        await new Promise(resolve => setTimeout(resolve, 600));

        if (data.needsPetSelection) {
            if (!data.player.tutorial) {
                switchScreen('loading-screen', 'tutorial-screen');
                _initTutorial(() => {
                    switchScreen('tutorial-screen', 'pet-selection-screen');
                    _initPetSelection();
                });
            } else {
                switchScreen('loading-screen', 'pet-selection-screen');
                _initPetSelection();
            }
        } else {
            _applySessionData(data);
            setupModalEvents();
            setupBottomButtons();
            setupTravelersScreen();
            checkForPendingTravelers();
            if (currentPet) Pet.setupHomeWidget(currentPet);
            switchScreen('loading-screen', 'home-screen');
        }

    } catch (error) {
        console.error('Init failed:', error.message, error.stack);
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.style.display = 'block';
            loadingText.textContent   = 'Error loading. Please try again.';
        }
    }
}

function _initTutorial(onComplete) {
    const slides    = Array.from(document.querySelectorAll('.tutorial-slide'));
    const dotsEl    = document.getElementById('tutorial-dots');
    const nextBtn   = document.getElementById('tutorial-next');
    let current     = 0;

    slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'tutorial-dot' + (i === 0 ? ' active' : '');
        dotsEl.appendChild(dot);
    });

    const dots = Array.from(dotsEl.querySelectorAll('.tutorial-dot'));

    function goTo(index) {
        const prev = current;
        slides[prev].classList.remove('active');
        slides[prev].classList.add('exit');
        setTimeout(() => slides[prev].classList.remove('exit'), 400);

        current = index;
        slides[current].classList.add('active');
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
        nextBtn.textContent = current === slides.length - 1 ? 'Choose Your Companion' : 'Continue';
    }

    nextBtn.addEventListener('click', async () => {
        if (current < slides.length - 1) {
            goTo(current + 1);
        } else {
            nextBtn.disabled = true;
            try {
                await fetch('/api/tutorial/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId: currentPlayer.chat_id })
                });
            } catch (e) {
                console.error('Tutorial complete error:', e);
            }
            onComplete();
        }
    });
}

function _initPetSelection() {
    Pet.setupSelection({

        fetchDescription: async (pet) => {
            const res = await fetch('/api/pets/description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pet })
            });
            if (!res.ok) throw new Error('Description fetch failed');
            const data = await res.json();
            return data.description;
        },

        onPetChosen: (petType) => {
            switchScreen('pet-selection-screen', 'pet-naming-screen');

            Pet.setupNaming({
                petType,
                onConfirm: async (pet) => {
                    const initData = tg.initDataUnsafe;
                    const chatId   = initData?.user?.id?.toString() || 'test_user';

                    const res = await fetch('/api/pet/select', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chatId, pet })
                    });

                    if (!res.ok) throw new Error('Failed to select pet');

                    const data = await res.json();
                    _applySessionData(data);

                    setupModalEvents();
                    setupBottomButtons();
                    setupTravelersScreen();
                    checkForPendingTravelers();
                    Pet.setupHomeWidget(currentPet);

                    switchScreen('pet-naming-screen', 'home-screen');
                }
            });
        }
    });
}

function _applySessionData(data) {
    currentSession               = data.session;
    currentPopulation            = data.population;
    currentHiddenReputation      = data.hidden_reputation;
    currentInventory             = data.inventory;
    currentAvailableInteractions = data.available_interactions || ['check-papers', 'let-in', 'push-out'];
    currentEvents                = data.events    || [];
    currentTravelers             = data.travelers || [];
    currentPet                   = data.pet       || null;
    currentStructures            = data.structures || [];

    updateDayDisplay();
    renderPopulation();
    renderInventory();
    renderEvents();
}

function animateLoadingBar() {
    const bar = document.getElementById('loading-bar-fill');
    if (!bar) return;
    [
        { target: 15, delay: 0 },
        { target: 35, delay: 300 },
        { target: 55, delay: 700 },
        { target: 72, delay: 1200 },
        { target: 85, delay: 1900 },
        { target: 90, delay: 2600 },
    ].forEach(({ target, delay }) => {
        setTimeout(() => { bar.style.width = target + '%'; }, delay);
    });
}

function finishLoadingBar() {
    const bar = document.getElementById('loading-bar-fill');
    if (bar) setTimeout(() => { bar.style.width = '100%'; }, 400);
}

function updateDayDisplay() {
    const el = document.getElementById('current-day');
    if (el) el.textContent = `Day ${currentSession.day || 1} - ${getCurrentPhase()}`;
}

function getCurrentPhase() {
    const completed = currentTravelers.filter(t => t.complete).length;
    return dayPhases[Math.min(completed, 5)];
}

function renderPopulation() {
    const container = document.getElementById('reputation-container');
    if (!container) return;
    container.innerHTML = '';

    const total = (currentPopulation.human     || 0)
                + (currentPopulation.infected  || 0)
                + (currentPopulation.possessed || 0);

    const item = document.createElement('div');
    item.className = 'reputation-item';
    Object.assign(item.dataset, { type: 'population', key: 'total', name: 'Population', icon: 'town', count: total });
    item.innerHTML = `
        <img src="assets/art/icons/town.png" alt="Population" class="reputation-icon">
        <span class="reputation-level">${total}</span>
    `;
    container.appendChild(item);
}

function renderInventory() {
    const container = document.getElementById('inventory-container');
    if (!container) return;
    container.innerHTML = '';

    [
        { key: 'holy water',      name: 'Holy Water',      icon: 'holy_water' },
        { key: 'lantern fuel',    name: 'Lantern Fuel',    icon: 'lantern_fuel' },
        { key: 'medicinal herbs', name: 'Medicinal Herbs', icon: 'medicinal_herbs' }
    ].forEach(item => {
        const count = currentInventory[item.key] || 0;
        if (count <= 0) return;

        const el = document.createElement('div');
        el.className = 'inventory-item';
        Object.assign(el.dataset, { type: 'item', key: item.key, name: item.name, icon: item.icon, count });
        el.innerHTML = `
            <img src="assets/art/icons/${item.icon}.png" alt="${item.name}" class="inventory-icon">
            <span class="inventory-count">${count}</span>
        `;
        container.appendChild(el);
    });
}

function renderEvents() {
    const list = document.getElementById('events-list');
    if (!list) return;
    list.innerHTML = '';

    if (currentEvents.length === 0) {
        const el = document.createElement('div');
        el.className  = 'event-item';
        el.textContent = 'No events yet. Your adventure begins now!';
        list.appendChild(el);
        return;
    }

    currentEvents.slice(-10).reverse().forEach(event => {
        const el = document.createElement('div');
        el.className  = 'event-item';
        el.textContent = event.event;
        list.appendChild(el);
    });
}

function setupModalEvents() {
    const modalClose   = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalClose || !modalOverlay) return;

    document.querySelectorAll('.reputation-item, .inventory-item').forEach(item => {
        item.addEventListener('click', handleIconClick);
    });

    modalClose.addEventListener('click',   () => modalOverlay.classList.remove('active'));
    modalOverlay.addEventListener('click', e  => {
        if (e.target === modalOverlay) modalOverlay.classList.remove('active');
    });
}

function setupBottomButtons() {
    const buttons = {
        travelers:   document.getElementById('travelers-button'),
        endDay:      document.getElementById('end-day-button'),
        events:      document.getElementById('events-button'),
        preparation: document.getElementById('preparation-button'),
        settings:    document.getElementById('settings-button')
    };
    const eventsContainer = document.getElementById('events-container');
    if (!buttons.travelers || !eventsContainer) return;

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
        openCityScreen();
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

const BUILDING_POSITIONS = {
    1: { x: 20, y: 30 },
    2: { x: 75, y: 25 },
    3: { x: 55, y: 55 },
    4: { x: 25, y: 60 },
    5: { x: 70, y: 60 },
    6: { x: 50, y: 70 },
};

const BUILDING_EMOJIS = {
    church:          '⛪',
    apothecary:      '⚗️',
    inn:             '🏠',
    'post office':   '✉️',
    'fortune teller':'🔮',
    blacksmith:      '⚒️',
};

const PHASE_BACKGROUNDS = {
    Dawn:      'assets/art/town_dawn.jpg',
    Morning:   'assets/art/town_morning.jpg',
    Noon:      'assets/art/town_noon.jpg',
    Afternoon: 'assets/art/town_afternoon.jpg',
    Dusk:      'assets/art/town_dusk.jpg',
    Night:     'assets/art/town_night.jpg',
};

function openCityScreen() {
    const phase       = getCurrentPhase();
    const bg          = document.getElementById('city-bg');
    const label       = document.getElementById('city-phase-label');
    const buildingsEl = document.getElementById('city-buildings');
    const backBtn     = document.getElementById('city-back-button');
    const infoPanel   = document.getElementById('city-info-panel');

    bg.style.backgroundImage = `url('${PHASE_BACKGROUNDS[phase] || PHASE_BACKGROUNDS.Noon}')`;
    label.textContent = `Day ${currentSession.day} — ${phase}`;

    buildingsEl.innerHTML = '';
    if (infoPanel) infoPanel.style.display = 'none';

    currentStructures.forEach(structure => {
        const template   = structure.structures_templates;
        const templateId = Number(structure.structure);
        const pos        = BUILDING_POSITIONS[templateId] || { x: 50, y: 50 };
        const name       = template?.name || `Building ${templateId}`;
        const emoji      = BUILDING_EMOJIS[name.toLowerCase()] || '🏛️';
        const isActive   = structure.is_active || false;
        const pop        = parseInt(structure.status?.human     || 0)
                         + parseInt(structure.status?.infected  || 0)
                         + parseInt(structure.status?.possessed || 0);

        const marker = document.createElement('div');
        marker.className  = 'building-marker' + (isActive ? '' : ' inactive');
        marker.style.left = `${pos.x}%`;
        marker.style.top  = `${pos.y}%`;

        marker.innerHTML = `
            <div class="building-icon-wrap">
                <div class="building-badge">${emoji}</div>
                <div class="building-pop">${pop}</div>
            </div>
            <div class="building-label">${name}</div>
        `;

        marker.addEventListener('click', () => {
            showCityBuildingInfo({ name, isActive, templateId, structure });
        });

        buildingsEl.appendChild(marker);
    });

    backBtn.onclick = () => {
        if (infoPanel) infoPanel.style.display = 'none';
        switchScreen('city-screen', 'home-screen');
    };

    switchScreen('home-screen', 'city-screen');
}

function showCityBuildingInfo({ name, isActive, templateId, structure }) {
    const infoPanel   = document.getElementById('city-info-panel');
    const infoText    = document.getElementById('city-info-text');
    const actionBtns  = document.getElementById('city-action-buttons');
    if (!infoPanel || !infoText || !actionBtns) return;

    const statusLabel = isActive
        ? `<span class="building-status-active">active</span>`
        : `<span class="building-status-inactive">not active</span>`;

    infoText.innerHTML = `The <strong>${name}</strong> appears to be ${statusLabel}.`;

    actionBtns.innerHTML = '';

    if (isActive) {
        const squireBtn = document.createElement('button');
        squireBtn.className   = 'city-action-btn send-squire';
        squireBtn.textContent = 'Send Squire';
        squireBtn.addEventListener('click', () => handleSendSquire({ name, templateId, structure }));
        actionBtns.appendChild(squireBtn);
    }

    infoPanel.style.display = 'flex';
}

async function handleSendSquire({ name, templateId, structure }) {
    console.log(`[Squire] Sent to ${name} (template_id=${templateId})`, structure);

    const eventText = `Your squire was sent to the ${name}.`;

    try {
        await fetch('/api/events/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: currentPlayer.chat_id, event: eventText })
        });
    } catch (e) {
        console.warn('[Squire] Event log failed (endpoint may not exist yet):', e);
    }

    currentEvents.push({ event: eventText });
    renderEvents();

    const infoText = document.getElementById('city-info-text');
    if (infoText) {
        const existing = infoText.innerHTML;
        infoText.innerHTML = existing + `<br><em style="color:#c8922a;">Squire dispatched.</em>`;
    }
}

function setupTravelersScreen() {
    const backButton     = document.getElementById('back-button');
    const continueButton = document.getElementById('continue-button');
    if (!backButton || !continueButton) return;

    backButton.addEventListener('click', () => {
        switchScreen('travelers-screen', 'home-screen');
        refreshGameData();
    });
    continueButton.addEventListener('click', () => {
        if (currentTraveler) showTravelerGreeting();
    });
}

function checkForPendingTravelers() {
    const travelersButton = document.getElementById('travelers-button');
    const endDayButton    = document.getElementById('end-day-button');
    if (!travelersButton || !endDayButton) return;

    const pending   = currentTravelers.filter(t => !t.complete);
    const completed = currentTravelers.filter(t =>  t.complete);

    if (pending.length > 0) {
        travelersButton.style.display = 'flex';
        travelersButton.classList.add('glow');
        endDayButton.style.display = 'none';
    } else if (completed.length === 6) {
        travelersButton.style.display = 'none';
        endDayButton.style.display = 'flex';
        endDayButton.classList.add('glow');
    } else {
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
            body: JSON.stringify({ chatId: currentPlayer.chat_id, day: currentSession.day })
        });

        if (!response.ok) throw new Error('Failed to load travelers');

        const data = await response.json();
        currentDayTravelers = data.travelers.filter(t => !t.complete);
        if (data.available_interactions) currentAvailableInteractions = data.available_interactions;

        if (currentDayTravelers.length > 0) {
            currentTravelerIndex = 0;
            loadCurrentTraveler();
            switchScreen('home-screen', 'travelers-screen');
        } else {
            alert('No travelers available for today. All travelers have been processed.');
        }
    } catch (error) {
        console.error('Load travelers error:', error);
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
    const td = currentTraveler.traveler;

    const travelerDay    = document.getElementById('traveler-day');
    const travelerArt    = document.getElementById('traveler-art');
    const travelerDialog = document.getElementById('traveler-dialog');
    const continueButton = document.getElementById('continue-button');
    if (!travelerDay || !travelerArt || !travelerDialog || !continueButton) return;

    travelerDay.textContent    = `Day ${currentSession.day} - ${getCurrentPhase()}`;
    travelerArt.src            = `assets/art/travelers/${td.art}.png`;
    travelerDialog.textContent = td.description || "A traveler approaches…";

    continueButton.textContent   = 'Continue';
    continueButton.style.display = 'block';
    continueButton.onclick       = showTravelerGreeting;

    document.querySelectorAll('.action-row').forEach(row => row.style.display = 'none');
}

function setupDynamicActionButtons() {
    const row1 = document.querySelectorAll('.action-row')[0];
    const row2 = document.querySelectorAll('.action-row')[1];
    if (!row1 || !row2) return;

    row1.innerHTML = '';
    row2.innerHTML = '';

    const interactionMap = {
        'check-papers':    { row: 1, text: 'Check Papers',    cls: 'check-papers',    action: 'check_papers',    item: 'lantern fuel' },
        'holy-water':      { row: 1, text: 'Holy Water',      cls: 'holy-water',      action: 'holy_water',      item: 'holy water' },
        'medicinal-herbs': { row: 1, text: 'Medicinal Herbs', cls: 'medicinal-herbs', action: 'medicinal_herbs', item: 'medicinal herbs' },
        'let-in':   { row: 2, text: 'Let In',   cls: 'allow',   decision: 'allow' },
        'push-out': { row: 2, text: 'Push Out', cls: 'deny',    decision: 'deny' },
        'execute':  { row: 2, text: 'Execute',  cls: 'execute', decision: 'execute' },
    };

    currentAvailableInteractions.forEach(id => {
        const bd = interactionMap[id];
        if (!bd) return;

        const btn = document.createElement('button');
        btn.className   = `action-button ${bd.cls}`;
        btn.textContent = bd.text;

        if (bd.row === 1) {
            if (!currentInventory[bd.item] || currentInventory[bd.item] <= 0) return;
            btn.addEventListener('click', () => handleTravelerAction(bd.action));
            row1.appendChild(btn);
        } else {
            btn.addEventListener('click', () => handleTravelerDecision(bd.decision));
            row2.appendChild(btn);
        }
    });
}

function showTravelerGreeting() {
    if (!currentTraveler) return;

    const td             = currentTraveler.traveler;
    const continueButton = document.getElementById('continue-button');
    const travelerDialog = document.getElementById('traveler-dialog');
    if (!continueButton || !travelerDialog) return;

    let greetingText;
    if (td.is_fixed) {
        greetingText = td.dialog?.greeting || "A special visitor arrives.";
        executeTrigger(td.dialog?.trigger, td, currentSession);
    } else {
        greetingText = td.dialog?.greeting || "Greetings. I seek entry to your town.";
    }

    travelerDialog.textContent = greetingText;

    if (td.is_fixed) {
        const newBtn = continueButton.cloneNode(true);
        continueButton.parentNode.replaceChild(newBtn, continueButton);
        newBtn.style.display = 'block';
        newBtn.textContent   = 'Complete';
        newBtn.onclick       = () => completeCurrentTraveler('complete_fixed');
        document.querySelectorAll('.action-row').forEach(row => row.style.display = 'none');
    } else {
        continueButton.style.display = 'none';
        setupDynamicActionButtons();
        document.querySelectorAll('.action-row').forEach(row => row.style.display = 'flex');
    }
}

async function handleTravelerAction(action) {
    if (!currentTraveler) return;

    const td     = currentTraveler.traveler;
    const dialog = document.getElementById('traveler-dialog');
    if (!dialog) return;

    const itemMap = {
        check_papers:    'lantern fuel',
        holy_water:      'holy water',
        medicinal_herbs: 'medicinal herbs'
    };
    const item = itemMap[action];

    if ((currentInventory[item] || 0) <= 0) {
        dialog.textContent = `Not enough ${item}.`;
        return;
    }

    const responses = {
        check_papers:    td.dialog?.papers         || "The papers seem to be in order.",
        holy_water:      td.dialog?.holy_water      || (td.faction === 'possessed' ? "The traveler shrieks in pain!" : "The traveler reacts normally to the holy water."),
        medicinal_herbs: td.dialog?.medicinal_herbs || (td.faction === 'infected'  ? "The traveler coughs violently!" : "The traveler shows no unusual reaction.")
    };

    dialog.textContent = responses[action];
    await updateInventory(item, -1);
    renderInventory();
    setupDynamicActionButtons();
}

async function completeCurrentTraveler(decision) {
    if (!currentTraveler) return;

    const td     = currentTraveler.traveler;
    const dialog = document.getElementById('traveler-dialog');
    if (!dialog) return;

    const responseDialogs = {
        allow:          td.dialog?.in        || "Thank you for allowing me passage.",
        deny:           td.dialog?.out       || "Very well. I will leave peacefully.",
        execute:        td.dialog?.execution || "Please, have mercy!",
        complete_fixed: null
    };

    const responseText = responseDialogs[decision];
    if (responseText) {
        dialog.textContent = responseText;
        document.querySelectorAll('.action-row').forEach(row => row.style.display = 'none');
        const cb = document.getElementById('continue-button');
        if (cb) cb.style.display = 'none';
    }

    try {
        const response = await fetch('/api/travelers/decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: currentPlayer.chat_id, travelerId: currentTraveler.id, decision })
        });

        if (!response.ok) throw new Error('Failed to process decision');

        const data = await response.json();
        if (data.success) {
            if (data.population)        currentPopulation       = data.population;
            if (data.hidden_reputation) currentHiddenReputation = data.hidden_reputation;

            switchScreen('travelers-screen', 'home-screen');
            await refreshGameData();
        }
    } catch (error) {
        console.error('Complete traveler error:', error);
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
            body: JSON.stringify({ chatId: currentPlayer.chat_id })
        });

        if (!response.ok) throw new Error('Failed to advance day');

        const data = await response.json();
        if (data.success) {
            currentSession   = data.session;
            currentTravelers = data.travelers || [];
            currentEvents    = data.events    || [];

            updateDayDisplay();
            renderEvents();
            checkForPendingTravelers();

            alert(`Day ${data.session.day} begins!`);
        }
    } catch (error) {
        console.error('End day error:', error);
        alert('Failed to advance to next day.');
    }
}

async function refreshGameData() {
    try {
        const response = await fetch('/api/auth/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId:         currentPlayer.chat_id,
                playerName:     currentPlayer.player_name,
                playerLanguage: currentPlayer.player_language,
                timezone:       currentPlayer.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
            })
        });

        if (!response.ok) return;

        const data = await response.json();
        _applySessionData(data);
        checkForPendingTravelers();
    } catch (error) {
        console.error('Refresh error:', error);
    }
}

async function updateInventory(item, amount) {
    currentInventory[item] = Math.max(0, (currentInventory[item] || 0) + amount);
    try {
        await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: currentPlayer.chat_id, item, amount })
        });
    } catch (error) {
        console.error('Inventory update error:', error);
    }
}

function handleIconClick(e) {
    const { type, key, name, icon, level, count } = e.currentTarget.dataset;
    const value = level || count;

    const overlay    = document.getElementById('modal-overlay');
    const modalIcon  = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc  = document.getElementById('modal-description');
    if (!overlay || !modalIcon || !modalTitle || !modalDesc) return;

    modalIcon.src = `assets/art/icons/${icon}.png`;
    modalIcon.alt = name;

    modalTitle.textContent = `${name}: ${value}`;
    modalDesc.textContent  = type === 'population'
        ? (populationDescriptions[key] || "No description available.")
        : (itemDescriptions[key]       || "No description available.");

    overlay.classList.add('active');
}

function switchScreen(fromId, toId) {
    const from = document.getElementById(fromId);
    const to   = document.getElementById(toId);
    if (from) from.classList.remove('active');
    if (to)   to.classList.add('active');
}

window.addEventListener('load', initializeApp);
tg.ready();