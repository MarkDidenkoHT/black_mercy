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

const populationDescriptions = {
    total: "Total population in your town. Everything is lost if no one remains."
};

const itemDescriptions = {
    'holy water': "A vial of blessed water. Causes possessed to shriek in pain.",
    'lantern fuel': "Fuel for your lantern. Essential for inspecting travel papers.",
    'medicinal herbs': "Medicinal herbs. Burning these causes the infected to cough."
};

const dayPhases = ['Dawn', 'Morning', 'Noon', 'Afternoon', 'Dusk', 'Night'];

async function initializeApp() {
    try {
        animateLoadingBar();

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
        
        finishLoadingBar();
        await new Promise(resolve => setTimeout(resolve, 600));
        
        if (data.needsPetSelection) {
            switchScreen('loading-screen', 'pet-selection-screen');
            setupPetSelection();
        } else {
            currentSession = data.session;
            currentPopulation = data.population;
            currentHiddenReputation = data.hidden_reputation;
            currentInventory = data.inventory;
            currentAvailableInteractions = data.available_interactions || ['check-papers', 'let-in', 'push-out'];
            currentEvents = data.events || [];
            currentTravelers = data.travelers || [];
            currentPet = data.pet || null;
            
            updateDayDisplay();
            renderPopulation();
            renderInventory();
            renderEvents();
            setupModalEvents();
            setupBottomButtons();
            setupTravelersScreen();
            checkForPendingTravelers();
            
            if (currentPet) {
                setupPetDisplay(currentPet);
            }
            
            switchScreen('loading-screen', 'home-screen');
        }

    } catch (error) {
        console.error('Init failed:', error.message, error.stack);
        document.querySelector('.loading-text').style.display = 'block';
        document.querySelector('.loading-text').textContent = 'Error loading. Please try again.';
    }
}

function animateLoadingBar() {
    const bar = document.getElementById('loading-bar-fill');
    if (!bar) return;
    const steps = [
        { target: 15, delay: 0 },
        { target: 35, delay: 300 },
        { target: 55, delay: 700 },
        { target: 72, delay: 1200 },
        { target: 85, delay: 1900 },
        { target: 90, delay: 2600 },
    ];
    steps.forEach(({ target, delay }) => {
        setTimeout(() => { bar.style.width = target + '%'; }, delay);
    });
}

function finishLoadingBar() {
    const bar = document.getElementById('loading-bar-fill');
    if (!bar) return;
    setTimeout(() => { bar.style.width = '100%'; }, 400);
}

