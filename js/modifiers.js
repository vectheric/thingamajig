/**
 * Item Modifications System
 * Framework for size and modifier effects on rolled items
 */

// SIZE MODIFICATIONS - affect item value and appearance
// Kept as is, but keys might need to be lowercase if we want consistency, 
// but user only specified "for modifiers". 
// I will keep ATTRIBUTE uppercase keys for now to avoid breaking too much, 
// but ensure IDs match keys if possible.
const ATTRIBUTE = {
    normal: {
        name: 'Normal',
        value: 1.0,
        rarity: 10
    },
    small: {
        name: 'Small',
        value: 0.8,
        rarity: 40,
        color: '#f14f3aff'
    },
    tiny: {
        name: 'Tiny',
        value: 0.6,
        rarity: 33,
        color: '#f14f3aff'
    },
    microscopic: {
        name: 'Microscopic',
        value: 0.35,
        rarity: 120,
        color: '#fa1515ff'
    },
    big: {
        name: 'Big',
        value: 1.3,
        rarity: 33,
        color: '#74e716ff'
    },
    huge: {
        name: 'Huge',
        value: 1.65,
        rarity: 50,
        color: '#4bf520ff'
    },
    gigantic: {
        name: 'Gigantic',
        value: 1.75,
        rarity: 125,
        color: '#21fa1aff'
    },
    titanic: {
        name: 'Titanic',
        value: 2,
        rarity: 125,
        color: '#1cd616ff'
    },
    gargantuan: {
        name: 'Gargantuan',
        value: 2.5,
        rarity: 125,
        color: '#08b602ff'
    }
};

// Add ID property to each attribute to match key (for backward compatibility)
Object.keys(ATTRIBUTE).forEach(key => {
    ATTRIBUTE[key].id = key;
});

// ITEM MODIFICATIONS
// New Schema: key = id
const MODS = {
    glossy: {
        name: 'Glossy',
        multi: 1.2,
        color: '#22d3ee',
        rarity: 10, // Preserved for spawning logic
        description: '+20% value'
    },
    alien: {
        name: 'Alien',
        multi: 1.5,
        color: '#4ade80',
        rarity: 15,
        description: '+50% value'
    },
    golden: {
        name: 'Golden',
        multi: 2,
        color: '#facc15',
        rarity: 25,
        description: '+200% value'
    },
    ancient: {
        name: 'Ancient',
        multi: 1.4,
        color: '#d6d3d1',
        rarity: 12,
        description: '+40% value'
    },
    cursed: {
        name: 'Cursed',
        multi: 0.7, // -30% = 0.7x
        color: '#9ca3af',
        rarity: 15,
        description: '-30% value (unlucky)'
    },
    holographic: {
        name: 'Holographic',
        multi: 1.35,
        color: '#e879f9',
        rarity: 11,
        description: '+35% value'
    },
    radioactive: {
        name: 'Radioactive',
        multi: 1.25,
        color: '#a3e635',
        rarity: 18,
        description: '+25% value (risky)',
        requiresPerk: 'hazmat_suit'
    },
    prismatic: {
        name: 'Prismatic',
        multi: 2.0, // +100%
        color: '#f472b6',
        rarity: 40,
        description: '+100% value (rare)'
    },
    corrupted: {
        name: 'Corrupted',
        multi: 0.5,
        color: '#52525b',
        rarity: 20,
        description: '-50% value'
    },
    ectoplasmic: {
        name: 'Ectoplasmic',
        multi: 1.2,
        color: '#2dd4bf',
        rarity: 18,
        description: '+20% value',
        requiresPerk: 'spirit_sight'
    },
    blessed: {
        name: 'Blessed',
        multi: 1.7,
        color: '#fde047',
        rarity: 16,
        description: '+70% value'
    },
    shadowy: {
        name: 'Shadowy',
        multi: 0.85,
        color: '#475569',
        rarity: 12,
        description: '-15% value'
    },
    enchanted: {
        name: 'enchanted',
        multi: 11, // +1000%
        rarity: 0,
        color: '#d8b4fe',
        description: '1000% value',
        requiresPerk: 'enchanted_table'
    }
};

