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
let currentHeroes = [];
let currentDialogTree = null;
let activeTab = 'keep';
let heroSliderIndex = 0;

const populationDescriptions = {
    total: "Total population in your town. Everything is lost if no one remains."
};

const itemDescriptions = {
    'holy water':      "A vial of blessed water. Causes possessed to shriek in pain.",
    'lantern fuel':    "Fuel for your lantern. Essential for inspecting travel papers.",
    'medicinal herbs': "Medicinal herbs. Burning these causes the infected to cough."
};

const dayPhases = ['Dawn', 'Morning', 'Noon', 'Afternoon', 'Dusk', 'Night'];

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

function showFlowScreen(id) {
    document.querySelectorAll('.flow-screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function showTab(tab) {
    activeTab = tab;

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('tab-' + tab);
    if (panel) panel.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
        b.classList.remove('glow');
    });

    document.querySelectorAll('.controls-panel').forEach(p => { p.style.display = 'none'; });

    const controlsMap = {
        gate:   'gate-actions',
        city:   'city-controls',
        keep:   'keep-controls',
        heroes: 'heroes-controls',
    };

    const controlId = controlsMap[tab];
    if (controlId) {
        const ctrl = document.getElementById(controlId);
        if (ctrl) ctrl.style.display = 'flex';
    }

    if (tab === 'gate') {
        refreshGateTab();
    } else if (tab === 'city') {
        refreshCityTab();
    }
}

async function initializeApp() {
    try {
        animateLoadingBar();

        const initData = tg.initDataUnsafe;
        const chatId        = initData?.user?.id?.toString() || 'test_user';
        const playerName    = initData?.user?.first_name || 'Player';
        const playerLanguage = initData?.user?.language_code?.toUpperCase() || 'EN';
        const timezone      = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        const response = await fetch('/api/auth/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, playerName, playerLanguage, timezone })
        });

        if (!response.ok) throw new Error('Failed to authenticate');

        const data = await response.json();
        currentPlayer = data.player;

        finishLoadingBar();
        await new Promise(r => setTimeout(r, 600));

        if (data.needsPetSelection) {
            if (!data.player.tutorial) {
                showFlowScreen('flow-tutorial');
                initTutorial(() => {
                    showFlowScreen('flow-pet-selection');
                    initPetSelection();
                });
            } else {
                showFlowScreen('flow-pet-selection');
                initPetSelection();
            }
        } else {
            applySessionData(data);
            setupShell();
            showFlowScreen('app-shell');
            showTab('keep');
        }

    } catch (error) {
        console.error('Init failed:', error);
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.style.display = 'block';
            loadingText.textContent = 'Error loading. Please try again.';
        }
    }
}

function initTutorial(onComplete) {
    const slides  = Array.from(document.querySelectorAll('.tutorial-slide'));
    const dotsEl  = document.getElementById('tutorial-dots');
    const nextBtn = document.getElementById('tutorial-next');
    let current = 0;

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

function initPetSelection() {
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
            showFlowScreen('flow-pet-naming');
            Pet.setupNaming({
                petType,
                onConfirm: async (pet) => {
                    const chatId = tg.initDataUnsafe?.user?.id?.toString() || 'test_user';
                    const res = await fetch('/api/pet/select', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chatId, pet })
                    });
                    if (!res.ok) throw new Error('Failed to select pet');
                    const data = await res.json();
                    applySessionData(data);
                    setupShell();
                    showFlowScreen('app-shell');
                    showTab('keep');
                }
            });
        }
    });
}

function applySessionData(data) {
    currentSession              = data.session;
    currentPopulation           = data.population;
    currentHiddenReputation     = data.hidden_reputation;
    currentInventory            = data.inventory;
    currentAvailableInteractions = data.available_interactions || ['check-papers', 'let-in', 'push-out'];
    currentEvents               = data.events || [];
    currentTravelers            = data.travelers || [];
    currentPet                  = data.pet || null;
    currentStructures           = data.structures || [];
    currentHeroes               = data.heroes || [];

    updateDayDisplay();
    renderPopulation();
    renderInventory();
    renderEvents();
}

