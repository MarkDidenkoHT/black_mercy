const TRIGGER_HANDLERS = {
    Revelation: (traveler, session) => {
        console.log('[TRIGGER] Revelation fired by:', traveler.name);
        // TODO: implement Revelation logic
    },

    Explanation_H: (traveler, session) => {
        console.log('[TRIGGER] Explanation_H fired by:', traveler.name);
        // TODO: implement Explanation_H logic (Mithrail teaches how to detect humans)
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