// Add ID property to each mod to match key (for backward compatibility if needed)
Object.keys(MODS).forEach(key => {
    MODS[key].id = key;
});

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
            if (mod.value > 1.0) {
                // Good size: Reduce rarity (more common)
                const luckFactor = 1 + (luck * 0.1);
                rarity /= luckFactor;
            } else if (mod.value < 1.0) {
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
    
    return { ...ATTRIBUTE.normal };
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
            const mod = MODS[modId] || modArray.find(m => m.id === modId);
            if (mod) selectedMods.push({ ...mod });
        });
    }

    // Determine how many random mods to add
    const luckModChanceBoost = luck > 0 ? (1 + luck * 0.05) : 1.0;
    
    const baseChance = rng();
    const modChance1 = 0.4 * modChanceBoost * luckModChanceBoost;
    const modChance2 = 0.15 * modChanceBoost * luckModChanceBoost;
    
    let targetModCount = baseChance < modChance1 ? 1 : baseChance < (modChance1 + modChance2) ? 2 : 0;
    
    const needed = targetModCount;

    // Select random mods based on their individual chances
    let availableMods = [...modArray].filter(m => {
        // Prevent spawning if rarity is 0 (disabled)
        if (m.rarity === 0) return false;

        // Check for required perk to unlock this mod
        if (m.requiresPerk && !ownedPerks[m.requiresPerk]) return false;

        return !selectedMods.some(sm => sm.id === m.id);
    });
    
    for (let i = 0; i < needed && availableMods.length > 0; i++) {
        // Calculate probability weights
        const weightedMods = availableMods.map(mod => {
            let rarity = mod.rarity || 10;
            
            // Apply rarity multipliers from perks (e.g. Hex Breaker increases rarity of Cursed items)
            if (rarityMultipliers[mod.id]) {
                rarity *= rarityMultipliers[mod.id];
            }
            
            if (luck > 0) {
                // Check value based on multi now
                const isGood = mod.multi > 1.0;
                
                if (isGood) {
                    const luckFactor = 1 + (luck * 0.1); 
                    rarity /= luckFactor;
                } else {
                    const luckProtection = 1 + (luck * 0.05);
                    rarity *= luckProtection;
                }
            }
            
            // Weight = 100 / Rarity
            return { mod, weight: 100 / Math.max(0.1, rarity) };
        });
        
        const totalWeight = weightedMods.reduce((sum, item) => sum + item.weight, 0);
        let random = rng() * totalWeight;
        
        for (const item of weightedMods) {
            random -= item.weight;
            if (random <= 0) {
                selectedMods.push({ ...item.mod });
                // Remove selected mod from available pool to prevent duplicates
                availableMods = availableMods.filter(m => m.id !== item.mod.id);
                break;
            }
        }
    }
    
    return selectedMods;
}

/**
 * Apply modifications to a thing
 * @param {Object} thing - the base item
 * @param {Object} options - modification options
 * @returns {Object} modified thing
 */