function setupShell() {
    setupNavButtons();
    setupModalEvents();
    setupGateActionButtons();
    updateGateNavGlow();
    if (currentPet) Pet.setupHomeWidget(currentPet);
}

function setupNavButtons() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (tab) showTab(tab);
        });
    });
}

function setupModalEvents() {
    const modalClose   = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalClose || !modalOverlay) return;

    document.querySelectorAll('.reputation-item, .inventory-item').forEach(item => {
        item.addEventListener('click', handleIconClick);
    });

    modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
    modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) modalOverlay.classList.remove('active');
    });
}

function animateLoadingBar() {
    const bar = document.getElementById('loading-bar-fill');
    if (!bar) return;
    [
        { target: 15,  delay: 0    },
        { target: 35,  delay: 300  },
        { target: 55,  delay: 700  },
        { target: 72,  delay: 1200 },
        { target: 85,  delay: 1900 },
        { target: 90,  delay: 2600 },
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
    if (el) el.textContent = `Day ${currentSession?.day || 1} — ${getCurrentPhase()}`;
}

function getCurrentPhase() {
    const completed = currentTravelers.filter(t => t.complete).length;
    return dayPhases[Math.min(completed, 5)];
}

function renderPopulation() {
    const container = document.getElementById('reputation-container');
    if (!container) return;
    container.innerHTML = '';

    const total = (currentPopulation?.human     || 0)
                + (currentPopulation?.infected   || 0)
                + (currentPopulation?.possessed  || 0);

    const item = document.createElement('div');
    item.className = 'reputation-item';
    Object.assign(item.dataset, { type: 'population', key: 'total', name: 'Population', icon: 'town', count: total });
    item.innerHTML = `
        <img src="assets/art/icons/town.png" alt="Population" class="reputation-icon">
        <span class="reputation-level">${total}</span>
    `;
    item.addEventListener('click', handleIconClick);
    container.appendChild(item);
}

function renderInventory() {
    const container = document.getElementById('inventory-container');
    if (!container) return;
    container.innerHTML = '';

    [
        { key: 'holy water',      name: 'Holy Water',      icon: 'holy_water'      },
        { key: 'lantern fuel',    name: 'Lantern Fuel',    icon: 'lantern_fuel'    },
        { key: 'medicinal herbs', name: 'Medicinal Herbs', icon: 'medicinal_herbs' }
    ].forEach(def => {
        const count = currentInventory?.[def.key] || 0;
        if (count <= 0) return;

        const el = document.createElement('div');
        el.className = 'inventory-item';
        Object.assign(el.dataset, { type: 'item', key: def.key, name: def.name, icon: def.icon, count });
        el.innerHTML = `
            <img src="assets/art/icons/${def.icon}.png" alt="${def.name}" class="inventory-icon">
            <span class="inventory-count">${count}</span>
        `;
        el.addEventListener('click', handleIconClick);
        container.appendChild(el);
    });
}

function renderEvents() {
    const list = document.getElementById('events-list');
    if (!list) return;
    list.innerHTML = '';

    if (!currentEvents || currentEvents.length === 0) {
        const el = document.createElement('div');
        el.className = 'event-item';
        el.textContent = 'No events yet. Your adventure begins now.';
        list.appendChild(el);
        return;
    }

    currentEvents.slice(-10).reverse().forEach(event => {
        const el = document.createElement('div');
        el.className = 'event-item';
        el.textContent = event.event;
        list.appendChild(el);
    });
}

function updateGateNavGlow() {
    const gateBtn = document.getElementById('nav-gate');
    if (!gateBtn) return;
    const pending = (currentTravelers || []).filter(t => !t.complete);
    if (pending.length > 0 && activeTab !== 'gate') {
        gateBtn.classList.add('glow');
    } else {
        gateBtn.classList.remove('glow');
    }
}


function refreshGateTab() {
    updateGateNavGlow();
    loadTravelersForCurrentDay();
}

async function loadTravelersForCurrentDay() {
    if (!currentPlayer) return;

    const gateActions = document.getElementById('gate-actions');
    const travelerArt = document.getElementById('traveler-art');
    const travelerDialog = document.getElementById('traveler-dialog');

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
        } else {
            if (travelerArt)    travelerArt.src = '';
            if (travelerDialog) travelerDialog.textContent = 'All travelers have been processed for today.';
            if (gateActions)    gateActions.style.display = 'none';
        }
    } catch (error) {
        console.error('Load travelers error:', error);
        if (travelerDialog) travelerDialog.textContent = 'Could not load travelers.';
    }
}

