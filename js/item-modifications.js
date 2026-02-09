/**
 * Item Modifications System
 * Framework for size and modifier effects on rolled items
 */

// SIZE MODIFICATIONS - affect item value and appearance
const ATTRIBUTE = {
    NORMAL: {
        id: 'normal',
        name: 'Normal',
        priceMultiplier: 1.0,
        chance: 0.5  // 50% chance to stay normal
    },
    TINY: {
        id: 'tiny',
        name: 'Tiny',
        priceMultiplier: 0.4,
        chance: 0.15,
        emoji: '🤏'
    },
    MICROSCOPIC: {
        id: 'microscopic',
        name: 'Microscopic',
        priceMultiplier: 0.15,
        chance: 0.05,
        emoji: '🔬'
    },
    BIG: {
        id: 'big',
        name: 'Big',
        priceMultiplier: 1.3,
        chance: 0.15,
        emoji: '📏'
    },
    HUGE: {
        id: 'huge',
        name: 'Huge',
        priceMultiplier: 1.65,
        chance: 0.1,
        emoji: '🏔️'
    },
    GARGANTUAN: {
        id: 'gargantuan',
        name: 'Gargantuan',
        priceMultiplier: 2.0,
        chance: 0.05,
        emoji: '🌍'
    }
};

// ITEM MODIFICATIONS - various effects and attributes
// Rarity: Higher number = Rarer (Probability ~ 1/Rarity)
const MODS = {
    GLOSSY: {
        id: 'glossy',
        name: 'Glossy',
        priceMultiplier: 1.2,
        rarity: 10,
        emoji: '✨',
        description: '+20% value'
    },
    ALIEN: {
        id: 'alien',
        name: 'Alien',
        priceMultiplier: 1.5,
        rarity: 15,
        emoji: '👽',
        description: '+50% value'
    },
    GOLDEN: {
        id: 'golden',
        name: 'Golden',
        priceMultiplier: 1.8,
        rarity: 25,
        emoji: '⭐',
        description: '+80% value'
    },
    ANCIENT: {
        id: 'ancient',
        name: 'Ancient',
        priceMultiplier: 1.4,
        rarity: 12,
        emoji: '🏺',
        description: '+40% value'
    },
    CURSED: {
        id: 'cursed',
        name: 'Cursed',
        priceMultiplier: 0.7,
        rarity: 15,
        emoji: '💀',
        description: '-30% value (unlucky!)'
    },
    HOLOGRAPHIC: {
        id: 'holographic',
        name: 'Holographic',
        priceMultiplier: 1.35,
        rarity: 11,
        emoji: '🌈',
        description: '+35% value'
    },
    RADIOACTIVE: {
        id: 'radioactive',
        name: 'Radioactive',
        priceMultiplier: 1.25,
        rarity: 18,
        emoji: '☢️',
        description: '+25% value (risky!)'
    },
    PRISMATIC: {
        id: 'prismatic',
        name: 'Prismatic',
        priceMultiplier: 2.0,
        rarity: 40,
        emoji: '🎆',
        description: '+100% value (rare!)'
    },
    CORRUPTED: {
        id: 'corrupted',
        name: 'Corrupted',
        priceMultiplier: 0.5,
        rarity: 20,
        emoji: '⚫',
        description: '-50% value'
    },
    ETHEREAL: {
        id: 'ethereal',
        name: 'Ethereal',
        priceMultiplier: 1.6,
        rarity: 18,
        emoji: '👻',
        description: '+60% value'
    },
    BLESSED: {
        id: 'blessed',
        name: 'Blessed',
        priceMultiplier: 1.7,
        rarity: 16,
        emoji: '✨',
        description: '+70% value'
    },
    SHADOWY: {
        id: 'shadowy',
        name: 'Shadowy',
        priceMultiplier: 0.85,
        rarity: 12,
        emoji: '🌑',
        description: '-15% value'
    }
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
        let weight = mod.chance;
        
        // Luck affects size selection
        if (luck > 0) {
            if (mod.priceMultiplier > 1.0) {
                // Good size: boost chance
                weight *= (1 + luck * 0.1);
            } else if (mod.priceMultiplier < 1.0) {
                // Bad size: reduce chance
                weight *= Math.max(0.1, 1 - (luck * 0.05));
            }
        }
        return { mod, weight };
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

    const { modChanceBoost = 1.0, rng = Math.random, guaranteedMods = [], luck = 0, rarityMultipliers = {} } = options;
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
    
    // If we already have guaranteed mods, ensure we respect that but maybe add more if lucky
    targetModCount = Math.max(targetModCount, selectedMods.length);
    
    const needed = targetModCount - selectedMods.length;

    // Select random mods based on their individual chances
    let availableMods = [...modArray].filter(m => !selectedMods.some(sm => sm.id === m.id));
    
    for (let i = 0; i < needed && availableMods.length > 0; i++) {
        // Calculate weights from rarity (Higher rarity = Lower weight)
        // weight = 100 / rarity
        const weightedMods = availableMods.map(mod => {
            // Base weight from rarity (default to 10 if missing)
            let rarity = mod.rarity || 10;
            
            // Apply rarity multipliers from perks
            if (rarityMultipliers[mod.id]) {
                rarity *= rarityMultipliers[mod.id];
            }
            
            let weight = 100 / rarity;
            
            // Apply modChanceBoost
            weight *= modChanceBoost;
            
            // Luck affects specific mod selection
            if (luck > 0) {
                if (mod.priceMultiplier > 1.0) {
                    // Good mod: boost weight
                    weight *= (1 + luck * 0.1);
                } else if (mod.priceMultiplier < 1.0) {
                    // Bad mod: reduce weight
                    weight *= Math.max(0.1, 1 - (luck * 0.05));
                }
            }
            return { mod, weight };
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
    
    // Calculate price multiplier from all mods using additive formula
    // Formula: attribute * (1 + sum(mod_bonuses))
    let modBonusSum = 0;
    mods.forEach(mod => {
        modBonusSum += (mod.priceMultiplier - 1);
    });
    
    // Safety clamp to prevent negative multipliers if many bad mods stack
    const modMultiplier = Math.max(0.01, 1 + modBonusSum);
    
    let priceMultiplier = attribute.priceMultiplier * modMultiplier;
    
    return {
        ...item,
        baseValue: item.value,
        value: Math.round(item.value * priceMultiplier),
        attribute: attribute,
        mods: mods,
        priceMultiplier: priceMultiplier
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