function applyModifications(thing, options) {
    const { rng = Math.random, luck = 0, valueBonus = 0 } = options;

    // 1. Roll for Size/Attribute
    const attribute = getRandomAttribute(rng, luck);
    
    // 2. Roll for Mods
    const mods = getRandomMods(options);

    // 3. Apply changes
    const modifiedThing = { ...thing };
    modifiedThing.originalValue = thing.value;
    // Save base color (handle nameStyle object or direct color string)
    modifiedThing.baseColor = (thing.nameStyle && thing.nameStyle.color) || thing.color || '#9ca3af';
    modifiedThing.attribute = attribute;
    modifiedThing.mods = mods; // Use 'mods' for consistency with game-state.js
    modifiedThing.modifiers = mods; // Keep 'modifiers' for internal consistency if needed
    
    // Calculate Rarity Score
    // Formula: itemBaseRarity * attributeRarity * modifierRarity
    // Note: Don't add guaranteed modifiers rarity (from perks)
    
    const itemBaseRarity = thing.rarity || 1;
    const attributeRarity = attribute.rarity || 1;
    
    let modifierRarity = 1;
    const guaranteedMods = options.guaranteedMods || [];
    
    for (const mod of mods) {
        // Skip guaranteed mods
        if (guaranteedMods.includes(mod.id)) continue;
        
        modifierRarity *= (mod.rarity || 1);
    }
    
    modifiedThing.rarityScore = Math.round(itemBaseRarity * attributeRarity * modifierRarity);

    // Calculate new value
    // User formula: ItemValue = baseValue * attributeValue * (1 + sum(modifiers))
    // We assume modifiers store 'multi' as a multiplier (e.g. 1.5).
    // So the additive bonus is (mod.multi - 1).
    
    let modifierSum = 0;
    for (const mod of mods) {
        // Convert multiplicative factor to additive bonus (e.g. 1.5 -> +0.5)
        modifierSum += (mod.multi - 1);
    }
    
    // Ensure we don't go below -100% (value 0)
    if (modifierSum < -1) modifierSum = -1;

    modifiedThing.value = Math.round(thing.value * attribute.value * (1 + modifierSum));
    
    // Construct display name
    // Format: "{Attribute} {Mod1} {Mod2} {ThingName}"
    const parts = [];
    if (attribute.id !== 'normal') parts.push(attribute.name);
    for (const mod of mods) {
        parts.push(mod.name);
    }
    parts.push(thing.name);
    modifiedThing.displayName = parts.join(' ');
    
    // Apply color overrides
    // Attribute color is base override
    if (attribute.color) modifiedThing.color = attribute.color;
    
    // Mod colors override attribute color (last one wins)
    for (const mod of mods) {
        if (mod.color) modifiedThing.color = mod.color;
    }

    return modifiedThing;
}

/**
 * Get all modifications applied to an item (attribute + mods)
 * @param {Object} item 
 * @returns {Array} list of mod objects
 */
function getAllModifications(item) {
    const mods = [];
    if (item.attribute && item.attribute.id !== 'normal') {
        mods.push({ ...item.attribute, type: 'attribute' });
    }
    const itemMods = item.mods || item.modifiers;
    if (itemMods && Array.isArray(itemMods)) {
        mods.push(...itemMods);
    }
    return mods;
}

/**
 * Get the full display name of a modified item
 * @param {Object} item 
 * @returns {string}
 */
function getModifiedItemName(item) {
    return item.displayName || item.name;
}

/**
 * Get the HTML display name (Base Name Only)
 * @param {Object} item 
 * @returns {string} HTML string
 */
function getModifiedItemNameHtml(item) {
    if (!item.displayName && !item.attribute && !item.mods) return item.name;
    const parts = [];
    
    // Attribute Part (Colored Text)
    if (item.attribute && item.attribute.id !== 'normal') {
        const color = item.attribute.color || '#fff';
        parts.push(`<span style="color: ${color}; font-weight: bold;">${item.attribute.name}</span>`);
    }

    // Only return the base name with its color (and attribute)
    // Mods are handled by ui.js composition as badges
    const baseColor = item.baseColor || (item.nameStyle && item.nameStyle.color) || item.color || '#9ca3af';
    parts.push(`<span style="color: ${baseColor}">${item.name}</span>`);
    
    return parts.join(' ');
}

/**
 * Get HTML badge for a modifier
 * @param {Object} mod 
 * @returns {string} HTML string
 */
function getModBadgeHtml(mod) {
    const color = mod.color || '#fff';
    return `<span class="mod-badge" style="
        display: inline-block;
        border: 1px solid ${color};
        color: ${color};
        border-radius: 12px;
        padding: 3px 8px;
        margin-right: 4px;
        margin-bottom: 2px;
        font-size: 0.85em;
        font-weight: bold;
        vertical-align: middle;
        background: rgba(0, 0, 0, 0.2);
        line-height: 1.4;
    ">${mod.name}</span>`;
}
