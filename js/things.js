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
//--

//-

// Thing templates - easily extensible
const THING_TEMPLATES = {
    STONE: {
        name: 'Stone',
        baseValue: 5,
        rarityMultiplier: 1.0,
        tier: ITEM_TIER.COMMON,
        rarityScore: 5,
        color: '#9ca3af'
    },
    COPPER_ROD: {
        name: 'Copper Rod',
        baseValue: 8,
        rarityMultiplier: 1.1,
        tier: ITEM_TIER.SIGNIFICANT,      
        rarityScore: 10,
        color: '#f97316'
    },
    SILVER_ORE: {
        name: 'Silver Ore',
        baseValue: 10,
        rarityMultiplier: 1.2,
        tier: ITEM_TIER.SIGNIFICANT,
        rarityScore: 28,
        color: '#e5e7eb'
    },
    GOLD_NUGGET: {
        name: 'Gold Nugget',
        baseValue: 15,
        rarityMultiplier: 1.4,
        tier: ITEM_TIER.RARE,
        rarityScore: 56,
        color: '#fbbf24'
    },
    DIAMOND: {
        name: 'Diamond',
        baseValue: 25,
        rarityMultiplier: 1.6,
        tier: ITEM_TIER.MASTER,
        rarityScore: 34,
        color: '#a5f3fc'
    },
    AMETHYST_GEODE: {
        name: 'Amethyst Geode',
        baseValue: 15,
        rarityMultiplier: 1.5,
        tier: ITEM_TIER.RARE,
        rarityScore: 45,
        color: '#c200e9ff'
    },
    ANCIENT_RELIC: {
        name: 'Ancient Relic',
        baseValue: 25,
        rarityMultiplier: 2.0,
        tier: ITEM_TIER.SURREAL,
        rarityScore: 83,
        color: '#a78bfa'
    },
    BLESSED_ARTIFACT: {
        name: 'Blessed Artifact',
        baseValue: 30,
        rarityMultiplier: 2.2,
        tier: ITEM_TIER.SURREAL,
        rarityScore: 92,
        color: '#f59e0b'
    },
    VOID_ESSENCE: {
        name: 'Void Essence',
        baseValue: 40,
        rarityMultiplier: 1.8,
        tier: ITEM_TIER.MYTHIC,
        rarityScore: 1001,
        color: '#8b5cf6'
    },
    EXODAL: {
        name: 'Exodal',
        baseValue: 80,
        rarityMultiplier: 1.8,
        tier: ITEM_TIER.EXOTIC,
        rarityScore: 5001,
        color: '#5eff01ff'
    },
    EXODAL: {
        name: 'EXODAL',
        baseValue: 80,
        rarityMultiplier: 1.8,
        tier: ITEM_TIER.EXOTIC,
        rarityScore: 5001,
        color: '#5eff01ff'
    },
    MAMMOTH: {
        name: 'Mammoth',
        baseValue: 80,
        rarityMultiplier: 1.8,
        tier: ITEM_TIER.Enigmatic,
        rarityScore: 10000,
        color: '#5eff01ff'
    },

};

/**
 * Roll a random thing
 * Uses wave-based rarity scaling to make early game easier and more rewarding
 * @param {number} wave - current wave (optional, defaults to 1)
 * @returns {Object} { name, value, rarity }
 */
function rollThing(wave = 1, rng = Math.random, rarityWeightsOverride) {
    const selection = selectByWeight(getWaveBasedTemplateWeights(wave, rarityWeightsOverride), rng);
    const template = selection.template;
    const tier = template.tier;

    const baseValue = template.baseValue;
    const finalValue = Math.round(baseValue);

    return {
        id: selection.id,
        name: template.name,
        value: finalValue,
        tier: tier,
        rarity: tier, // Keep rarity for backward compatibility if needed, but prefer tier
        nameStyle: template.color ? { color: template.color } : undefined
    };
}

function getWaveBasedTemplateWeights(wave, tierRarityOverride) {
    const tierRarity = tierRarityOverride || getWaveBasedRarityWeights(wave);
    const entries = Object.entries(THING_TEMPLATES);
    const weights = [];

    for (const [id, template] of entries) {
        const tier = template.tier;
        const tierRarityVal = tierRarity[tier] ?? 100; // Default to high rarity if missing
        
        // Rarity: Higher number = Rarer (Probability ~ 1/Score)
        // Use template.rarity as rarity score (default to 10 if missing)
        const itemRarity = typeof template.rarity === 'number' ? template.rarity : 10;
        
        // Calculate probability weight: 
        // 1. Inverse of Tier Rarity (Higher score = Lower probability)
        // 2. Inverse of Item Rarity
        const probabilityWeight = (100 / Math.max(1, tierRarityVal)) * (100 / Math.max(1, itemRarity));
        
        if (probabilityWeight > 0) weights.push({ item: { template, id }, weight: probabilityWeight });
    }

    return weights;
}

