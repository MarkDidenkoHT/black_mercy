module.exports = function initDialogHelpers(supabase) {
    async function getPlayerAndSession(chatId) {
        const { data: player } = await supabase
            .from('players')
            .select('*')
            .eq('chat_id', chatId)
            .single();
        if (!player) return null;

        const { data: session } = await supabase
            .from('sessions')
            .select('*')
            .eq('player', player.id)
            .eq('active', true)
            .single();
        if (!session) return null;

        return { player, session };
    }

    async function addInventory(playerId, sessionId, items) {
        const { data: inventory } = await supabase
            .from('inventory')
            .select('*')
            .eq('player', playerId)
            .eq('session', sessionId)
            .single();
        if (!inventory) return null;

        const updatedItems = { ...inventory.items };
        Object.entries(items || {}).forEach(([key, value]) => {
            const amount = Number(value) || 0;
            updatedItems[key] = Math.max(0, (updatedItems[key] || 0) + amount);
        });

        await supabase
            .from('inventory')
            .update({ items: updatedItems })
            .eq('id', inventory.id);

        return updatedItems;
    }

    async function unlockStructure(playerId, sessionId, structureTemplateId) {
        const { data: structure } = await supabase
            .from('structures')
            .select('*')
            .eq('player', playerId)
            .eq('session', sessionId)
            .eq('structure', structureTemplateId)
            .single();
        if (!structure) return false;

        if (!structure.is_active) {
            await supabase
                .from('structures')
                .update({ is_active: true })
                .eq('id', structure.id);
        }

        return true;
    }

    async function addInteraction(playerId, sessionId, interaction) {
        const { data: session } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
        if (!session) return null;

        const current = session.available_interactions || [];
        if (!current.includes(interaction)) {
            const updated = [...current, interaction];
            await supabase
                .from('sessions')
                .update({ available_interactions: updated })
                .eq('id', sessionId);
            return updated;
        }

        return current;
    }

    async function logEvent(playerId, sessionId, event) {
        if (!event) return null;
        await supabase
            .from('events')
            .insert([{ player: playerId, session: sessionId, event }]);
        return event;
    }

    async function modifyReputation(playerId, sessionId, changes) {
        const { data: reputation } = await supabase
            .from('reputation')
            .select('*')
            .eq('player', playerId)
            .eq('session', sessionId)
            .single();
        if (!reputation) return null;

        const currentHiddenRep = reputation.hidden_reputation || { cult: 0, inquisition: 0, undead: 0 };
        const updatedRep = {
            cult: (currentHiddenRep.cult || 0) + ((changes && changes.cult) || 0),
            inquisition: (currentHiddenRep.inquisition || 0) + ((changes && changes.inquisition) || 0),
            undead: (currentHiddenRep.undead || 0) + ((changes && changes.undead) || 0)
        };

        await supabase
            .from('reputation')
            .update({ hidden_reputation: updatedRep })
            .eq('id', reputation.id);

        return updatedRep;
    }

    async function recruitHero(playerId, sessionId, hero) {
        if (!hero) return null;

        const { data: traveler } = await supabase
            .from('travelers')
            .select('hero_data')
            .eq('session', sessionId)
            .eq('player', playerId)
            .contains('hero_data', { hero })
            .single();
        if (!traveler || !traveler.hero_data) return null;

        const { data: existingHero } = await supabase
            .from('heroes')
            .select('id')
            .eq('session', sessionId)
            .eq('hero', hero)
            .single();
        if (existingHero) return null;

        const heroData = traveler.hero_data;
        const { data: newHero } = await supabase
            .from('heroes')
            .insert([{
                session: sessionId,
                hero: heroData.hero,
                stats: heroData.stats,
                reputation: heroData.reputation,
                talents: heroData.talents,
                art: heroData.art
            }])
            .select()
            .single();

        return newHero;
    }

    async function applyDialogActions(playerId, sessionId, actions) {
        const output = {};

        for (const action of actions || []) {
            const { id, params } = action;
            if (id === 'give_items') {
                output.inventory = await addInventory(playerId, sessionId, params?.items || {});
                continue;
            }
            if (id === 'unlock_structure') {
                await unlockStructure(playerId, sessionId, params?.structureTemplateId);
                continue;
            }
            if (id === 'unlock_interaction') {
                output.available_interactions = await addInteraction(playerId, sessionId, params?.interaction);
                continue;
            }
            if (id === 'log_event') {
                output.event = await logEvent(playerId, sessionId, params?.event);
                continue;
            }
            if (id === 'modify_reputation') {
                output.hidden_reputation = await modifyReputation(playerId, sessionId, params?.changes || {});
                continue;
            }
            if (id === 'recruit_hero') {
                const recruited = await recruitHero(playerId, sessionId, params?.hero);
                if (recruited) output.recruited_hero = recruited.hero;
                continue;
            }
        }

        return output;
    }

    return {
        getPlayerAndSession,
        applyDialogActions,
        addInventory,
        unlockStructure,
        addInteraction,
        logEvent,
        modifyReputation,
        recruitHero
    };
};