function setupPetSelection() {
    const catOption = document.getElementById('pet-cat-option');
    const owlOption = document.getElementById('pet-owl-option');
    const foxOption = document.getElementById('pet-fox-option');
    const ravenOption = document.getElementById('pet-raven-option');
    const confirmButton = document.getElementById('confirm-pet-button');
    const petDescription = document.getElementById('pet-description');
    
    const catImage = document.getElementById('cat-media');
    const catAnimation = document.getElementById('cat-animation');
    const owlImage = document.getElementById('owl-media');
    const owlAnimation = document.getElementById('owl-animation');
    
    let selectedPet = null;
    
    async function showPetDescription(pet) {
        if (pet === 'fox' || pet === 'raven') {
            petDescription.textContent = 'Coming soon...';
            return;
        }
        
        try {
            const response = await fetch('/api/pets/description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pet })
            });
            
            if (response.ok) {
                const data = await response.json();
                petDescription.textContent = data.description;
            }
        } catch (error) {
            console.error('Failed to load pet description:', error);
        }
    }
    
    function setupPetAnimation(image, animation, petType) {
        const animations = petType === 'cat' 
            ? ['pet_cat_animation_1.mp4', 'pet_cat_animation_2.mp4']
            : ['pet_owl_animation_1.mp4'];
        
        function playRandomAnimation() {
            if (animation.style.display !== 'none') return;
            
            image.style.display = 'none';
            animation.style.display = 'block';
            
            if (petType === 'cat') {
                const randomIndex = Math.floor(Math.random() * animations.length);
                animation.src = `assets/art/pets/${animations[randomIndex]}`;
            }
            
            animation.load();
            animation.play().catch(e => console.log('Animation play failed:', e));
            
            animation.onended = () => {
                animation.style.display = 'none';
                image.style.display = 'block';
                
                const nextDelay = 5000 + Math.random() * 10000;
                setTimeout(playRandomAnimation, nextDelay);
            };
        }
        
        const initialDelay = 5000 + Math.random() * 10000;
        setTimeout(playRandomAnimation, initialDelay);
    }
    
    if (catImage && catAnimation) {
        setupPetAnimation(catImage, catAnimation, 'cat');
    }
    
    if (owlImage && owlAnimation) {
        setupPetAnimation(owlImage, owlAnimation, 'owl');
    }
    
    catOption.addEventListener('click', () => {
        catOption.classList.add('selected');
        owlOption.classList.remove('selected');
        foxOption.classList.remove('selected');
        ravenOption.classList.remove('selected');
        selectedPet = 'cat';
        confirmButton.disabled = false;
        showPetDescription('cat');
    });
    
    owlOption.addEventListener('click', () => {
        owlOption.classList.add('selected');
        catOption.classList.remove('selected');
        foxOption.classList.remove('selected');
        ravenOption.classList.remove('selected');
        selectedPet = 'owl';
        confirmButton.disabled = false;
        showPetDescription('owl');
    });
    
    foxOption.addEventListener('click', () => {
        showPetDescription('fox');
    });
    
    ravenOption.addEventListener('click', () => {
        showPetDescription('raven');
    });
    
    confirmButton.addEventListener('click', async () => {
        if (!selectedPet) return;
        
        confirmButton.disabled = true;
        confirmButton.textContent = 'Choosing...';
        
        try {
            const initData = tg.initDataUnsafe;
            const chatId = initData?.user?.id?.toString() || 'test_user';
            
            const response = await fetch('/api/pet/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId,
                    pet: selectedPet
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to select pet');
            }
            
            const data = await response.json();
            
            currentSession = data.session;
            currentPopulation = data.population;
            currentHiddenReputation = data.hidden_reputation;
            currentInventory = data.inventory;
            currentAvailableInteractions = data.available_interactions;
            currentEvents = data.events;
            currentTravelers = data.travelers;
            currentPet = data.pet;
            
            updateDayDisplay();
            renderPopulation();
            renderInventory();
            renderEvents();
            setupModalEvents();
            setupBottomButtons();
            setupTravelersScreen();
            checkForPendingTravelers();
            
            setupPetDisplay(currentPet);
            
            switchScreen('pet-selection-screen', 'home-screen');
            
        } catch (error) {
            console.error('Pet selection error:', error);
            alert('Failed to select pet. Please try again.');
            confirmButton.disabled = false;
            confirmButton.textContent = 'Confirm Choice';
        }
    });
}

