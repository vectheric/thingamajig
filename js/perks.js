/**
 * Perks System
 * One-time purchases that permanently buff your gameplay
 */

const PERKS = {
    // COMMON PERKS (15-25$ - ultra cheap early game)
    EXTRA_ROLL: {
        id: 'extra_roll',
        name: 'Extra Roll',
        description: '+1 Roll per wave',
        cost: 2,
        rarity: 'common',
        attributes: { rolls: 1 }
    },
    LUCKY_CHARM: {
        id: 'lucky_charm',
        name: 'Lucky Charm',
        description: '+5% item rarity boost',
        cost: 2,
        rarity: 'common',
        attributes: { luck: 1 }
    },
    GOLDEN_TOUCH: {
        id: 'golden_touch',
        name: 'Golden Touch',
        description: '+10% Item values',
        cost: 2,
        rarity: 'common',
        attributes: { value_multiplier: 1 }
    },
    SHREWD_MERCHANT: {
        id: 'shrewd_merchant',
        name: 'Shrewd Merchant',
        description: '+15% Chip earnings',
        cost: 2,
        rarity: 'common',
        attributes: { chip_multiplier: 1 }
    },
    PROFIT_MARGIN: {
        id: 'profit_margin',
        name: 'Profit Margin',
        description: '+10% wave reward cash',
        cost: 2,
        rarity: 'common',
        attributes: { cash_multiplier: 0.1 }
    },

    // UNCOMMON PERKS (35-65$ - accessible early)
    FORTUNE_SEEKER: {
        id: 'fortune_seeker',
        name: 'Fortune Seeker',
        description: '+2 Rolls, +1 Chip multiplier',
        cost: 5,
        rarity: 'uncommon',
        attributes: { rolls: 2, chip_multiplier: 1 }
    },
    LUCKY_STRIKE: {
        id: 'lucky_strike',
        name: 'Lucky Strike',
        description: '+2 Luck',
        cost: 5,
        rarity: 'uncommon',
        attributes: { luck: 2 }
    },
    TREASURE_HUNTER: {
        id: 'treasure_hunter',
        name: 'Treasure Hunter',
        description: '+2 Value multiplier',
        cost: 5,
        rarity: 'uncommon',
        attributes: { value_multiplier: 2 }
    },
    CHIP_MASTERY: {
        id: 'chip_mastery',
        name: 'Chip Mastery',
        description: '+2 Chip multiplier',
        cost: 5,
        rarity: 'uncommon',
        attributes: { chip_multiplier: 2 }
    },
    CASH_FLOW: {
        id: 'cash_flow',
        name: 'Cash Flow',
        description: '+50% wave reward cash',
        cost: 5,
        rarity: 'uncommon',
        attributes: { cash_multiplier: 0.5 }
    },

    // RARE PERKS (80-120$ - mid game targets)
    MASTER_COLLECTOR: {
        id: 'master_collector',
        name: 'Master Collector',
        description: '+3 Value multiplier, +1 Luck',
        cost: 8,
        rarity: 'rare',
        attributes: { value_multiplier: 3, luck: 1 }
    },
    ROLLER_DELUXE: {
        id: 'roller_deluxe',
        name: 'Roller Deluxe',
        description: '+3 Rolls per wave',
        cost: 8,
        rarity: 'rare',
        attributes: { rolls: 3 }
    },
    GOLDEN_FORTUNE: {
        id: 'golden_fortune',
        name: 'Golden Fortune',
        description: '+2 Value, +1 Chip mult, +1 Luck',
        cost: 105,
        rarity: 'rare',
        attributes: { value_multiplier: 2, chip_multiplier: 1, luck: 1 }
    },
    MEGA_ROLLER: {
        id: 'mega_roller',
        name: 'Mega Roller',
        description: '+2 Rolls, +2 Value multiplier',
        cost: 110,
        rarity: 'rare',
        attributes: { rolls: 2, value_multiplier: 2 }
    },
    REVENUE_STREAM: {
        id: 'revenue_stream',
        name: 'Revenue Stream',
        description: '+50% wave reward cash, +1 Chip multiplier',
        cost: 115,
        rarity: 'rare',
        attributes: { cash_multiplier: 0.5, chip_multiplier: 1 }
    },

    // EPIC PERKS (140-200$ - late game investments)
    JACKPOT: {
        id: 'jackpot',
        name: 'Jackpot',
        description: '+7 Chip multiplier, +7 Rolls',
        cost: 145,
        rarity: 'epic',
        attributes: { chip_multiplier: 7, rolls: 7 }
    },
    PRISTINE_COLLECTOR: {
        id: 'pristine_collector',
        name: 'Pristine Collector',
        description: '+4 Value multiplier, +2 Luck',
        cost: 160,
        rarity: 'epic',
        attributes: { value_multiplier: 4, luck: 2 }
    },
    FORTUNE_MULTIPLIER: {
        id: 'fortune_multiplier',
        name: 'Fortune Multiplier',
        description: '+5 Chip multiplier, +3 Value multiplier',
        cost: 175,
        rarity: 'epic',
        attributes: { chip_multiplier: 5, value_multiplier: 3 }
    },
    WEALTH_ACCUMULATOR: {
        id: 'wealth_accumulator',
        name: 'Wealth Accumulator',
        description: '+100% wave cash reward, +2 Interest stacks',
        cost: 190,
        rarity: 'epic',
        attributes: { cash_multiplier: 1.0, max_interest_stacks: 2 }
    },

    // LEGENDARY PERKS (250-350$ - ultimate endgame)
    ULTIMATE_FORTUNE: {
        id: 'ultimate_fortune',
        name: 'Ultimate Fortune',
        description: '+4 Rolls, +5 Value, +3 Luck, +4 Chips',
        cost: 280,
        rarity: 'legendary',
        attributes: { rolls: 4, value_multiplier: 5, luck: 3, chip_multiplier: 4 }
    },
    GODLY_TOUCH: {
        id: 'godly_touch',
        name: 'Godly Touch',
        description: '+6 Value multiplier, +10 Chip multiplier',
        cost: 320,
        rarity: 'legendary',
        attributes: { value_multiplier: 6, chip_multiplier: 10 }
    },

    // SPECIAL PERKS
    AUTO_ROLL_COMMON: {
        id: 'auto_roll_common',
        name: 'Auto-Roll Common',
        description: 'When you roll a Common item, automatically roll again (no extra roll cost)',
        cost: 12,
        rarity: 'uncommon',
        attributes: {},
        special: 'auto_roll_common'
    },
    COMMON_REROLLER: {
        id: 'common_reroller',
        name: 'Common Reroller',
        description: 'Reroll common items once per wave',
        cost: 40,
        rarity: 'uncommon',
        attributes: { rolls: 1 },
        special: 'reroll_common'
    },
    MASTER_REROLLER: {
        id: 'master_reroller',
        name: 'Master Reroller',
        description: 'Reroll any item once per wave',
        cost: 100,
        rarity: 'rare',
        attributes: { rolls: 1 },
        special: 'reroll_any'
    },

    // MODIFICATION PERKS
    MODIFICATION_EXPERT: {
        id: 'modification_expert',
        name: 'Modification Expert',
        description: '+50% chance for item modifications',
        cost: 75,
        rarity: 'rare',
        attributes: { modification_chance: 0.5 }
    },
    ENCHANTER: {
        id: 'enchanter',
        name: 'Enchanter',
        description: '+100% chance for multiple mods',
        cost: 100,
        rarity: 'rare',
        attributes: { modification_chance: 1.0 }
    },
    MYSTICAL_TOUCH: {
        id: 'mystical_touch',
        name: 'Mystical Touch',
        description: '+150% modification chance, +1 Luck',
        cost: 135,
        rarity: 'epic',
        attributes: { modification_chance: 1.5, luck: 1 }
    },

    // LEGENDARY MODIFICATION PERK
    ARTIFACT_MASTER: {
        id: 'artifact_master',
        name: 'Artifact Master',
        description: '+200% mod chance, +3 Rolls, +4 Value, +2 Luck, +3 Chips - Guaranteed special items!',
        cost: 350,
        rarity: 'legendary',
        attributes: { modification_chance: 2.0, rolls: 3, value_multiplier: 4, luck: 2, chip_multiplier: 3 }
    }
};

