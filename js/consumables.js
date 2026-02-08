/**
 * Consumables System - Potions and single-use items
 * Available in shop and from boss drops
 */

const CONSUMABLES = {
    // Luck Potion - +2 rolls
    luck_potion: {
        id: 'luck_potion',
        name: 'Luck Potion',
        description: 'Grants 2 additional rolls for the current wave',
        icon: '🍀',
        cost: 5,
        effect: 'rolls',
        value: 2,
        rarity: 'common',
        color: '#4ade80'
    },

    // Chip Surge Potion - +50% chip multiplier for next roll
    chip_potion: {
        id: 'chip_potion',
        name: 'Chip Surge',
        description: 'Next item roll has +50% value',
        icon: '💎',
        cost: 8,
        effect: 'chip_boost',
        value: 1.5,
        rarity: 'uncommon',
        color: '#60a5fa'
    },

    // Cash Injection - Instant cash
    cash_potion: {
        id: 'cash_potion',
        name: 'Cash Drop',
        description: 'Instantly gain $15 cash',
        icon: '💰',
        cost: 10,
        effect: 'cash',
        value: 15,
        rarity: 'uncommon',
        color: '#fbbf24'
    },

    // Reroll Potion - Free shop reroll
    reroll_potion: {
        id: 'reroll_potion',
        name: 'Reroll Token',
        description: 'Free shop reroll (consumes token instead of cash)',
        icon: '🎲',
        cost: 7,
        effect: 'free_reroll',
        value: 1,
        rarity: 'rare',
        color: '#a78bfa'
    },

    // Epic Luck - Guaranteed rare+ roll
    epic_luck: {
        id: 'epic_luck',
        name: 'Epic Essence',
        description: 'Next roll guarantees Rare or higher rarity',
        icon: '✨',
        cost: 15,
        effect: 'guaranteed_rare',
        value: 1,
        rarity: 'epic',
        color: '#c084fc'
    },

    // Value Multiplier - 2x value on next roll
    value_multiplier: {
        id: 'value_multiplier',
        name: 'Value x2',
        description: 'Next item roll has double value',
        icon: '2️⃣',
        cost: 12,
        effect: 'double_value',
        value: 2,
        rarity: 'rare',
        color: '#f472b6'
    },

    // Mod Chance Boost - Higher modification chance
    mod_boost: {
        id: 'mod_boost',
        name: 'Mod Magnet',
        description: 'Next roll has +30% modification chance',
        icon: '🧲',
        cost: 6,
        effect: 'mod_chance',
        value: 0.3,
        rarity: 'uncommon',
        color: '#2dd4bf'
    },

    // Interest Stack - Add interest stack
    interest_stack: {
        id: 'interest_stack',
        name: 'Interest Bond',
        description: 'Gain +1 interest stack immediately',
        icon: '📈',
        cost: 9,
        effect: 'interest',
        value: 1,
        rarity: 'uncommon',
        color: '#84cc16'
    }
};

/**
 * Get a random selection of consumables for the shop
 * @param {number} count - Number of consumables to select
 * @param {function} rng - Random number generator
 * @returns {Array} Array of consumable objects
 */
function getRandomShopConsumables(count = 4, rng = Math.random) {
    const allConsumables = Object.values(CONSUMABLES);
    const selected = [];
    
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(rng() * allConsumables.length);
        // Allow duplicates by creating a copy with unique instance ID
        const consumable = {
            ...allConsumables[randomIndex],
            instanceId: Date.now() + Math.random() + i
        };
        selected.push(consumable);
    }
    
    return selected;
}

/**
 * Get consumable by ID
 * @param {string} id - Consumable ID
 * @returns {Object|null} Consumable object or null
 */
function getConsumableById(id) {
    return CONSUMABLES[id] || null;
}

/**
 * Get all available consumables
 * @returns {Array} Array of all consumable objects
 */
function getAllConsumables() {
    return Object.values(CONSUMABLES);
}

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONSUMABLES, getRandomShopConsumables, getConsumableById, getAllConsumables };
}
