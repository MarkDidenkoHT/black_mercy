/**
 * Trigger Handlers
 * 
 * Legacy system for executing game mechanics when travelers arrive.
 * 
 * For new fixed travelers with branching dialog, use the Dialog Tree system:
 * - Define dialog trees in dialog_trees.js
 * - Add the tree ID as the 'trigger' field in travelers_templates dialog column
 * - The dialog system will automatically handle branching, options, and mechanics
 * 
 * The triggers below are for special cases or legacy functionality.
 */

const TRIGGER_HANDLERS = {
    Revelation: (traveler, session) => {
        console.log('[TRIGGER] Revelation fired by:', traveler.name);
        // TODO: implement Revelation logic
    },

    Explanation_H: async (traveler, session) => {
        console.log('[TRIGGER] Explanation_H fired by:', traveler.name);
        // NOTE: This is now handled by the dialog tree system in dialog_trees.js
        // The trigger remains here for backwards compatibility only
    },

    Inquisition: (traveler, session) => {
        console.log('[TRIGGER] Inquisition fired by:', traveler.name);
        // NOTE: This is now handled by the dialog tree system in dialog_trees.js
        // The trigger remains here for backwards compatibility only
    },

    Explanation_M: (traveler, session) => {
        console.log('[TRIGGER] Explanation_M fired by:', traveler.name);
        // NOTE: This is now handled by the dialog tree system in dialog_trees.js
        // The trigger remains here for backwards compatibility only
    },

    undead: (traveler, session) => {
        console.log('[TRIGGER] undead fired by:', traveler.name);
        // NOTE: This is now handled by the dialog tree system in dialog_trees.js
        // The trigger remains here for backwards compatibility only
    },

    cult: (traveler, session) => {
        console.log('[TRIGGER] cult fired by:', traveler.name);
        // NOTE: This is now handled by the dialog tree system in dialog_trees.js
        // The trigger remains here for backwards compatibility only
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