class DialogTree {
    constructor(treeId, treeData) {
        this.treeId = treeId;
        this.data = treeData;
        this.currentNodeId = 'start';
        this.history = [];
    }

    getCurrentNode() {
        return this.data[this.currentNodeId];
    }

    getText() {
        const node = this.getCurrentNode();
        return node?.text || '';
    }

    getOptions() {
        const node = this.getCurrentNode();
        return node?.options || [];
    }

    selectOption(optionIndex) {
        const node = this.getCurrentNode();
        const option = node?.options?.[optionIndex];

        if (!option) return null;

        this.history.push(this.currentNodeId);

        if (option.end) {
            this.currentNodeId = 'end';
            return { end: true, actions: option.actions || [] };
        }

        if (option.next) {
            this.currentNodeId = option.next;
            const nextNode = this.getCurrentNode();
            return { 
                nodeId: this.currentNodeId,
                text: nextNode?.text,
                options: nextNode?.options || [],
                actions: option.actions || [],
                condition: option.condition
            };
        }

        return null;
    }

    isEnded() {
        return this.currentNodeId === 'end';
    }

    reset() {
        this.currentNodeId = 'start';
        this.history = [];
    }
}


const DialogActions = {

    give_items: async (params) => {
        try {
            const response = await fetch('/api/inventory/give', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: currentPlayer.chat_id,
                    items: params.items || {}
                })
            });
            if (!response.ok) throw new Error('Failed to give items');
            const data = await response.json();
            if (data.success) {
                currentInventory = data.inventory;
                renderInventory();
            }
            return { success: true, data };
        } catch (error) {
            console.error('[DIALOG] give_items error:', error);
            return { success: false, error };
        }
    },


    unlock_structure: async (params) => {
        try {
            const response = await fetch('/api/structures/set-active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: currentPlayer.chat_id,
                    structureTemplateId: params.structureTemplateId
                })
            });
            if (!response.ok) throw new Error('Failed to unlock structure');
            return await response.json();
        } catch (error) {
            console.error('[DIALOG] unlock_structure error:', error);
            return { success: false, error };
        }
    },


    unlock_interaction: async (params) => {
        try {
            const response = await fetch('/api/session/add-interaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: currentPlayer.chat_id,
                    interaction: params.interaction
                })
            });
            if (!response.ok) throw new Error('Failed to unlock interaction');
            const data = await response.json();
            if (data.success) {
                currentAvailableInteractions = data.available_interactions;
                if (typeof buildDynamicActionButtons === 'function') buildDynamicActionButtons();
            }
            return data;
        } catch (error) {
            console.error('[DIALOG] unlock_interaction error:', error);
            return { success: false, error };
        }
    },


    log_event: async (params) => {
        try {
            const response = await fetch('/api/events/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: currentPlayer.chat_id,
                    event: params.event || ''
                })
            });
            const data = await response.json();
            if (data.success) {
                currentEvents.push({ event: params.event });
                renderEvents();
            }
            return data;
        } catch (error) {
            console.error('[DIALOG] log_event error:', error);
            return { success: false, error };
        }
    },


    check_supplies: async (params) => {
        const required = params.items || {};
        const missing = [];

        for (const [item, minQty] of Object.entries(required)) {
            const current = currentInventory[item] || 0;
            if (current < minQty) {
                missing.push({ item, required: minQty, current });
            }
        }

        if (missing.length > 0) {
            return { 
                success: false, 
                message: 'Not enough supplies. You have failed to protect your town.',
                missing,
                gameOverRequired: true
            };
        }

        return { success: true, message: 'You have sufficient supplies.' };
    },


    check_population: async (params) => {
        const total = (currentPopulation.human || 0) 
                    + (currentPopulation.infected || 0) 
                    + (currentPopulation.possessed || 0);
        
        if (total < (params.minPopulation || 1)) {
            return {
                success: false,
                message: 'Your town is empty. All is lost.',
                current: total,
                required: params.minPopulation,
                gameOverRequired: true
            };
        }

        return { success: true, message: 'Your town still stands.' };
    },


    trigger_ending: async (params) => {
        const ending = params.ending || 'defeat';
        const message = params.message || 'Your journey ends here.';
        
        console.log(`[DIALOG] Game ${ending.toUpperCase()}: ${message}`);

        // TODO: Implement game ending screen
        alert(`GAME ${ending.toUpperCase()}: ${message}`);

        return { success: true, ending, message };
    },


    recruit_hero: async (params) => {
        try {
            const response = await fetch('/api/heroes/recruit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: currentPlayer.chat_id,
                    hero: params.hero,
                    reputation: params.reputation || {}
                })
            });
            if (!response.ok) throw new Error('Failed to recruit hero');
            const data = await response.json();
            if (data.success) {
                currentHiddenReputation = data.hidden_reputation;
                currentEvents.push({ event: `${params.hero} has joined your cause.` });
                renderEvents();
            }
            return { success: true, data };
        } catch (error) {
            console.error('[DIALOG] recruit_hero error:', error);
            return { success: false, error };
        }
    },


    modify_reputation: async (params) => {
        try {
            const response = await fetch('/api/session/modify-reputation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: currentPlayer.chat_id,
                    changes: params.changes || {}
                })
            });
            if (!response.ok) throw new Error('Failed to modify reputation');
            const data = await response.json();
            if (data.success) {
                currentHiddenReputation = data.hidden_reputation;
            }
            return data;
        } catch (error) {
            console.error('[DIALOG] modify_reputation error:', error);
            return { success: false, error };
        }
    }
};


async function executeDialogAction(actionId, params = {}) {
    const action = DialogActions[actionId];
    if (!action) {
        console.warn('[DIALOG] Unknown action:', actionId);
        return null;
    }

    return await action(params);
}


async function executeDialogActions(actions = []) {
    const results = [];
    
    for (const action of actions) {
        let actionId = action;
        let params = {};

        if (typeof action === 'object') {
            actionId = action.id || action.action;
            params = action.params || {};
        }

        const result = await executeDialogAction(actionId, params);
        results.push({ actionId, result });
    }

    return results;
}
