const Pet = (() => {

    const ANIMATIONS = {
        cat: ['pet_cat_animation_1.mp4', 'pet_cat_animation_2.mp4'],
        owl: ['pet_owl_animation_1.mp4'],
    };

    const FLAVOUR = {
        cat: [
            "Your cat purrs contentedly.",
            "The cat rubs against your leg.",
            "Your feline companion watches you with knowing eyes.",
        ],
        owl: [
            "Your owl hoots softly.",
            "The owl turns its head almost all the way around.",
            "Your feathered friend blinks slowly at you.",
        ],
    };

    const RANDOM_NAMES = {
        cat: ['Ash', 'Sable', 'Ember', 'Mira', 'Dusk'],
        owl: ['Sage', 'Oryn', 'Vex', 'Lumen', 'Nox'],
    };

    function randomName(petType) {
        const pool = RANDOM_NAMES[petType] || ['Shadow'];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function createAnimationController(containerEl, petType) {
        const img   = containerEl.querySelector('.pet-static');
        const video = containerEl.querySelector('.pet-video');

        if (!img || !video) {
            console.warn('Pet: missing .pet-static or .pet-video inside', containerEl);
            return { playAnimation: () => {} };
        }

        const srcs = (ANIMATIONS[petType] || []).map(f => `assets/art/pets/${f}`);
        let isPlaying = false;

        function playAnimation() {
            if (isPlaying || srcs.length === 0) return;
            isPlaying = true;

            video.src = srcs[Math.floor(Math.random() * srcs.length)];
            video.load();

            video.oncanplaythrough = () => {
                video.oncanplaythrough = null;
                video.style.display = 'block';
                video.style.opacity = '0';

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        video.style.opacity = '1';
                        img.style.opacity   = '0';
                        video.play().catch(() => resetToStatic());
                    });
                });
            };

            video.onended = () => { cleanup(); resetToStatic(); };
            video.onerror = () => { cleanup(); resetToStatic(); };
        }

        function cleanup() {
            video.onended          = null;
            video.onerror          = null;
            video.oncanplaythrough = null;
        }

        function resetToStatic() {
            img.style.opacity = '1';
            setTimeout(() => {
                video.style.opacity = '0';
                video.style.display = 'none';
                video.pause();
                isPlaying = false;
            }, 320);
        }

        return { playAnimation };
    }

    function setupSelection({ onPetChosen, fetchDescription }) {
        const catOption   = document.getElementById('pet-cat-option');
        const owlOption   = document.getElementById('pet-owl-option');
        const foxOption   = document.getElementById('pet-fox-option');
        const ravenOption = document.getElementById('pet-raven-option');
        const confirmBtn  = document.getElementById('confirm-pet-button');
        const descEl      = document.getElementById('pet-description');

        if (!catOption || !owlOption || !confirmBtn || !descEl) {
            console.error('Pet: selection screen elements not found.');
            return;
        }

        const catCtrl    = createAnimationController(catOption, 'cat');
        const owlCtrl    = createAnimationController(owlOption, 'owl');
        const allOptions = [catOption, owlOption, foxOption, ravenOption];
        let selectedPet  = null;

        async function showDescription(pet) {
            if (pet === 'fox' || pet === 'raven') {
                descEl.textContent = 'Coming soon…';
                return;
            }
            try {
                descEl.textContent = await fetchDescription(pet);
            } catch (e) {
                console.error('Pet: failed to load description', e);
            }
        }

        function selectPet(pet, el) {
            allOptions.forEach(o => o.classList.remove('selected'));
            if (pet !== 'fox' && pet !== 'raven') {
                el.classList.add('selected');
                selectedPet         = pet;
                confirmBtn.disabled = false;
            }
            showDescription(pet);
        }

        catOption.addEventListener('click', () => {
            catCtrl.playAnimation();
            selectPet('cat', catOption);
        });

        owlOption.addEventListener('click', () => {
            owlCtrl.playAnimation();
            selectPet('owl', owlOption);
        });

        foxOption.addEventListener('click',   () => selectPet('fox',   foxOption));
        ravenOption.addEventListener('click', () => selectPet('raven', ravenOption));

        confirmBtn.addEventListener('click', () => {
            if (!selectedPet) return;
            onPetChosen(selectedPet);
        });
    }

    function setupNaming({ petType, onConfirm }) {
        const img       = document.getElementById('naming-pet-img');
        const video     = document.getElementById('naming-pet-video');
        const nameInput = document.getElementById('pet-name-input');
        const beginBtn  = document.getElementById('begin-button');
        const preview   = document.getElementById('naming-pet-preview');

        if (!img || !video || !nameInput || !beginBtn || !preview) {
            console.error('Pet: naming screen elements not found.');
            return;
        }

        img.src = `assets/art/pets/pet_${petType}_1.webp`;
        img.alt = petType;
        video.innerHTML = '';

        (ANIMATIONS[petType] || []).forEach(f => {
            const source = document.createElement('source');
            source.src   = `assets/art/pets/${f}`;
            source.type  = 'video/mp4';
            video.appendChild(source);
        });

        nameInput.value = randomName(petType);
        nameInput.focus();
        nameInput.select();

        const diceBtn = document.getElementById('dice-button');
        if (diceBtn) {
            diceBtn.addEventListener('click', () => {
                nameInput.value = randomName(petType);
                nameInput.focus();
                nameInput.select();
            });
        }

        const ctrl = createAnimationController(preview, petType);
        preview.addEventListener('click', () => ctrl.playAnimation());

        beginBtn.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            if (!name) {
                nameInput.value = randomName(petType);
                nameInput.select();
                return;
            }

            beginBtn.disabled    = true;
            beginBtn.textContent = 'Beginning…';

            try {
                await onConfirm({ type: petType, name });
            } catch (err) {
                console.error('Pet: confirm failed', err);
                alert('Failed to start. Please try again.');
                beginBtn.disabled    = false;
                beginBtn.textContent = 'Begin';
            }
        });

        nameInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                beginBtn.click();
            }
        });
    }

    function setupHomeWidget(pet) {
        const container = document.getElementById('pet-display');
        if (!container) return;

        const petType = pet.type || pet;

        container.style.display = 'block';
        container.innerHTML     = '';

        const img = document.createElement('img');
        img.src       = `assets/art/pets/pet_${petType}_1.webp`;
        img.alt       = pet.name || petType;
        img.className = 'pet-display-media pet-static';

        const video = document.createElement('video');
        video.className   = 'pet-display-media pet-video';
        video.muted       = true;
        video.playsInline = true;
        video.loop        = false;

        (ANIMATIONS[petType] || []).forEach(f => {
            const source = document.createElement('source');
            source.src   = `assets/art/pets/${f}`;
            source.type  = 'video/mp4';
            video.appendChild(source);
        });

        container.appendChild(img);
        container.appendChild(video);

        const ctrl = createAnimationController(container, petType);

        container.addEventListener('click', () => {
            ctrl.playAnimation();
            showFlavourMessage(pet);
        });
    }

    function showFlavourMessage(pet) {
        const petType = pet.type || pet;
        const name    = pet.name || null;
        const pool    = FLAVOUR[petType] || ["Your pet looks at you curiously."];
        let message   = pool[Math.floor(Math.random() * pool.length)];

        if (name) {
            message = message.replace(/^Your (cat|owl)/, name);
        }

        const list = document.getElementById('events-list');
        if (!list) return;

        const el = document.createElement('div');
        el.className   = 'event-item';
        el.textContent = message;
        list.insertBefore(el, list.firstChild);
        setTimeout(() => { if (el.parentNode) el.remove(); }, 5000);
    }

    return { setupSelection, setupNaming, setupHomeWidget };

})();