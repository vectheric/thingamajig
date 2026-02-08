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
        rarityMultiplier: 1.0,
        tier: RARITIES.COMMON,
        rarity: 14,
        color: '#9ca3af'
    },
    COPPER_ORE: {
        name: 'Copper Ore',
        baseValue: 3,
        rarityMultiplier: 1.1,
        tier: RARITIES.COMMON,
        rarity: 10,
        color: '#f97316'
    },
    SILVER_ORE: {
        name: 'Silver Ore',
        baseValue: 5,
        rarityMultiplier: 1.2,
        tier: RARITIES.UNCOMMON,
        rarity: 8,
        color: '#e5e7eb'
    },
    GOLD_ORE: {
        name: 'Gold Ore',
        baseValue: 10,
        rarityMultiplier: 1.4,
        tier: RARITIES.RARE,
        rarity: 6,
        color: '#fbbf24'
    },
    DIAMOND: {
        name: 'Diamond',
        baseValue: 20,
        rarityMultiplier: 1.6,
        tier: RARITIES.EPIC,
        rarity: 4,
        color: '#a5f3fc'
    },
    MYSTIC_CRYSTAL: {
        name: 'Mystic Crystal',
        baseValue: 15,
        rarityMultiplier: 1.5,
        tier: RARITIES.RARE,
        rarity: 5,
        color: '#22d3ee'
    },
    ANCIENT_RELIC: {
        name: 'Ancient Relic',
        baseValue: 25,
        rarityMultiplier: 2.0,
        tier: RARITIES.EPIC,
        rarity: 3,
        color: '#a78bfa'
    },
    CURSED_ITEM: {
        name: 'Cursed Item',
        baseValue: 0,
        rarityMultiplier: 0.5,
        tier: RARITIES.UNCOMMON,
        rarity: 6,
        color: '#22c55e'
    },
    BLESSED_ARTIFACT: {
        name: 'Blessed Artifact',
        baseValue: 30,
        rarityMultiplier: 2.2,
        tier: RARITIES.LEGENDARY,
        rarity: 2,
        color: '#f59e0b'
    },
    VOID_ESSENCE: {
        name: 'Void Essence',
        baseValue: 40,
        rarityMultiplier: 1.8,
        tier: RARITIES.LEGENDARY,
        rarity: 1,
        color: '#8b5cf6'
    }
};

function createSeededRng(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Roll a random thing
 * Uses wave-based rarity scaling to make early game easier and more rewarding
 * @param {number} wave - current wave (optional, defaults to 1)
 * @returns {Object} { name, value, rarity }
 */
function rollThing(wave = 1, rng = Math.random, rarityWeightsOverride) {
    const template = selectByWeight(getWaveBasedTemplateWeights(wave, rarityWeightsOverride), rng);
    const rarity = template.tier || template.rarity;

    const baseValue = RARITY_VALUES[rarity] + template.baseValue;
    const finalValue = Math.round(baseValue * template.rarityMultiplier);

    return {
        name: template.name,
        value: finalValue,
        rarity: rarity,
        nameStyle: template.color ? { color: template.color } : undefined
    };
}
function getWaveBasedTemplateWeights(wave, rarityWeightsOverride) {
    const rarityWeights = rarityWeightsOverride || getWaveBasedRarityWeights(wave);
    const templates = Object.values(THING_TEMPLATES);
    const weights = [];

    for (const template of templates) {
        const tier = template.tier || template.rarity;
        const rarityWeight = rarityWeights[tier] ?? 0;
        const templateWeight = typeof template.rarity === 'number'
            ? template.rarity
            : (typeof template.weight === 'number' ? template.weight : 1);
        const weight = rarityWeight * Math.max(0, templateWeight);
        if (weight > 0) weights.push({ item: template, weight });
    }

    return weights;
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
function selectByWeight(weights, rng = Math.random) {
    const entries = Array.isArray(weights)
        ? weights
        : Object.entries(weights).map(([item, weight]) => ({ item, weight }));

    if (entries.length === 0) return null;

    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let random = rng() * totalWeight;

    for (const entry of entries) {
        random -= entry.weight;
        if (random <= 0) return entry.item;
    }

    return entries[0].item;
}
