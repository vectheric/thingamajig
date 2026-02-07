/**
 * Item Modifications System
 * Framework for size and modifier effects on rolled items
 */

// SIZE MODIFICATIONS - affect item value and appearance
const SIZE_MODS = {
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
const MODS = {
    GLOSSY: {
        id: 'glossy',
        name: 'Glossy',
        priceMultiplier: 1.2,
        chance: 0.12,
        emoji: '✨',
        description: '+20% value'
    },
    ALIEN: {
        id: 'alien',
        name: 'Alien',
        priceMultiplier: 1.5,
        chance: 0.08,
        emoji: '👽',
        description: '+50% value'
    },
    GOLDEN: {
        id: 'golden',
        name: 'Golden',
        priceMultiplier: 1.8,
        chance: 0.06,
        emoji: '⭐',
        description: '+80% value'
    },
    ANCIENT: {
        id: 'ancient',
        name: 'Ancient',
        priceMultiplier: 1.4,
        chance: 0.09,
        emoji: '🏺',
        description: '+40% value'
    },
    CURSED: {
        id: 'cursed',
        name: 'Cursed',
        priceMultiplier: 0.7,
        chance: 0.08,
        emoji: '💀',
        description: '-30% value (unlucky!)'
    },
    HOLOGRAPHIC: {
        id: 'holographic',
        name: 'Holographic',
        priceMultiplier: 1.35,
        chance: 0.1,
        emoji: '🌈',
        description: '+35% value'
    },
    RADIOACTIVE: {
        id: 'radioactive',
        name: 'Radioactive',
        priceMultiplier: 1.25,
        chance: 0.07,
        emoji: '☢️',
        description: '+25% value (risky!)'
    },
    PRISMATIC: {
        id: 'prismatic',
        name: 'Prismatic',
        priceMultiplier: 2.0,
        chance: 0.04,
        emoji: '🎆',
        description: '+100% value (rare!)'
    },
    CORRUPTED: {
        id: 'corrupted',
        name: 'Corrupted',
        priceMultiplier: 0.5,
        chance: 0.06,
        emoji: '⚫',
        description: '-50% value'
    },
    ETHEREAL: {
        id: 'ethereal',
        name: 'Ethereal',
        priceMultiplier: 1.6,
        chance: 0.07,
        emoji: '👻',
        description: '+60% value'
    },
    BLESSED: {
        id: 'blessed',
        name: 'Blessed',
        priceMultiplier: 1.7,
        chance: 0.08,
        emoji: '✨',
        description: '+70% value'
    },
    SHADOWY: {
        id: 'shadowy',
        name: 'Shadowy',
        priceMultiplier: 0.85,
        chance: 0.1,
        emoji: '🌑',
        description: '-15% value'
    }
};

/**
 * Get random size modification based on chance weights
 * @returns {Object} size modification object
 */
function getRandomSizeMod() {
    const mods = Object.values(SIZE_MODS);
    const totalChance = mods.reduce((sum, mod) => sum + mod.chance, 0);
    let random = Math.random() * totalChance;
    
    for (let mod of mods) {
        random -= mod.chance;
        if (random <= 0) return { ...mod };
    }
    
    return { ...SIZE_MODS.NORMAL };
}

/**
 * Get random item modifications (can have 0-2 mods)
 * @param {number} modChanceBoost - bonus chance multiplier from perks (e.g., 1.5 = +50%)
 * @returns {Array} array of modification objects
 */
function getRandomMods(modChanceBoost = 1.0) {
    const modArray = Object.values(MODS);
    const selectedMods = [];
    
    // Adjust mod count chances based on boost
    // Base: 40% for 1 mod, 15% for 2 mods, 45% for 0 mods
    const baseChance = Math.random();
    const modChance1 = 0.4 * modChanceBoost;
    const modChance2 = 0.15 * modChanceBoost;
    
    const modCount = baseChance < modChance1 ? 1 : baseChance < (modChance1 + modChance2) ? 2 : 0;
    
    // Select random mods based on their individual chances
    const availableMods = [...modArray];
    
    for (let i = 0; i < modCount && availableMods.length > 0; i++) {
        const totalChance = availableMods.reduce((sum, mod) => sum + mod.chance * modChanceBoost, 0);
        let random = Math.random() * totalChance;
        
        for (let j = 0; j < availableMods.length; j++) {
            random -= availableMods[j].chance * modChanceBoost;
            if (random <= 0) {
                selectedMods.push({ ...availableMods[j] });
                availableMods.splice(j, 1);
                break;
            }
        }
    }
    
    return selectedMods;
}

/**
 * Apply modifications to an item
 * @param {Object} item - base item object
 * @param {number} modChanceBoost - bonus chance multiplier from perks
 * @returns {Object} modified item with size and mods
 */
function applyModifications(item, modChanceBoost = 1.0) {
    const sizeMod = getRandomSizeMod();
    const mods = getRandomMods(modChanceBoost);
    
    // Calculate price multiplier from all mods
    let priceMultiplier = sizeMod.priceMultiplier;
    mods.forEach(mod => {
        priceMultiplier *= mod.priceMultiplier;
    });
    
    return {
        ...item,
        baseValue: item.value,
        value: Math.round(item.value * priceMultiplier),
        sizeMod: sizeMod,
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
    if (item.sizeMod && item.sizeMod.id !== 'normal') {
        name = `${item.sizeMod.emoji} ${item.sizeMod.name} ${name}`;
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
    
    if (item.sizeMod && item.sizeMod.id !== 'normal') {
        allMods.push(item.sizeMod);
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
