/**
 * Item Modifications System
 * Framework for size and modifier effects on rolled items
 */

// SIZE MODIFICATIONS - affect item value and appearance
const ATTRIBUTE = {
    NORMAL: {
        id: 'normal',
        name: 'Normal',
        modValue: 1.0,
        rarity: 10  // 50% chance (Base)
    },
    TINY: {
        id: 'tiny',
        name: 'Tiny',
        modValue: 0.4,
        rarity: 33, // ~15% chance
        emoji: '🤏'
    },
    MICROSCOPIC: {
        id: 'microscopic',
        name: 'Microscopic',
        modValue: 0.2,
        rarity: 100, // ~5% chance
        emoji: '🔬'
    },
    BIG: {
        id: 'big',
        name: 'Big',
        modValue: 1.3,
        rarity: 33, // ~15% chance
        emoji: '📏'
    },
    HUGE: {
        id: 'huge',
        name: 'Huge',
        modValue: 1.65,
        rarity: 50, // ~10% chance
        emoji: '🏔️'
    },
    GARGANTUAN: {
        id: 'gargantuan',
        name: 'Gargantuan',
        modValue: 2.0,
        rarity: 100, // ~5% chance
        emoji: '🌍'
    }
};

// ITEM MODIFICATIONS - various effects and attributes
// Rarity: Higher number = Rarer (Probability ~ 1/Rarity)
const MODS = {
    GLOSSY: {
        id: 'glossy',
        name: 'Glossy',
        modValue: 1.2,
        rarity: 10,
        emoji: '✨',
        description: '+20% value'
    },
    ALIEN: {
        id: 'alien',
        name: 'Alien',
        modValue: 1.5,
        rarity: 15,
        emoji: '👽',
        description: '+50% value'
    },
    GOLDEN: {
        id: 'golden',
        name: 'Golden',
        modValue: 2,
        rarity: 25,
        emoji: '⭐',
        description: '+200% value'
    },
    ANCIENT: {
        id: 'ancient',
        name: 'Ancient',
        modValue: 1.4,
        rarity: 12,
        emoji: '🏺',
        description: '+40% value'
    },
    CURSED: {
        id: 'cursed',
        name: 'Cursed',
        modValue: 0.7,
        rarity: 15,
        emoji: '💀',
        description: '-30% value (unlucky)'
    },
    HOLOGRAPHIC: {
        id: 'holographic',
        name: 'Holographic',
        modValue: 0.35,
        rarity: 11,
        emoji: '🌈',
        description: '+35% value'
    },
    RADIOACTIVE: {
        id: 'radioactive',
        name: 'Radioactive',
        modValue: 0.25,
        rarity: 18,
        emoji: '☢️',
        description: '+25% value (risky)',
        requiresPerk: 'hazmat_suit'
    },
    PRISMATIC: {
        id: 'prismatic',
        name: 'Prismatic',
        modValue: 1.0,
        rarity: 40,
        emoji: '🎆',
        description: '+100% value (rare)'
    },
    CORRUPTED: {
        id: 'corrupted',
        name: 'Corrupted',
        modValue: -0.5,
        rarity: 20,
        emoji: '⚫',
        description: '-50% value'
    },
    ECTOPLASMIC: {
        id: 'ectoplasmic',
        name: 'Ectoplasmic',
        modValue: 1.6,
        rarity: 18,
        emoji: '👻',
        description: '+20% value',
        requiresPerk: 'spirit_sight'
    },
    BLESSED: {
        id: 'blessed',
        name: 'Blessed',
        modValue: 0.7,
        rarity: 16,
        emoji: '✨',
        description: '+70% value'
    },
    SHADOWY: {
        id: 'shadowy',
        name: 'Shadowy',
        modValue: -0.15,
        rarity: 12,
        emoji: '🌑',
        description: '-15% value'
    },
    ENCHANTED: {
        id: 'enchanted',
        name: 'enchanted',
        modValue: 10, // +1000% value -> 11x multiplier (10 bonus)
        rarity: 0, // High rarity, but controlled by perk requirement
        emoji: '✨',
        description: '1000% value',
        requiresPerk: 'enchanted_table'
    },
};

