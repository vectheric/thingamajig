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
const ITEMS = {
    stone: {
        name: 'Stone',
        baseValue: 5,
        rarityMultiplier: 1.0,
        tier: ITEM_TIER.COMMON,
        rarity: 5,
        color: '#9ca3af'
    },
    copper_rod: {
        name: 'Copper Rod',
        baseValue: 8,
        rarityMultiplier: 1.1,
        tier: ITEM_TIER.SIGNIFICANT,      
        rarity: 10,
        color: '#f97316'
    },
    silver_ore: {
        name: 'Silver Ore',
        baseValue: 10,
        rarityMultiplier: 1.2,
        tier: ITEM_TIER.SIGNIFICANT,
        rarity: 28,
        color: '#e5e7eb'
    },
    gold_nugget: {
        name: 'Gold Nugget',
        baseValue: 15,
        rarityMultiplier: 1.4,
        tier: ITEM_TIER.RARE,
        rarity: 56,
        color: '#fbbf24'
    },
    diamond: {
        name: 'Diamond',
        baseValue: 25,
        rarityMultiplier: 1.6,
        tier: ITEM_TIER.MASTER,
        rarity: 34,
        color: '#a5f3fc'
    },
    amethyst_geode: {
        name: 'Amethyst Geode',
        baseValue: 15,
        rarityMultiplier: 1.5,
        tier: ITEM_TIER.RARE,
        rarity: 45,
        color: '#c200e9ff'
    },
    ancient_relic: {
        name: 'Ancient Relic',
        baseValue: 25,
        rarityMultiplier: 2.0,
        tier: ITEM_TIER.SURREAL,
        rarity: 83,
        color: '#a78bfa'
    },
    blessed_artifact: {
        name: 'Blessed Artifact',
        baseValue: 30,
        rarityMultiplier: 2.2,
        tier: ITEM_TIER.SURREAL,
        rarity: 92,
        color: '#f59e0b'
    },
    void_essence: {
        name: 'Void Essence',
        baseValue: 40,
        rarityMultiplier: 1.8,
        tier: ITEM_TIER.MYTHIC,
        rarity: 1001,
        color: '#8b5cf6'
    },
    exodal: {
        name: 'Exodal',
        baseValue: 80,
        rarityMultiplier: 1.8,
        tier: ITEM_TIER.EXOTIC,
        rarity: 5001,
        color: '#5eff01ff'
    },
    toilet: {
        name: '🚽',
        baseValue: 80,
        rarityMultiplier: 1.8,
        tier: ITEM_TIER.EXOTIC,
        rarity: 5001,
        color: '#5eff01ff'
    },
    mammoth: {
        name: 'Mammoth',
        baseValue: 80,
        rarityMultiplier: 1.8,
        tier: ITEM_TIER.ENIGMATIC,
        rarity: 10000,
        color: '#5eff01ff'
    },

};

// Add ID property to each item to match key
Object.keys(ITEMS).forEach(key => {
    ITEMS[key].id = key;
});


/**
 * Roll a random thing
 * Uses round-based rarity scaling to make early game easier and more rewarding
 * @param {number} round - current round (optional, defaults to 1)
 * @returns {Object} { name, value, rarity }
 */
function rollThing(round = 1, rng = Math.random, rarityWeightsOverride, worldEffects = null) {
    // Handle guaranteed item from World Effects
    if (worldEffects && worldEffects.item && worldEffects.item.guaranteed) {
        const guaranteedId = worldEffects.item.guaranteed;
        const template = ITEMS[guaranteedId];
        if (template) {
             const baseValue = template.baseValue;
             const finalValue = Math.round(baseValue);
             return {
                id: guaranteedId,
                name: template.name,
                value: finalValue,
                tier: template.tier,
                rarity: template.rarity || 1,
                nameStyle: template.color ? { color: template.color } : undefined
            };
        }
    }

    const selection = selectByWeight(getRoundBasedTemplateWeights(round, rarityWeightsOverride, worldEffects), rng);
    const template = selection.template;
    const tier = template.tier;

    const baseValue = template.baseValue;
    const finalValue = Math.round(baseValue);

    return {
        id: selection.id,
        name: template.name,
        value: finalValue,
        tier: tier,
        rarity: template.rarity || 1, // Store numeric rarity from template
        nameStyle: template.color ? { color: template.color } : undefined
    };
}

function getRoundBasedTemplateWeights(round, tierRarityOverride, worldEffects = null) {
    const tierRarity = tierRarityOverride || getRoundBasedRarityWeights(round);
    const weights = [];

    for (const template of Object.values(ITEMS)) {
        // Use template.rarity as the primary rarity score
        // Default to 10 if missing, but all defined items should have it
        let itemRarity = template.rarity || 10;
        
        // Apply World Effects (Specific Item Rarity)
        if (worldEffects && worldEffects.item && worldEffects.item.specific[template.id]) {
            const effect = worldEffects.item.specific[template.id];
            // Note: Rarity logic here is 1,000,000 / rarity.
            // Higher rarity = Rarer.
            // User: "set rarity to 2" -> set value
            // User: "add rarity 2" -> increase value (make rarer)
            if (effect.type === 'set') itemRarity = effect.value;
            else if (effect.type === 'add') itemRarity += effect.value;
        }

        // Calculate probability weight
        // Formula: 1,000,000 / itemRarity
        // Higher rarity number = Lower probability
        let weight = 1000000 / Math.max(1, itemRarity);

        // Apply Luck/Tier modifiers if an override is provided
        // This preserves the Luck mechanic which modifies tierRarity values
        if (tierRarityOverride) {
            const tier = template.tier;
            const tierVal = tierRarity[tier] ?? 100;
            // Adjust weight inversely to the tier rarity (lower tier score = higher weight)
            // We normalize by 100 to keep scale similar
            weight *= (100 / Math.max(1, tierVal));
        }
        
        if (weight > 0) weights.push({ item: { template, id: template.id }, weight });
    }

    return weights;
}

/**
 * Get tier rarity adjusted by round number
 * Higher rarity = Rarer tier
 * Early rounds: Common/Uncommon have low rarity (common)
 * Mid rounds: Rare rarity drops
 * Late rounds: Legendary rarity drops
 * @param {number} round - current round
 * @returns {Object} adjusted tier rarity
 */
function getRoundBasedRarityWeights(round) {
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

    // Default rarity (Rounds 11+)
    let rarity = {
        [ITEM_TIER.COMMON]: 3,       // ~33%
        [ITEM_TIER.SIGNIFICANT]: 4,  // ~25%
        [ITEM_TIER.RARE]: 5,         // ~20%
        [ITEM_TIER.MASTER]: 6,       // ~16%
        [ITEM_TIER.SURREAL]: 15,     // ~6%
        [ITEM_TIER.MYTHIC]: 100000,  // Very rare default
        ...supernaturalBase
    };

    // Rounds 1-3: Easy early game
    if (round <= 3) {
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
    // Rounds 4-6: Introduce rare items
    else if (round <= 6) {
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
    // Rounds 7-10: Legendary/Surreal possible
    else if (round <= 10) {
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
    // Rounds 11-20: Higher chance for Master/Surreal
    else if (round <= 20) {
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
    // Rounds 21+: Unlock higher tiers slowly
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