/**
 * Get perk cost (flat, one-time purchase)
 * @param {string} perkId
 * @returns {number} cost in chips
 */
function getPerkCost(perkId) {
    const perk = PERKS[Object.keys(PERKS).find(k => PERKS[k].id === perkId)];
    if (!perk) return 0;
    return perk.cost;
}

/**
 * Get all available perks
 * @returns {Array} perk info for shop display
 */
function getShopPerks() {
    return Object.values(PERKS)
        .filter(perk => !perk.bossExclusive)
        .map(perk => ({
            id: perk.id,
            name: perk.name,
            description: perk.description,
            cost: perk.cost,
            rarity: perk.rarity,
            attributes: perk.attributes,
            special: perk.special || null
        }));
}

/**
 * Get random perks based on wave
 * Higher waves have better chance at rare/epic/legendary perks
 * @param {number} wave - current wave
 * @param {number} count - number of perks to return
 * @param {Object} owned - owned perks object
 * @returns {Array} random perks filtered by wave
 */
function getRandomShopPerks(wave, count = 4, owned = {}, rng = Math.random) {
    const allPerks = getShopPerks().filter(p => !owned[p.id]);
    
    // Weight perks by rarity and wave
    const weighted = allPerks.map(perk => {
        let weight = 1;
        
        // Early waves: common perks more likely
        if (wave <= 3) {
            weight = perk.rarity === 'common' ? 8 : perk.rarity === 'uncommon' ? 3 : 1;
        }
        // Mid waves: uncommon becomes more likely
        else if (wave <= 6) {
            weight = perk.rarity === 'common' ? 4 : perk.rarity === 'uncommon' ? 7 : perk.rarity === 'rare' ? 3 : 1;
        }
        // Late waves: rare and epic more likely
        else {
            weight = perk.rarity === 'uncommon' ? 2 : perk.rarity === 'rare' ? 6 : perk.rarity === 'epic' ? 4 : perk.rarity === 'legendary' ? 2 : 1;
        }
        
        return { perk, weight };
    });
    
    // Weighted random selection
    const selected = [];
    const available = [...weighted];
    
    for (let i = 0; i < Math.min(count, available.length); i++) {
        const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
        let random = rng() * totalWeight;
        
        for (let j = 0; j < available.length; j++) {
            random -= available[j].weight;
            if (random <= 0) {
                selected.push(available[j].perk);
                available.splice(j, 1);
                break;
            }
        }
    }
    
    return selected;
}

