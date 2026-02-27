const TRIGGER_HANDLERS = {
    Revelation: (traveler, session) => {
        console.log('[TRIGGER] Revelation fired by:', traveler.name);
        // TODO: implement Revelation logic
    },

    Explanation_H: async (traveler, session) => {
    console.log('[TRIGGER] Explanation_H fired by:', traveler.name);

    try {
        const [itemsRes, structureRes, interactionRes] = await Promise.all([
            fetch('/api/inventory/give', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: currentPlayer.chat_id, items: { 'holy water': 2 } })
            }),
            fetch('/api/structures/set-active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: currentPlayer.chat_id, structureTemplateId: 1 })
            }),
            fetch('/api/session/add-interaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: currentPlayer.chat_id, interaction: 'holy-water' })
            })
        ]);

        if (!itemsRes.ok || !structureRes.ok || !interactionRes.ok) throw new Error('Explanation_H trigger request failed');

        const itemsData = await itemsRes.json();
        const interactionData = await interactionRes.json();

        if (itemsData.success) {
            currentInventory = itemsData.inventory;
            renderInventory();
        }

        if (interactionData.success) {
            currentAvailableInteractions = interactionData.available_interactions;
        }

        await fetch('/api/events/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: currentPlayer.chat_id,
                    event: 'Mithrail of the Inquisition blessed your supplies. You received 2 Holy Water. The Church is now active.'
                })
            });

            currentEvents.push({ event: 'Mithrail of the Inquisition blessed your supplies. You received 2 Holy Water. The Church is now active.' });
            renderEvents();

        } catch (error) {
            console.error('[TRIGGER] Explanation_H error:', error);
        }
    },

    Inquisition: (traveler, session) => {
        console.log('[TRIGGER] Inquisition fired by:', traveler.name);
        // TODO: implement Inquisition logic
    },

    Explanation_M: (traveler, session) => {
        console.log('[TRIGGER] Explanation_M fired by:', traveler.name);
        // TODO: implement Explanation_M logic (Nora teaches medicinal herbs usage)
    },

    undead: (traveler, session) => {
        console.log('[TRIGGER] undead fired by:', traveler.name);
        // TODO: implement undead logic
    },

    cult: (traveler, session) => {
        console.log('[TRIGGER] cult fired by:', traveler.name);
        // TODO: implement cult logic
    }
};

function executeTrigger(trigger, traveler, session) {
    if (!trigger) {
        console.warn('[TRIGGER] No trigger provided for traveler:', traveler?.name);
        return;
    }

    const handler = TRIGGER_HANDLERS[trigger];

    if (!handler) {
        console.warn('[TRIGGER] No handler found for trigger:', trigger);
        return;
    }

    handler(traveler, session);
}