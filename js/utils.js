
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
                // Extended: itemId + optional modifiers/attributes filtering
                const wantedItemId = cond.itemId;
                const wantedMods = Array.isArray(cond.modifier) ? cond.modifier
                                  : (cond.modifier ? [cond.modifier] : (cond.modifiers ? (Array.isArray(cond.modifiers) ? cond.modifiers : [cond.modifiers]) : []));
                const wantedAttr = cond.attribute || cond.attributeId;
                
                const match = (entry) => {
                    // Base id match if provided
                    if (wantedItemId && entry.id !== wantedItemId) return false;
                    // Modifiers match: all required mods must be present
                    if (wantedMods && wantedMods.length > 0) {
                        const have = entry.mods || [];
                        for (const m of wantedMods) {
                            if (!have.includes(m)) return false;
                        }
                    }
                    // Attribute match
                    if (wantedAttr && entry.attribute !== wantedAttr) return false;
                    return true;
                };
                
                const hasMatch = Array.isArray(gameState.itemHistory) && gameState.itemHistory.some(match);
                if (!hasMatch) return false;
            } else if (cond.type === 'modifier_collected') {
                // Check if any collected item had the given modifier
                const modId = cond.modID || cond.modId || cond.modifier;
                if (!modId) continue;
                const hasMod = Array.isArray(gameState.itemHistory) && gameState.itemHistory.some(entry => (entry.mods || []).includes(modId));
                if (!hasMod) return false;
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
