
// Helper functions for Perk System

function checkPerkConditions(perk, gameState, ownedPerks) {
    if (!perk || !perk.conditions) return true;
    
    for (const condition of perk.conditions) {
        // Unlock Conditions (stats, items, etc.)
        if (condition.type === 'unlock') {
            const cond = condition.condition;
            if (!cond) continue;
            
            if (cond.type === 'stat_threshold') {
                const statVal = (cond.stat === 'round') ? gameState.round : (gameState.stats[cond.stat] || 0);
                const threshold = cond.threshold || 0;
                const compare = cond.compare || 'greater'; // default to >=
                
                if (compare === 'less') {
                    if (statVal >= threshold) return false;
                } else {
                    if (statVal < threshold) return false;
                }
            } else if (cond.type === 'item_collected') {
                // Check if item has been collected in this run
                const hasItem = gameState.itemHistory && gameState.itemHistory.some(i => i.id === cond.itemId);
                if (!hasItem) return false;
            }
        } 
        // Requirement Conditions (other perks)
        else if (condition.type === 'requirePerk') {
            const reqIds = Array.isArray(condition.perkId) ? condition.perkId : [condition.perkId];
            for (const id of reqIds) {
                if (!ownedPerks[id]) return false;
            }
        }
        // Note: 'bonus_trigger' and 'forging' are not "unlock" conditions in the sense of visibility/availability logic here
        // 'bonus_trigger' is checked during gameplay (getAttributes)
        // 'forging' is checked during forging action
    }
    
    return true;
}

function getPerkById(perkId) {
    if (typeof PERKS !== 'undefined') {
        // First try direct access (if key matches ID)
        if (PERKS[perkId]) return PERKS[perkId];
        // Then try finding by id property
        return Object.values(PERKS).find(p => p.id === perkId);
    }
    return null;
}

function getBossPerkById(perkId) {
    // Assuming boss perks might be in a separate BOSS_PERKS object or mixed in PERKS
    // For now, check PERKS
    if (typeof PERKS !== 'undefined') {
        return PERKS[perkId];
    }
    return null;
}
