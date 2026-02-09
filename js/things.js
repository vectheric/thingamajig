/**
 * Things System
 * Defines all possible items (things) that can be rolled
 */

const TIER = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary'
};

const ITEM_TIER = {
    COMMON: 'common',
    SIGNIFICANT: 'significant',
    RARE: 'rare',
    MASTER: 'master',
    SURREAL: 'surreal',
    MYTHIC: 'mythic',
    EXOTIC: 'exotic',
    EXQUISITE: 'exquisite',
    TRANSCENDENT: 'transcendent',
    ENIGMATIC: 'enigmatic',
    UNFATHOMABLE: 'unfathomable',
    OTHERWORLDLY: 'otherworldly',
    IMAGINARY: 'imaginary',
    ZENITH: 'zenith'
};

// Rarity weights for rolling (higher = more likely)

// Base values for each rarity
const TIER_VALUES = {
    [ITEM_TIER.COMMON]: 5,
    [ITEM_TIER.SIGNIFICANT]: 15,
    [ITEM_TIER.RARE]: 40,
    [ITEM_TIER.MASTER]: 100,
    [ITEM_TIER.SURREAL]: 250,
    [ITEM_TIER.MYTHIC]: 1000,
    [ITEM_TIER.EXOTIC]: 2500,
    [ITEM_TIER.EXQUISITE]: 5000,
    [ITEM_TIER.TRANSCENDENT]: 10000,
    [ITEM_TIER.ENIGMATIC]: 25000,
    [ITEM_TIER.UNFATHOMABLE]: 100000,
    [ITEM_TIER.OTHERWORLDLY]: 250000,
    [ITEM_TIER.IMAGINARY]: 1000000,
    [ITEM_TIER.ZENITH]: 10000000
};