/**
 * Get random size modification based on chance weights
 * @param {Function} rng - random number generator
 * @param {number} luck - luck stat for better sizes
 * @returns {Object} size modification object
 */
function getRandomAttribute(rng = Math.random, luck = 0) {
    const mods = Object.values(ATTRIBUTE);
    
    // Calculate total chance with luck adjustments
    const weightedMods = mods.map(mod => {
        let rarity = mod.rarity || 10;
        
        // Luck affects size selection (modifying rarity)
        if (luck > 0) {
            if (mod.modValue > 1.0) {
                // Good size: Reduce rarity (more common)
                const luckFactor = 1 + (luck * 0.1);
                rarity /= luckFactor;
            } else if (mod.modValue < 1.0) {
                // Bad size: Increase rarity (rarer)
                const luckProtection = 1 + (luck * 0.05);
                rarity *= luckProtection;
            }
        }

        // Calculate probability weight from rarity
        const probabilityWeight = 100 / Math.max(1, rarity);
        
        return { mod, weight: probabilityWeight };
    });

    const totalChance = weightedMods.reduce((sum, item) => sum + item.weight, 0);
    let random = rng() * totalChance;
    
    for (let item of weightedMods) {
        random -= item.weight;
        if (random <= 0) return { ...item.mod };
    }
    
    return { ...ATTRIBUTE.NORMAL };
}

/**
 * Get random item modifications (can have 0-2 mods)
 * @param {Object} options - { modChanceBoost, rng, guaranteedMods, luck }
 * @returns {Array} array of modification objects
 */
function getRandomMods(options = {}) {
    // Legacy support
    if (typeof options === 'number') {
        options = {
            modChanceBoost: options,
            rng: arguments[1] || Math.random
        };
    }

    const { modChanceBoost = 1.0, rng = Math.random, guaranteedMods = [], luck = 0, rarityMultipliers = {}, ownedPerks = {} } = options;
    const modArray = Object.values(MODS);
    const selectedMods = [];
    
    // Add guaranteed mods first
    if (guaranteedMods && guaranteedMods.length > 0) {
        guaranteedMods.forEach(modId => {
            const mod = modArray.find(m => m.id === modId);
            if (mod) selectedMods.push({ ...mod });
        });
    }

    // Determine how many random mods to add
    // Base: 40% for 1 mod, 15% for 2 mods, 45% for 0 mods
    // Luck also boosts chance of getting more mods slightly
    const luckModChanceBoost = luck > 0 ? (1 + luck * 0.05) : 1.0;
    
    const baseChance = rng();
    const modChance1 = 0.4 * modChanceBoost * luckModChanceBoost;
    const modChance2 = 0.15 * modChanceBoost * luckModChanceBoost;
    
    let targetModCount = baseChance < modChance1 ? 1 : baseChance < (modChance1 + modChance2) ? 2 : 0;
    
    // Fix: Make random mods additive to guaranteed mods (allow stacking)
    // Random mods are now IN ADDITION to guaranteed ones
    const needed = targetModCount;

    // Select random mods based on their individual chances
    let availableMods = [...modArray].filter(m => {
        // Prevent spawning if rarity is 0 (disabled)
        if (m.rarity === 0) return false;

        // Check for required perk to unlock this mod
        if (m.requiresPerk && !ownedPerks[m.requiresPerk]) return false;

        // Legacy special case: Enchanted requires Enchanted Table perk
        // (Can be refactored to use requiresPerk in definition)
        return !selectedMods.some(sm => sm.id === m.id);
    });
    
    for (let i = 0; i < needed && availableMods.length > 0; i++) {
        // Calculate probability weights from rarity (Higher rarity = Lower weight)
        // weight = 100 / rarity
        const weightedMods = availableMods.map(mod => {
            // Base rarity (higher = rarer)
            let rarity = mod.rarity || 10;
            
            // Apply rarity multipliers from perks (e.g. Hex Breaker increases rarity of Cursed items)
            if (rarityMultipliers[mod.id]) {
                rarity *= rarityMultipliers[mod.id];
            }
            
            // Luck Mitigation: Apply luck to Rarity directly
            // Higher luck = Lower rarity for good items (making them more common)
            // Higher luck = Higher rarity for bad items (making them rarer)
            if (luck > 0) {
                if (mod.modValue > 1.0) {
                    // Good mod: Reduce rarity to make it more common
                    // e.g. Luck 10 -> 2x boost -> Rarity / 2
                    const luckFactor = 1 + (luck * 0.1);
                    rarity /= luckFactor;
                } else if (mod.modValue < 1.0) {
                    // Bad mod: Increase rarity to make it rarer
                    // e.g. Luck 10 -> 1.5x boost -> Rarity * 1.5
                    const luckProtection = 1 + (luck * 0.05);
                    rarity *= luckProtection;
                }
            }
            
            // Calculate final probability weight
            // Inverse of Rarity
            let probabilityWeight = 100 / Math.max(0.1, rarity);
            
            // Apply modChanceBoost (Global multiplier)
            probabilityWeight *= modChanceBoost;
            
            return { mod, weight: probabilityWeight };
        });

        const totalWeight = weightedMods.reduce((sum, item) => sum + item.weight, 0);
        let random = rng() * totalWeight;
        
        for (let j = 0; j < weightedMods.length; j++) {
            random -= weightedMods[j].weight;
            if (random <= 0) {
                selectedMods.push({ ...weightedMods[j].mod });
                // Remove selected from available for next iteration
                availableMods = availableMods.filter(m => m.id !== weightedMods[j].mod.id);
                break;
            }
        }
    }
    
    return selectedMods;
}