function loadCurrentTraveler() {
    if (currentTravelerIndex >= currentDayTravelers.length) {
        const travelerDialog = document.getElementById('traveler-dialog');
        const gateActions    = document.getElementById('gate-actions');
        if (travelerDialog) travelerDialog.textContent = 'No more travelers today.';
        if (gateActions)    gateActions.style.display = 'none';
        refreshGameData();
        return;
    }

    currentTraveler = currentDayTravelers[currentTravelerIndex];
    const td = currentTraveler.traveler;

    const travelerArt    = document.getElementById('traveler-art');
    const travelerDialog = document.getElementById('traveler-dialog');
    const continueButton = document.getElementById('continue-button');
    const gateActions    = document.getElementById('gate-actions');

    if (travelerArt)    travelerArt.src = `assets/art/travelers/${td.art}.png`;
    if (travelerDialog) travelerDialog.textContent = td.description || 'A traveler approaches…';

    if (continueButton) {
        continueButton.textContent  = 'Continue';
        continueButton.style.display = 'block';
        continueButton.disabled     = false;
        continueButton.onclick      = showTravelerGreeting;
    }

    const row1 = document.getElementById('gate-row-1');
    const row2 = document.getElementById('gate-row-2');
    if (row1) { row1.innerHTML = ''; row1.style.display = 'none'; }
    if (row2) { row2.innerHTML = ''; row2.style.display = 'none'; }

    if (gateActions) gateActions.style.display = 'flex';
}

function setupGateActionButtons() {
    const continueButton = document.getElementById('continue-button');
    if (continueButton) {
        continueButton.onclick = () => {
            if (currentTraveler) showTravelerGreeting();
        };
    }
}

function buildDynamicActionButtons() {
    const row1 = document.getElementById('gate-row-1');
    const row2 = document.getElementById('gate-row-2');
    if (!row1 || !row2) return;

    row1.innerHTML = '';
    row2.innerHTML = '';

    const interactionMap = {
        'check-papers':    { row: 1, text: 'Check Papers',    cls: 'check-papers',    action: 'check_papers',    item: 'lantern fuel'    },
        'holy-water':      { row: 1, text: 'Holy Water',      cls: 'holy-water',      action: 'holy_water',      item: 'holy water'      },
        'medicinal-herbs': { row: 1, text: 'Medicinal Herbs', cls: 'medicinal-herbs', action: 'medicinal_herbs', item: 'medicinal herbs' },
        'let-in':          { row: 2, text: 'Let In',          cls: 'allow',   decision: 'allow'   },
        'push-out':        { row: 2, text: 'Push Out',        cls: 'deny',    decision: 'deny'    },
        'execute':         { row: 2, text: 'Execute',         cls: 'execute', decision: 'execute' },
    };

    currentAvailableInteractions.forEach(id => {
        const bd = interactionMap[id];
        if (!bd) return;

        const btn = document.createElement('button');
        btn.className = `action-button ${bd.cls}`;
        btn.textContent = bd.text;

        if (bd.row === 1) {
            if (!currentInventory?.[bd.item] || currentInventory[bd.item] <= 0) return;
            btn.addEventListener('click', () => handleTravelerAction(bd.action));
            row1.appendChild(btn);
        } else {
            btn.addEventListener('click', () => handleTravelerDecision(bd.decision));
            row2.appendChild(btn);
        }
    });

    row1.style.display = row1.children.length > 0 ? 'flex' : 'none';
    row2.style.display = row2.children.length > 0 ? 'flex' : 'none';
}