// Thing templates - easily extensible
const THING_TEMPLATES = {
    STONE: {
        name: 'Stone',
        baseValue: 1,
        rarityMultiplier: 1.0,
        tier: ITEM_TIER.COMMON,
        weight: 14,
        color: '#9ca3af'
    },
    COPPER_ORE: {
        name: 'Copper Ore',
        baseValue: 3,
        rarityMultiplier: 1.1,
        tier: ITEM_TIER.COMMON,      
        weight: 10,
        color: '#f97316'
    },
    SILVER_ORE: {
        name: 'Silver Ore',
        baseValue: 5,
        rarityMultiplier: 1.2,
        tier: ITEM_TIER.SIGNIFICANT,
        weight: 8,
        color: '#e5e7eb'
    },
    GOLD_ORE: {
        name: 'Gold Ore',
        baseValue: 10,
        rarityMultiplier: 1.4,
        tier: ITEM_TIER.RARE,
        weight: 6,
        color: '#fbbf24'
    },
    DIAMOND: {
        name: 'Diamond',
        baseValue: 20,
        rarityMultiplier: 1.6,
        tier: ITEM_TIER.MASTER,
        weight: 4,
        color: '#a5f3fc'
    },
    MYSTIC_CRYSTAL: {
        name: 'Mystic Crystal',
        baseValue: 15,
        rarityMultiplier: 1.5,
        tier: ITEM_TIER.RARE,
        weight: 5,
        color: '#22d3ee'
    },
    ANCIENT_RELIC: {
        name: 'Ancient Relic',
        baseValue: 25,
        rarityMultiplier: 2.0,
        tier: ITEM_TIER.MASTER,
        weight: 3,
        color: '#a78bfa'
    },
    CURSED_ITEM: {
        name: 'Cursed Item',
        baseValue: 0,
        rarityMultiplier: 0.5,
        tier: ITEM_TIER.SIGNIFICANT,
        weight: 6,
        color: '#22c55e'
    },
    BLESSED_ARTIFACT: {
        name: 'Blessed Artifact',
        baseValue: 30,
        rarityMultiplier: 2.2,
        tier: ITEM_TIER.SURREAL,
        weight: 2,
        color: '#f59e0b'
    },
    VOID_ESSENCE: {
        name: 'Void Essence',
        baseValue: 40,
        rarityMultiplier: 1.8,
        tier: ITEM_TIER.SURREAL,
        weight: 1,
        color: '#8b5cf6'
    },
    VOID_ESSENCE: {
        name: 'Void Essence',
        baseValue: 40,
        rarityMultiplier: 1.8,
        tier: ITEM_TIER.SURREAL,
        weight: 1,
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
    const tier = template.tier;

    const baseValue = TIER_VALUES[tier] + template.baseValue;
    const finalValue = Math.round(baseValue * template.rarityMultiplier);

    return {
        name: template.name,
        value: finalValue,
        tier: tier,
        rarity: tier, // Keep rarity for backward compatibility if needed, but prefer tier
        nameStyle: template.color ? { color: template.color } : undefined
    };
}
function getWaveBasedTemplateWeights(wave, rarityWeightsOverride) {
    const rarityWeights = rarityWeightsOverride || getWaveBasedRarityWeights(wave);
    const templates = Object.values(THING_TEMPLATES);
    const weights = [];

    for (const template of templates) {
        const tier = template.tier;
        const rarityWeight = rarityWeights[tier] ?? 0;
        const templateWeight = typeof template.weight === 'number' ? template.weight : 1;
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
    // Base chance for supernatural tiers (Exotic+) to appear in ANY wave
    // These are very small chances, but possible from Wave 1
    const supernaturalBase = {
        [ITEM_TIER.EXOTIC]: 0.005,
        [ITEM_TIER.EXQUISITE]: 0.002,
        [ITEM_TIER.TRANSCENDENT]: 0.001,
        [ITEM_TIER.ENIGMATIC]: 0.0005,
        [ITEM_TIER.UNFATHOMABLE]: 0.0002,
        [ITEM_TIER.OTHERWORLDLY]: 0.0001,
        [ITEM_TIER.IMAGINARY]: 0.00005,
        [ITEM_TIER.ZENITH]: 0.00001
    };

    // Default weights (Waves 11+)
    let weights = {
        [ITEM_TIER.COMMON]: 30,
        [ITEM_TIER.SIGNIFICANT]: 25,
        [ITEM_TIER.RARE]: 20,
        [ITEM_TIER.MASTER]: 18,
        [ITEM_TIER.SURREAL]: 7,
        [ITEM_TIER.MYTHIC]: 0,
        ...supernaturalBase
    };

    // Waves 1-3: Easy early game
    if (wave <= 3) {
        weights = {
            [ITEM_TIER.COMMON]: 60,
            [ITEM_TIER.SIGNIFICANT]: 35,
            [ITEM_TIER.RARE]: 4,
            [ITEM_TIER.MASTER]: 1,
            [ITEM_TIER.SURREAL]: 0,
            [ITEM_TIER.MYTHIC]: 0,
            ...supernaturalBase
        };
    }
    // Waves 4-6: Introduce rare items
    else if (wave <= 6) {
        weights = {
            [ITEM_TIER.COMMON]: 45,
            [ITEM_TIER.SIGNIFICANT]: 35,
            [ITEM_TIER.RARE]: 15,
            [ITEM_TIER.MASTER]: 5,
            [ITEM_TIER.SURREAL]: 0,
            [ITEM_TIER.MYTHIC]: 0,
            ...supernaturalBase
        };
    }
    // Waves 7-10: Legendary/Surreal possible
    else if (wave <= 10) {
        weights = {
            [ITEM_TIER.COMMON]: 40,
            [ITEM_TIER.SIGNIFICANT]: 30,
            [ITEM_TIER.RARE]: 18,
            [ITEM_TIER.MASTER]: 10,
            [ITEM_TIER.SURREAL]: 2,
            [ITEM_TIER.MYTHIC]: 0,
            ...supernaturalBase
        };
    }
    // Waves 11-20: Higher chance for Master/Surreal
    else if (wave <= 20) {
        weights = {
            [ITEM_TIER.COMMON]: 30,
            [ITEM_TIER.SIGNIFICANT]: 25,
            [ITEM_TIER.RARE]: 20,
            [ITEM_TIER.MASTER]: 18,
            [ITEM_TIER.SURREAL]: 7,
            [ITEM_TIER.MYTHIC]: 0.1,
            ...supernaturalBase
        };
    }
    // Waves 21+: Unlock higher tiers slowly (Increase supernatural chances slightly)
    else {
        weights = {
            [ITEM_TIER.COMMON]: 20,
            [ITEM_TIER.SIGNIFICANT]: 20,
            [ITEM_TIER.RARE]: 20,
            [ITEM_TIER.MASTER]: 20,
            [ITEM_TIER.SURREAL]: 15,
            [ITEM_TIER.MYTHIC]: 5,
            // Boost supernatural chances slightly in late game
            [ITEM_TIER.EXOTIC]: 0.1,
            [ITEM_TIER.EXQUISITE]: 0.05,
            [ITEM_TIER.TRANSCENDENT]: 0.02,
            [ITEM_TIER.ENIGMATIC]: 0.01,
            [ITEM_TIER.UNFATHOMABLE]: 0.005,
            [ITEM_TIER.OTHERWORLDLY]: 0.002,
            [ITEM_TIER.IMAGINARY]: 0.001,
            [ITEM_TIER.ZENITH]: 0.0001
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