/**
 * Get tier rarity adjusted by wave number
 * Higher rarity = Rarer tier
 * Early waves: Common/Uncommon have low rarity (common)
 * Mid waves: Rare rarity drops
 * Late waves: Legendary rarity drops
 * @param {number} wave - current wave
 * @returns {Object} adjusted tier rarity
 */
function getWaveBasedRarityWeights(wave) {
    // Base rarity for supernatural tiers (Exotic+)
    // These are very high (very rare)
    const supernaturalBase = {
        [ITEM_TIER.EXOTIC]: 20000,      // ~0.005%
        [ITEM_TIER.EXQUISITE]: 50000,   // ~0.002%
        [ITEM_TIER.TRANSCENDENT]: 100000, // ~0.001%
        [ITEM_TIER.ENIGMATIC]: 200000,
        [ITEM_TIER.UNFATHOMABLE]: 500000,
        [ITEM_TIER.OTHERWORLDLY]: 1000000,
        [ITEM_TIER.IMAGINARY]: 2000000,
        [ITEM_TIER.ZENITH]: 10000000
    };

    // Default rarity (Waves 11+)
    let rarity = {
        [ITEM_TIER.COMMON]: 3,       // ~33%
        [ITEM_TIER.SIGNIFICANT]: 4,  // ~25%
        [ITEM_TIER.RARE]: 5,         // ~20%
        [ITEM_TIER.MASTER]: 6,       // ~16%
        [ITEM_TIER.SURREAL]: 15,     // ~6%
        [ITEM_TIER.MYTHIC]: 100000,  // Very rare default
        ...supernaturalBase
    };

    // Waves 1-3: Easy early game
    if (wave <= 3) {
        rarity = {
            [ITEM_TIER.COMMON]: 1,       // Very common
            [ITEM_TIER.SIGNIFICANT]: 3,
            [ITEM_TIER.RARE]: 25,        // Rare
            [ITEM_TIER.MASTER]: 100,     // Very Rare
            [ITEM_TIER.SURREAL]: 10000,  // Impossible-ish
            [ITEM_TIER.MYTHIC]: 100000,
            ...supernaturalBase
        };
    }
    // Waves 4-6: Introduce rare items
    else if (wave <= 6) {
        rarity = {
            [ITEM_TIER.COMMON]: 2,
            [ITEM_TIER.SIGNIFICANT]: 3,
            [ITEM_TIER.RARE]: 7,
            [ITEM_TIER.MASTER]: 20,
            [ITEM_TIER.SURREAL]: 10000,
            [ITEM_TIER.MYTHIC]: 100000,
            ...supernaturalBase
        };
    }
    // Waves 7-10: Legendary/Surreal possible
    else if (wave <= 10) {
        rarity = {
            [ITEM_TIER.COMMON]: 2.5,
            [ITEM_TIER.SIGNIFICANT]: 3.5,
            [ITEM_TIER.RARE]: 6,
            [ITEM_TIER.MASTER]: 10,
            [ITEM_TIER.SURREAL]: 50,
            [ITEM_TIER.MYTHIC]: 100000,
            ...supernaturalBase
        };
    }
    // Waves 11-20: Higher chance for Master/Surreal
    else if (wave <= 20) {
        rarity = {
            [ITEM_TIER.COMMON]: 3,
            [ITEM_TIER.SIGNIFICANT]: 4,
            [ITEM_TIER.RARE]: 5,
            [ITEM_TIER.MASTER]: 6,
            [ITEM_TIER.SURREAL]: 15,
            [ITEM_TIER.MYTHIC]: 1000,
            ...supernaturalBase
        };
    }
    // Waves 21+: Unlock higher tiers slowly
    else {
        rarity = {
            [ITEM_TIER.COMMON]: 5,
            [ITEM_TIER.SIGNIFICANT]: 5,
            [ITEM_TIER.RARE]: 5,
            [ITEM_TIER.MASTER]: 5,
            [ITEM_TIER.SURREAL]: 7,
            [ITEM_TIER.MYTHIC]: 20,
            // Boost supernatural chances slightly in late game (lower rarity)
            [ITEM_TIER.EXOTIC]: 1000,
            [ITEM_TIER.EXQUISITE]: 2000,
            [ITEM_TIER.TRANSCENDENT]: 5000,
            [ITEM_TIER.ENIGMATIC]: 10000,
            [ITEM_TIER.UNFATHOMABLE]: 20000,
            [ITEM_TIER.OTHERWORLDLY]: 50000,
            [ITEM_TIER.IMAGINARY]: 100000,
            [ITEM_TIER.ZENITH]: 1000000
        };
    }

    return rarity;
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