function showTravelerGreeting() {
    if (!currentTraveler) return;

    const td             = currentTraveler.traveler;
    const continueButton = document.getElementById('continue-button');
    const travelerDialog = document.getElementById('traveler-dialog');

    if (!continueButton || !travelerDialog) return;

    if (td.is_fixed) {
        const dialogTreeId = td.dialog?.trigger;

        if (dialogTreeId && typeof DIALOG_TREES !== 'undefined' && DIALOG_TREES[dialogTreeId]) {
            currentDialogTree = getDialogTree(dialogTreeId);
            showDialogNode();
        } else {
            const greetingText = td.dialog?.greeting || 'A special visitor arrives.';
            travelerDialog.textContent = greetingText;
            if (dialogTreeId) executeTrigger(dialogTreeId, td, currentSession);

            continueButton.textContent  = 'Complete';
            continueButton.style.display = 'block';
            continueButton.disabled     = false;
            continueButton.onclick      = () => completeCurrentTraveler('complete_fixed');

            const row1 = document.getElementById('gate-row-1');
            const row2 = document.getElementById('gate-row-2');
            if (row1) { row1.innerHTML = ''; row1.style.display = 'none'; }
            if (row2) { row2.innerHTML = ''; row2.style.display = 'none'; }
        }
    } else {
        travelerDialog.textContent = td.dialog?.greeting || 'Greetings. I seek entry to your town.';
        continueButton.style.display = 'none';
        buildDynamicActionButtons();
    }
}

function showDialogNode() {
    if (!currentDialogTree) return;

    const travelerDialog = document.getElementById('traveler-dialog');
    const continueButton = document.getElementById('continue-button');
    const row1           = document.getElementById('gate-row-1');
    const row2           = document.getElementById('gate-row-2');

    if (!travelerDialog || !row1 || !row2) return;

    travelerDialog.textContent = currentDialogTree.getText();

    row1.innerHTML = '';
    row2.innerHTML = '';

    const options = currentDialogTree.getOptions();

    if (options.length === 0) {
        continueButton.style.display = 'block';
        continueButton.textContent  = 'Complete';
        continueButton.disabled     = false;
        continueButton.onclick      = () => completeCurrentTraveler('complete_fixed');
        return;
    }

    options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className   = 'action-button continue';
        btn.textContent = option.text;
        btn.style.flex  = '1';
        btn.onclick     = () => handleDialogChoice(index);
        row1.appendChild(btn);
    });

    row1.style.display  = 'flex';
    row2.style.display  = 'none';
    continueButton.style.display = 'none';
}

async function handleDialogChoice(optionIndex) {
    if (!currentDialogTree) return;

    const result = currentDialogTree.selectOption(optionIndex);
    if (!result) return;

    if (result.actions && result.actions.length > 0) {
        const actionResults = await executeDialogActions(result.actions);
        let recruitedHero = false;
        for (const { actionId, result: actionResult } of actionResults) {
            if (actionId === 'recruit_hero' && actionResult?.success) {
                recruitedHero = true;
            }
            if (actionResult?.gameOverRequired) {
                handleDialogGameOver(actionResult);
                return;
            }
        }
        if (recruitedHero) await refreshHeroes();
    }

    if (result.end) {
        setTimeout(() => completeCurrentTraveler('complete_fixed'), 500);
        return;
    }

    showDialogNode();
}

function handleDialogGameOver(result) {
    const travelerDialog = document.getElementById('traveler-dialog');
    const row1           = document.getElementById('gate-row-1');
    const continueButton = document.getElementById('continue-button');

    if (travelerDialog) travelerDialog.textContent = result.message || 'Your town has fallen.';
    if (row1) { row1.innerHTML = ''; row1.style.display = 'none'; }

    if (continueButton) {
        continueButton.style.display = 'block';
        continueButton.textContent   = 'Game Over';
        continueButton.disabled      = true;
    }
}

