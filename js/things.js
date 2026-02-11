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
        value: 5,
        tier: ITEM_TIER.COMMON,
        rarity: 5,
        color: '#9ca3af',
        description: 'Just a rock.',
        properties: []
    },
    copper_rod: {
        name: 'Copper Rod',
        value: 8,
        tier: ITEM_TIER.SIGNIFICANT,      
        rarity: 10,
        color: '#f97316',
        description: 'Conductive and shiny.',
        properties: [],
        tags: ['light']
    },
    silverfish: {
        name: 'Silverfish',
        value: 10,
        tier: ITEM_TIER.SIGNIFICANT,
        rarity: 28,
        color: '#e5e7eb',
        description: 'Pure silver.',
        properties: [],
        tags: ['light']
    },
    gold_nugget: {
        name: 'Gold Nugget',
        value: 15,
        tier: ITEM_TIER.RARE,
        rarity: 56,
        color: '#fbbf24',
        description: 'Valuable gold.',
        properties: [],
        tags: ['light']
    },
    diamond: {
        name: 'Diamond',
        value: 25,
        tier: ITEM_TIER.MASTER,
        rarity: 34,
        color: '#a5f3fc',
        description: 'Forever.',
        properties: [],
        tags: ['light']
    },
    amethyst_geode: {
        name: 'Amethyst Geode',
        value: 15,
        tier: ITEM_TIER.RARE,
        rarity: 45,
        color: '#c200e9ff',
        description: 'Purple crystal.',
        properties: [],
        tags: ['dark']
    },
    ancient_relic: {
        name: 'Ancient Relic',
        value: 25,
        tier: ITEM_TIER.SURREAL,
        rarity: 83,
        color: '#a78bfa',
        description: 'From a lost civilization.',
        properties: [],
        tags: ['dark']
    },
    lost_key: {
        name: 'Lost key',
        value: 30,
        tier: ITEM_TIER.SURREAL,
        rarity: 92,
        color: '#f59e0b',
        description: 'Holy power.',
        properties: [],
        tags: ['light']
    },
    encregel: {
        name: 'Encregel',
        value: 40,
        tier: ITEM_TIER.MYTHIC,
        rarity: 1001,
        color: '#8b5cf6',
        description: 'Inky gel.',
        properties: [],
        tags: ['dark']
    },
    exodal: {
        name: 'Exodal',
        value: 80,
        tier: ITEM_TIER.EXOTIC,
        rarity: 5001,
        color: '#5eff01ff',
        description: 'Forbidden.',
        properties: []
    },
    flying_pig: {
        name: 'Flying Pig',
        value: 80,
        tier: ITEM_TIER.EXOTIC,
        rarity: 5001,
        color: '#eb4dfaff)',
        description: 'Impossible.',
        properties: []
    },
    ice_cream: {
        name: 'Ice cream',
        value: 80,
        tier: ITEM_TIER.TRANSCENDENT,
        rarity: 5001,
        color: '#8df0ebff)',
        description: 'Impossible.',
        properties: []
    },
    mammoth: {
        name: 'Mammoth',
        value: 80,
        tier: ITEM_TIER.ENIGMATIC,
        rarity: 10000,
        color: '#5eff01ff',
        description: 'Extinct.',
        properties: []
    },
    death_note: {
        name: 'Death Note',
        value: 80,
        tier: ITEM_TIER.UNFATHOMABLE,
        rarity: 1000001,
        color: '#000000ff)',
        description: 'Die.',
        properties: []
    },
};

// Add ID property to each item to match key
Object.keys(ITEMS).forEach(key => {
    ITEMS[key].id = key;
});


/**
 * Calculate effective rarity based on context (biome, time, events)
 * @param {Object} item - Item template
 * @param {Object} context - { biome, time, events }
 * @returns {number} Effective rarity
 */
function getEffectiveRarity(item, context = {}) {
    let baseRarity = item.rarity || 10;
    
    if (!item.properties || item.properties.length === 0) {
        return baseRarity;
    }

    const { biome, time, events } = context;
    const matchingRarities = [];

    // Helper to check time
    const isTimeMatch = (timeCondition, minutes) => {
        if (!timeCondition) return true;
        if (timeCondition === 'night') {
            // 7PM (19:00 = 1140) to 5AM (05:00 = 300)
            return minutes >= 1140 || minutes < 300;
        }
        if (timeCondition === 'day') {
            // 5AM to 7PM
            return minutes >= 300 && minutes < 1140;
        }
        return true;
    };

    for (const prop of item.properties) {
        let match = true;

        // Check Biome
        if (prop.biome && prop.biome !== biome) {
            match = false;
        }

        // Check Time
        if (match && prop.time && typeof time === 'number') {
            if (!isTimeMatch(prop.time, time)) {
                match = false;
            }
        }

        // Check Event
        if (match && prop.event) {
            if (!events || !events.includes(prop.event)) {
                match = false;
            }
        }

        if (match && prop.rarity !== undefined && prop.rarity !== null) {
            matchingRarities.push(prop.rarity);
        }
    }

    if (matchingRarities.length > 0) {
        // Prioritize the most common one (lowest rarity value)
        return Math.min(...matchingRarities);
    }

    return baseRarity;
}

/**
 * Roll a random thing
 * Uses round-based rarity scaling to make early game easier and more rewarding
 * @param {number} round - current round (optional, defaults to 1)
 * @returns {Object} { name, value, rarity }
 */
function rollThing(round = 1, rng = Math.random, rarityWeightsOverride, worldEffects = null, context = {}) {
    // Handle guaranteed item from World Effects
    if (worldEffects && worldEffects.item && worldEffects.item.guaranteed) {
        const guaranteedId = worldEffects.item.guaranteed;
        const template = ITEMS[guaranteedId];
        if (template) {
             const baseValue = template.value || template.baseValue;
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

    const selection = selectByWeight(getRoundBasedTemplateWeights(round, rarityWeightsOverride, worldEffects, context), rng);
    const template = selection.template;
    const tier = template.tier;

    const baseValue = template.value || template.baseValue;
    let finalValue = Math.round(baseValue);

    // Apply World Effects (Item Value Modifiers)
    if (worldEffects && worldEffects.itemValue && worldEffects.itemValue.tags) {
        if (template.tags) {
            for (const tag of template.tags) {
                if (worldEffects.itemValue.tags[tag]) {
                    const mod = worldEffects.itemValue.tags[tag];
                    if (mod.type === 'multi') {
                        finalValue = Math.round(finalValue * mod.value);
                    } else if (mod.type === 'add') {
                        finalValue += mod.value;
                    }
                }
            }
        }
    }

    return {
        id: selection.id,
        name: template.name,
        value: finalValue,
        tier: tier,
        rarity: getEffectiveRarity(template, context), // Return effective rarity
        nameStyle: template.color ? { color: template.color } : undefined
    };
}

function getRoundBasedTemplateWeights(round, tierRarityOverride, worldEffects = null, context = {}) {
    const tierRarity = tierRarityOverride || getRoundBasedRarityWeights(round);
    const weights = [];

    for (const template of Object.values(ITEMS)) {
        // Use effective rarity based on context
        let itemRarity = getEffectiveRarity(template, context);
        
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
