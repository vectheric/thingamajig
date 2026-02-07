/**
 * Things System
 * Defines all possible items (things) that can be rolled
 */

const RARITIES = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary'
};

// Rarity weights for rolling (higher = more likely)
const RARITY_WEIGHTS = {
    [RARITIES.COMMON]: 50,
    [RARITIES.UNCOMMON]: 30,
    [RARITIES.RARE]: 12,
    [RARITIES.EPIC]: 6,
    [RARITIES.LEGENDARY]: 2
};

// Base values for each rarity
const RARITY_VALUES = {
    [RARITIES.COMMON]: 5,
    [RARITIES.UNCOMMON]: 15,
    [RARITIES.RARE]: 40,
    [RARITIES.EPIC]: 100,
    [RARITIES.LEGENDARY]: 250
};

// Thing templates - easily extensible
const THING_TEMPLATES = {
    STONE: {
        name: 'Stone',
        baseValue: 1,
        rarityMultiplier: 1.0
    },
    COPPER_ORE: {
        name: 'Copper Ore',
        baseValue: 3,
        rarityMultiplier: 1.1
    },
    SILVER_ORE: {
        name: 'Silver Ore',
        baseValue: 5,
        rarityMultiplier: 1.2
    },
    GOLD_ORE: {
        name: 'Gold Ore',
        baseValue: 10,
        rarityMultiplier: 1.4
    },
    DIAMOND: {
        name: 'Diamond',
        baseValue: 20,
        rarityMultiplier: 1.6
    },
    MYSTIC_CRYSTAL: {
        name: 'Mystic Crystal',
        baseValue: 15,
        rarityMultiplier: 1.5
    },
    ANCIENT_RELIC: {
        name: 'Ancient Relic',
        baseValue: 25,
        rarityMultiplier: 2.0
    },
    CURSED_ITEM: {
        name: 'Cursed Item',
        baseValue: 0,
        rarityMultiplier: 0.5
    },
    BLESSED_ARTIFACT: {
        name: 'Blessed Artifact',
        baseValue: 30,
        rarityMultiplier: 2.2
    },
    VOID_ESSENCE: {
        name: 'Void Essence',
        baseValue: 40,
        rarityMultiplier: 1.8
    }
};

/**
 * Roll a random thing
 * Uses wave-based rarity scaling to make early game easier and more rewarding
 * @param {number} wave - current wave (optional, defaults to 1)
 * @returns {Object} { name, value, rarity }
 */
function rollThing(wave = 1) {
    // Determine rarity with wave scaling
    const rarity = selectByWeight(getWaveBasedRarityWeights(wave));
    
    // Select random thing template
    const templates = Object.values(THING_TEMPLATES);
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Calculate value
    const baseValue = RARITY_VALUES[rarity];
    const finalValue = Math.round(baseValue * template.rarityMultiplier);
    
    return {
        name: template.name,
        value: finalValue,
        rarity: rarity
    };
}

/**
 * Get rarity weights adjusted by wave number
 * Early waves: heavily weighted to common/uncommon for easy dopamine
 * Mid waves: begins introducing rare items
 * Late waves: legendary becomes more common
 * @param {number} wave - current wave
 * @returns {Object} adjusted rarity weights
 */
function getWaveBasedRarityWeights(wave) {
    // Default weights
    let weights = {
        [RARITIES.COMMON]: 50,
        [RARITIES.UNCOMMON]: 30,
        [RARITIES.RARE]: 12,
        [RARITIES.EPIC]: 6,
        [RARITIES.LEGENDARY]: 2
    };

    // Waves 1-3: Easy early game, minimal legendary
    if (wave <= 3) {
        weights = {
            [RARITIES.COMMON]: 60,
            [RARITIES.UNCOMMON]: 35,
            [RARITIES.RARE]: 4,
            [RARITIES.EPIC]: 1,
            [RARITIES.LEGENDARY]: 0  // ZERO legendary early
        };
    }
    // Waves 4-6: Introduce rare items, still no legendary
    else if (wave <= 6) {
        weights = {
            [RARITIES.COMMON]: 45,
            [RARITIES.UNCOMMON]: 35,
            [RARITIES.RARE]: 15,
            [RARITIES.EPIC]: 5,
            [RARITIES.LEGENDARY]: 0  // Still impossible
        };
    }
    // Waves 7-10: Legendary possible but very rare
    else if (wave <= 10) {
        weights = {
            [RARITIES.COMMON]: 40,
            [RARITIES.UNCOMMON]: 30,
            [RARITIES.RARE]: 18,
            [RARITIES.EPIC]: 10,
            [RARITIES.LEGENDARY]: 2
        };
    }
    // Waves 11+: Legendary becomes more common
    else {
        weights = {
            [RARITIES.COMMON]: 30,
            [RARITIES.UNCOMMON]: 25,
            [RARITIES.RARE]: 20,
            [RARITIES.EPIC]: 18,
            [RARITIES.LEGENDARY]: 7
        };
    }

    return weights;
}

/**
 * Select a weighted random option
 * @param {Object} weights - { option: weight, ... }
 * @returns {string} selected option
 */
function selectByWeight(weights) {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (const [option, weight] of Object.entries(weights)) {
        random -= weight;
        if (random <= 0) return option;
    }
    
    return Object.keys(weights)[0];
}