async function handleTravelerAction(action) {
    if (!currentTraveler) return;

    const td             = currentTraveler.traveler;
    const travelerDialog = document.getElementById('traveler-dialog');
    if (!travelerDialog) return;

    const itemMap = {
        check_papers:     'lantern fuel',
        holy_water:       'holy water',
        medicinal_herbs:  'medicinal herbs'
    };
    const item = itemMap[action];

    if ((currentInventory?.[item] || 0) <= 0) {
        travelerDialog.textContent = `Not enough ${item}.`;
        return;
    }

    const responses = {
        check_papers:    td.dialog?.papers      || 'The papers seem to be in order.',
        holy_water:      td.dialog?.holy_water  || (td.faction === 'possessed' ? 'The traveler shrieks in pain!' : 'The traveler reacts normally to the holy water.'),
        medicinal_herbs: td.dialog?.medicinal_herbs || (td.faction === 'infected' ? 'The traveler coughs violently!' : 'The traveler shows no unusual reaction.')
    };

    travelerDialog.textContent = responses[action];
    await updateInventory(item, -1);
    renderInventory();
    buildDynamicActionButtons();
}

async function completeCurrentTraveler(decision) {
    if (!currentTraveler) return;

    const td             = currentTraveler.traveler;
    const travelerDialog = document.getElementById('traveler-dialog');
    const continueButton = document.getElementById('continue-button');
    const row1           = document.getElementById('gate-row-1');
    const row2           = document.getElementById('gate-row-2');

    const responseDialogs = {
        allow:          td.dialog?.in        || 'Thank you for allowing me passage.',
        deny:           td.dialog?.out       || 'Very well. I will leave peacefully.',
        execute:        td.dialog?.execution || 'Please, have mercy!',
        complete_fixed: null
    };

    const responseText = responseDialogs[decision];
    if (responseText && travelerDialog) {
        travelerDialog.textContent = responseText;
        if (row1) { row1.innerHTML = ''; row1.style.display = 'none'; }
        if (row2) { row2.innerHTML = ''; row2.style.display = 'none'; }
        if (continueButton) continueButton.style.display = 'none';
    }

    try {
        const response = await fetch('/api/travelers/decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId:     currentPlayer.chat_id,
                travelerId: currentTraveler.id,
                decision
            })
        });

        if (!response.ok) throw new Error('Failed to process decision');

        const data = await response.json();
        if (data.success) {
            if (data.population)          currentPopulation        = data.population;
            if (data.hidden_reputation)   currentHiddenReputation  = data.hidden_reputation;

            await refreshGameData();
            updateGateNavGlow();

            setTimeout(() => {
                currentTravelerIndex++;
                loadCurrentTraveler();
            }, 900);
        }
    } catch (error) {
        console.error('Complete traveler error:', error);
    }
}

async function handleTravelerDecision(decision) {
    await completeCurrentTraveler(decision);
}


function refreshCityTab() {
    const phase       = getCurrentPhase();
    const bg          = document.getElementById('city-bg');
    const buildingsEl = document.getElementById('city-buildings');
    const infoPanel   = document.getElementById('city-info-panel');

    if (bg) {
        bg.style.backgroundImage = `url('${PHASE_BACKGROUNDS[phase] || PHASE_BACKGROUNDS.Noon}')`;
    }

    if (buildingsEl) buildingsEl.innerHTML = '';
    if (infoPanel)   infoPanel.style.display = 'none';

    const cityControls = document.getElementById('city-controls');
    if (cityControls) cityControls.style.display = 'flex';

    (currentStructures || []).forEach(structure => {
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

        if (isActive) {
            marker.addEventListener('click', () => {
                showCityBuildingInfo({ name, isActive, templateId, structure });
            });
        }

        buildingsEl.appendChild(marker);
    });
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

async function handleSendSquire({ name }) {
    const eventText = `Your squire was sent to the ${name}.`;

    try {
        await fetch('/api/events/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: currentPlayer.chat_id, event: eventText })
        });
    } catch (e) {
        console.warn('[Squire] Event log failed:', e);
    }

    currentEvents.push({ event: eventText });
    renderEvents();

    const infoText = document.getElementById('city-info-text');
    if (infoText) {
        infoText.innerHTML += `<br><em style="color:var(--gold-dark);">Squire dispatched.</em>`;
    }
}


async function refreshGameData() {
    if (!currentPlayer) return;
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
        applySessionData(data);
        updateGateNavGlow();
    } catch (error) {
        console.error('Refresh error:', error);
    }
}