function setupPetDisplay(petType) {
    const petDisplay = document.getElementById('pet-display');
    
    if (!petDisplay) return;
    
    petDisplay.style.display = 'block';
    petDisplay.innerHTML = '';
    
    const image = document.createElement('img');
    image.src = `assets/art/pets/pet_${petType}_1.webp`;
    image.className = 'pet-display-media';
    image.style.display = 'block';
    
    const video = document.createElement('video');
    video.className = 'pet-display-media';
    video.muted = true;
    video.playsinline = true;
    video.loop = false;
    video.style.display = 'none';
    
    const animations = petType === 'cat' 
        ? ['pet_cat_animation_1.mp4', 'pet_cat_animation_2.mp4']
        : ['pet_owl_animation_1.mp4'];
    
    petDisplay.appendChild(image);
    petDisplay.appendChild(video);
    
    function playRandomAnimation() {
        if (video.style.display !== 'none') return;
        
        image.style.display = 'none';
        video.style.display = 'block';
        
        if (petType === 'cat') {
            const randomIndex = Math.floor(Math.random() * animations.length);
            video.src = `assets/art/pets/${animations[randomIndex]}`;
        } else {
            video.src = `assets/art/pets/${animations[0]}`;
        }
        
        video.load();
        video.play().catch(e => console.log('Pet animation play failed:', e));
        
        setTimeout(() => {
            video.pause();
            video.style.display = 'none';
            image.style.display = 'block';
            
            const nextDelay = 5000 + Math.random() * 10000;
            setTimeout(playRandomAnimation, nextDelay);
        }, 3000);
    }
    
    const initialDelay = 5000 + Math.random() * 10000;
    setTimeout(playRandomAnimation, initialDelay);
    
    image.addEventListener('click', () => {
        const messages = {
            cat: [
                "Your cat purrs contentedly.",
                "The cat rubs against your leg.",
                "Your feline companion watches you with knowing eyes."
            ],
            owl: [
                "Your owl hoots softly.",
                "The owl turns its head almost all the way around.",
                "Your feathered friend blinks slowly at you."
            ]
        };
        
        const petMessages = messages[petType] || ["Your pet looks at you curiously."];
        const randomMessage = petMessages[Math.floor(Math.random() * petMessages.length)];
        
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';
        eventItem.textContent = randomMessage;
        
        const eventsList = document.getElementById('events-list');
        if (eventsList) {
            eventsList.insertBefore(eventItem, eventsList.firstChild);
            
            setTimeout(() => {
                if (eventItem.parentNode) {
                    eventItem.remove();
                }
            }, 5000);
        }
    });
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

    const allItems = [
        { key: 'holy water', name: 'Holy Water', icon: 'holy_water' },
        { key: 'lantern fuel', name: 'Lantern Fuel', icon: 'lantern_fuel' },
        { key: 'medicinal herbs', name: 'Medicinal Herbs', icon: 'medicinal_herbs' }
    ];

    allItems.forEach(item => {
        const count = currentInventory[item.key] || 0;
        
        if (count > 0) {
            const invItem = document.createElement('div');
            invItem.className = 'inventory-item';
            Object.assign(invItem.dataset, { type: 'item', key: item.key, name: item.name, icon: item.icon, count });
            invItem.innerHTML = `
                <img src="assets/art/icons/${item.icon}.png" alt="${item.name}" class="inventory-icon">
                <span class="inventory-count">${count}</span>
            `;
            container.appendChild(invItem);
        }
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

    if (!backButton || !continueButton) {
        console.error('Missing traveler screen elements:', {
            backButton: !!backButton,
            continueButton: !!continueButton
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
        
        if (data.available_interactions) {
            currentAvailableInteractions = data.available_interactions;
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
}

function setupDynamicActionButtons() {
    const actionRow1 = document.querySelectorAll('.action-row')[0];
    const actionRow2 = document.querySelectorAll('.action-row')[1];
    
    if (!actionRow1 || !actionRow2) {
        console.error('Action rows not found');
        return;
    }
    
    actionRow1.innerHTML = '';
    actionRow2.innerHTML = '';
    
    const interactionMap = {
        'check-papers': {
            row: 1,
            text: 'Check Papers',
            class: 'check-papers',
            action: 'check_papers',
            requiresItem: 'lantern fuel'
        },
        'holy-water': {
            row: 1,
            text: 'Holy Water',
            class: 'holy-water',
            action: 'holy_water',
            requiresItem: 'holy water'
        },
        'medicinal-herbs': {
            row: 1,
            text: 'Medicinal Herbs',
            class: 'medicinal-herbs',
            action: 'medicinal_herbs',
            requiresItem: 'medicinal herbs'
        },
        'let-in': {
            row: 2,
            text: 'Let In',
            class: 'allow',
            decision: 'allow'
        },
        'push-out': {
            row: 2,
            text: 'Push Out',
            class: 'deny',
            decision: 'deny'
        },
        'execute': {
            row: 2,
            text: 'Execute',
            class: 'execute',
            decision: 'execute'
        }
    };
    
    currentAvailableInteractions.forEach(interactionId => {
        const buttonData = interactionMap[interactionId];
        
        if (!buttonData) return;
        
        if (buttonData.row === 1) {
            const hasItem = currentInventory[buttonData.requiresItem] && currentInventory[buttonData.requiresItem] > 0;
            
            if (hasItem) {
                const button = document.createElement('button');
                button.className = `action-button ${buttonData.class}`;
                button.textContent = buttonData.text;
                button.addEventListener('click', () => handleTravelerAction(buttonData.action));
                actionRow1.appendChild(button);
            }
        } 
        else if (buttonData.row === 2) {
            const button = document.createElement('button');
            button.className = `action-button ${buttonData.class}`;
            button.textContent = buttonData.text;
            button.addEventListener('click', () => handleTravelerDecision(buttonData.decision));
            actionRow2.appendChild(button);
        }
    });
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
        greetingText = travelerData.dialog?.greeting || "A special visitor arrives.";
        executeTrigger(travelerData.dialog?.trigger, travelerData, currentSession);
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
        setupDynamicActionButtons();
        document.querySelectorAll('.action-row').forEach(row => row.style.display = 'flex');
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
    
    setupDynamicActionButtons();
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
        currentAvailableInteractions = data.available_interactions || ['check-papers', 'let-in', 'push-out'];
        currentEvents = data.events || [];
        currentTravelers = data.travelers || [];
        
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