/**
 * Apply modifications to an item
 * @param {Object} item - base item object
 * @param {Object} options - { modChanceBoost, rng, guaranteedMods, luck }
 * @returns {Object} modified item with size and mods
 */
function applyModifications(item, options = {}) {
    // Legacy support
    if (typeof options === 'number') {
        options = {
            modChanceBoost: options,
            rng: arguments[2] || Math.random
        };
    }
    
    const { modChanceBoost = 1.0, rng = Math.random, luck = 0 } = options;
    const attribute = getRandomAttribute(rng, luck);
    const mods = getRandomMods(options);
    
    // Calculate price multiplier from all mods using additive options
    // options: attribute * (1 + sum(mod_bonuses) + sum(perk_bonuses))
    let modBonusSum = 0;
    mods.forEach(mod => {
        modBonusSum += mod.modValue ;
    });
    
    // Add global value bonus from perks
    if (options.valueBonus) {
        modBonusSum += options.valueBonus;
    }

    // Safety clamp to prevent negative multipliers if many bad mods stack
    const modMultiplier = Math.max(1, 1 + modBonusSum);
    
    let modValue = attribute.modValue * modMultiplier;
    
    return {
        ...item,
        baseValue: item.value,
        value: Math.round(item.value * modValue),
        attribute: attribute,
        mods: mods,
        modValue: modValue
    };
}

/**
 * Get display name for an item with modifications
 * @param {Object} item - item with mods
 * @returns {string} formatted name
 */
function getModifiedItemName(item) {
    let name = item.name;
    
    // Add size prefix if not normal
    if (item.attribute && item.attribute.id !== 'normal') {
        name = `${item.attribute.emoji} ${item.attribute.name} ${name}`;
    }
    
    return name;
}

/**
 * Get all modifications for display (size + mods)
 * @param {Object} item - item with mods
 * @returns {Array} array of all active modifications
 */
function getAllModifications(item) {
    const allMods = [];
    
    if (item.attribute && item.attribute.id !== 'normal') {
        allMods.push(item.attribute);
    }
    
    if (item.mods && item.mods.length > 0) {
        allMods.push(...item.mods);
    }
    
    return allMods;
}

/**
 * Get modification badge HTML for UI
 * @param {Object} mod - modification object
 * @returns {string} HTML badge
 */
function getModBadgeHtml(mod) {
    return `<span class="mod-badge" title="${mod.description || ''}">${mod.emoji || ''} ${mod.name}</span>`;
}