async function updateInventory(item, amount) {
    if (!currentInventory) return;
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

async function refreshHeroes() {
    if (!currentPlayer) return;
    try {
        const response = await fetch(`/api/heroes/list?chatId=${currentPlayer.chat_id}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.success) {
            currentHeroes = data.heroes;
            renderHeroSlider();
        }
    } catch (error) {
        console.error('Refresh heroes error:', error);
    }
}

function handleIconClick(e) {
    const { type, key, name, icon, level, count } = e.currentTarget.dataset;
    const value = level || count;

    const overlay   = document.getElementById('modal-overlay');
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc  = document.getElementById('modal-description');
    if (!overlay || !modalIcon || !modalTitle || !modalDesc) return;

    modalIcon.src   = `assets/art/icons/${icon}.png`;
    modalIcon.alt   = name;
    modalTitle.textContent = `${name}: ${value}`;
    modalDesc.textContent  = type === 'population'
        ? (populationDescriptions[key] || 'No description available.')
        : (itemDescriptions[key]       || 'No description available.');

    overlay.classList.add('active');
}

function renderHeroSlider() {
    const container = document.getElementById('hero-slider-container');
    const content   = document.getElementById('hero-slider-content');
    const prevBtn   = document.getElementById('hero-slider-prev');
    const nextBtn   = document.getElementById('hero-slider-next');
    const comingSoon = document.getElementById('heroes-coming-soon');

    if (!container || !content || !prevBtn || !nextBtn || !currentHeroes) return;

    if (currentHeroes.length === 0) {
        container.style.display = 'none';
        if (comingSoon) comingSoon.style.display = 'block';
        return;
    }
    if (comingSoon) comingSoon.style.display = 'none';
    container.style.display = 'flex';

    heroSliderIndex = Math.max(0, Math.min(heroSliderIndex, currentHeroes.length - 1));
    const hero = currentHeroes[heroSliderIndex];
    if (!hero) return;

    // Parse stats/talents if needed
    let stats = hero.stats;
    if (typeof stats === 'string') try { stats = JSON.parse(stats); } catch {}
    let talents = hero.talents;
    if (typeof talents === 'string') talents = [talents];
    if (talents && !Array.isArray(talents)) talents = [talents];
    let rep = hero.reputation;
    if (typeof rep === 'string') try { rep = JSON.parse(rep); } catch {}

    content.innerHTML = `
        <div class="hero-art-name">
            <img class="hero-art" src="assets/art/heroes/${hero.art || hero.hero}.png" alt="${hero.hero}">
            <h2 class="hero-name">${hero.hero}</h2>
        </div>
        <div class="hero-stats">
            <div><strong>Zeal:</strong> ${stats?.zeal ?? '-'}</div>
            <div><strong>Mercy:</strong> ${stats?.mercy ?? '-'}</div>
            <div><strong>Insight:</strong> ${stats?.insight ?? '-'}</div>
            <div><strong>Authority:</strong> ${stats?.authority ?? '-'}</div>
            <div><strong>Swiftness:</strong> ${stats?.swiftness ?? '-'}</div>
        </div>
        <div class="hero-talents">
            <strong>Talents:</strong> ${(talents && talents.length > 0) ? talents.join(', ') : '-'}
        </div>
        <div class="hero-reputation">
            <strong>Reputation:</strong> ${rep?.player ?? '-'}
        </div>
    `;

    prevBtn.disabled = heroSliderIndex === 0;
    nextBtn.disabled = heroSliderIndex === currentHeroes.length - 1;

    prevBtn.onclick = () => {
        if (heroSliderIndex > 0) {
            heroSliderIndex--;
            renderHeroSlider();
        }
    };
    nextBtn.onclick = () => {
        if (heroSliderIndex < currentHeroes.length - 1) {
            heroSliderIndex++;
            renderHeroSlider();
        }
    };
}

// Call this after loading heroes or switching to the tab
function refreshHeroesTab() {
    renderHeroSlider();
}

// Patch showTab to refresh heroes tab
const origShowTab = showTab;
showTab = function(tab) {
    origShowTab(tab);
    if (tab === 'heroes') refreshHeroesTab();
};

window.addEventListener('load', initializeApp);
tg.ready();