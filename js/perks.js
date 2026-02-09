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
        tier: 'common',
        attributes: { rolls: 1 }
    },
    LUCKY_CHARM: {
        id: 'lucky_charm',
        name: 'Lucky Charm',
        description: '+5% item rarity boost',
        cost: 2,
        tier: 'common',
        attributes: { luck: 1 }
    },
    MIDAS_TOUCH: {
        id: 'midas_touch',
        name: "Midas' Touch",
        description: 'Turn items gold on touch, +10% Item values',
        cost: 33,
        tier: 'legendary',
        attributes: { value_multiplier: 1 },
        special: 'turn_item_gold',
        mod_rarity_modifiers: {  golden: 1 }

    },
    SHREWD_MERCHANT: {
        id: 'shrewd_merchant',
        name: 'Shrewd Merchant',
        description: '+15% Chip earnings',
        cost: 2,
        tier: 'common',
        attributes: { chip_multiplier: 1 }
    },
    PROFIT_MARGIN: {
        id: 'profit_margin',
        name: 'Profit Margin',
        description: '+10% wave reward cash',
        cost: 2,
        tier: 'common',
        attributes: { cash_multiplier: 0.1 }
    },

    // UNCOMMON PERKS (35-65$ - accessible early)
    FORTUNE_SEEKER: {
        id: 'fortune_seeker',
        name: 'Fortune Seeker',
        description: '+2 Rolls, +1 Chip multiplier',
        cost: 5,
        tier: 'uncommon',
        attributes: { rolls: 2, chip_multiplier: 1 }
    },
    LUCKY_STRIKE: {
        id: 'lucky_strike',
        name: 'Lucky Strike',
        description: '+2 Luck',
        cost: 5,
        tier: 'uncommon',
        attributes: { luck: 2 }
    },
    TREASURE_HUNTER: {
        id: 'treasure_hunter',
        name: 'Treasure Hunter',
        description: '+2 Value multiplier, makes Golden/Ancient items more common',
        cost: 5,
        tier: 'uncommon',
        attributes: { value_multiplier: 2 },
        mod_rarity_modifiers: {  ancient: 0.6 }
    },
    CHIP_MASTERY: {
        id: 'chip_mastery',
        name: 'Chip Mastery',
        description: '+2 Chip multiplier',
        cost: 5,
        tier: 'uncommon',
        attributes: { chip_multiplier: 2 }
    },
    CASH_FLOW: {
        id: 'cash_flow',
        name: 'Cash Flow',
        description: '+50% wave reward cash',
        cost: 5,
        tier: 'uncommon',
        attributes: { cash_multiplier: 0.5 }
    },

    // RARE PERKS (80-120$ - mid game targets)
    HEX_BREAKER: {
        id: 'hex_breaker',
        name: 'Hex Breaker',
        description: 'Makes Cursed, Corrupted, and Shadowy items much rarer',
        cost: 90,
        tier: 'rare',
        attributes: {},
        mod_rarity_modifiers: { cursed: 3.0, corrupted: 3.0, shadowy: 2.0 }
    },
    MASTER_COLLECTOR: {
        id: 'master_collector',
        name: 'Master Collector',
        description: '+3 Value multiplier, +1 Luck',
        cost: 8,
        tier: 'rare',
        attributes: { value_multiplier: 3, luck: 1 },
        nameStyle: { color: '#FFD700' } // Custom text color example
    },
    ROLLER_DELUXE: {
        id: 'roller_deluxe',
        name: 'Roller Deluxe',
        description: '+3 Rolls per wave',
        cost: 8,
        tier: 'rare',
        attributes: { rolls: 3 }
    },
    GOLDEN_FORTUNE: {
        id: 'golden_fortune',
        name: 'Golden Fortune',
        description: '+2 Value, +1 Chip mult, +1 Luck',
        cost: 105,
        tier: 'rare',
        attributes: { value_multiplier: 2, chip_multiplier: 1, luck: 1 }
    },
    MEGA_ROLLER: {
        id: 'mega_roller',
        name: 'Mega Roller',
        description: '+2 Rolls, +2 Value multiplier',
        cost: 110,
        tier: 'rare',
        attributes: { rolls: 2, value_multiplier: 2 }
    },
    REVENUE_STREAM: {
        id: 'revenue_stream',
        name: 'Revenue Stream',
        description: '+50% wave reward cash, +1 Chip multiplier',
        cost: 115,
        tier: 'rare',
        attributes: { cash_multiplier: 0.5, chip_multiplier: 1 }
    },

    // EPIC PERKS (140-200$ - late game investments)
    JACKPOT: {
        id: 'jackpot',
        name: 'Jackpot',
        description: '+7 Chip multiplier, +7 Rolls',
        cost: 145,
        tier: 'epic',
        attributes: { chip_multiplier: 7, rolls: 7 }
    },
    PRISTINE_COLLECTOR: {
        id: 'pristine_collector',
        name: 'Pristine Collector',
        description: '+4 Value multiplier, +2 Luck',
        cost: 160,
        tier: 'epic',
        attributes: { value_multiplier: 4, luck: 2 }
    },
    FORTUNE_MULTIPLIER: {
        id: 'fortune_multiplier',
        name: 'Fortune Multiplier',
        description: '+5 Chip multiplier, +3 Value multiplier',
        cost: 175,
        tier: 'epic',
        attributes: { chip_multiplier: 5, value_multiplier: 3 }
    },
    WEALTH_ACCUMULATOR: {
        id: 'wealth_accumulator',
        name: 'Wealth Accumulator',
        description: '+100% wave cash reward, +2 Interest stacks',
        cost: 190,
        tier: 'epic',
        attributes: { cash_multiplier: 1.0, max_interest_stacks: 2 }
    },

    // LEGENDARY PERKS (250-350$ - ultimate endgame)
    ULTIMATE_FORTUNE: {
        id: 'ultimate_fortune',
        name: 'Ultimate Fortune',
        description: '+4 Rolls, +5 Value, +3 Luck, +4 Chips',
        cost: 280,
        tier: 'legendary',
        attributes: { rolls: 4, value_multiplier: 5, luck: 3, chip_multiplier: 4 }
    },
    GODLY_TOUCH: {
        id: 'godly_touch',
        name: 'Godly Touch',
        description: '+6 Value multiplier, +10 Chip multiplier',
        cost: 320,
        tier: 'legendary',
        attributes: { value_multiplier: 6, chip_multiplier: 10 }
    },
    CHIP_EATER: {
        id: 'chip_eater',
        name: 'Chip Eater',
        description: 'Gain +0.5 Item Value Multiplier for every 1 Chip earned AFTER purchasing this perk.',
        cost: 1,
        tier: 'common',
        attributes: {}, // Dynamic: 0.5 value_multiplier per chip earned since purchase
        special: 'chip_eater'
    },

    // SPECIAL PERKS
    NULLIFICATI0N: {
        id: 'nullificati0n',
        name: 'NULLIFICATI0N',
        description: 'REMOVES all owned perks. PREVENTS buying new perks. Scaling: +0.404 Luck and +4 Rolls for every wave active.',
        cost: 404,
        tier: 'mythical',
        attributes: {}, // Dynamic attributes
        special: 'lock_shop',
        nameStyle: { color: '#a500bbff', textStroke: '1px rgba(0,0,0,0.8)' }
    },
    HELIOSOL_SPEAR: {
        id: 'heliosol_spear',
        name: "Heliosol's Spear",
        description: "A legendary weapon of the sun. Enables Solar Power upgrades.",
        cost: 1,
        tier: 'mythical',
        attributes: { luck: 5, value_multiplier: 5 }, // Base stats
        nameStyle: { color: '#a855f7', textStroke: '1px rgba(255,255,255,0.7)' },
        special: 'unlock_solar_power'
    },
    SOLAR_POWER: {
        id: 'solar_power',
        name: 'Solar Power',
        description: "Increases Heliosol's Spear luck by 0.5. Requires Heliosol's Spear.",
        cost: 0,
        tier: 'special', // Dedicated tier
        type: 'subperk', // Subperk type
        attributes: { luck: 0.5 },
        requires: 'heliosol_spear',
        hidden: false, // Don't show in topbar
        maxStacks: 50,
        shopLimit: 3
    },
    AUTO_ROLL_COMMON: {
        id: 'auto_roll_common',
        name: 'Auto-Roll Common',
        description: 'When you roll a Common item, automatically roll again (no extra roll cost)',
        cost: 12,
        tier: 'uncommon',
        attributes: {},
        special: 'auto_roll_common'
    },
    COMMON_REROLLER: {
        id: 'common_reroller',
        name: 'Common Reroller',
        description: 'Reroll common items once per wave',
        cost: 40,
        tier: 'uncommon',
        attributes: { rolls: 1 },
        special: 'reroll_common',
        requires: 'auto_roll_common' // Must own Auto-Roll Common first
    },
    
    // MODIFICATION PERKS
    MODIFICATION_EXPERT: {
        id: 'modification_expert',
        name: 'Modification Expert',
        description: '+50% chance for item modifications',
        cost: 75,
        tier: 'rare',
        attributes: { modification_chance: 0.5 }
    },
    ENCHANTER: {
        id: 'enchanter',
        name: 'Enchanter',
        description: '+100% chance for multiple mods',
        cost: 100,
        tier: 'rare',
        attributes: { modification_chance: 1.0 }
    },
    MYSTICAL_TOUCH: {
        id: 'mystical_touch',
        name: 'Mystical Touch',
        description: '+150% modification chance, +1 Luck',
        cost: 135,
        tier: 'epic',
        attributes: { modification_chance: 1.5, luck: 1 }
    },

    // LEGENDARY MODIFICATION PERK
    ARTIFACT_MASTER: {
        id: 'artifact_master',
        name: 'Artifact Master',
        description: '+200% mod chance, +3 Rolls, +4 Value, +2 Luck, +3 Chips - Guaranteed special items! Prismatic items common!',
        cost: 350,
        tier: 'legendary',
        attributes: { modification_chance: 2.0, rolls: 3, value_multiplier: 4, luck: 2, chip_multiplier: 3 },
        mod_rarity_modifiers: { prismatic: 0.2 }
    },

    // ALIGNMENT PERKS (Mutually Exclusive)
    PATH_OF_LIGHT: {
        id: 'path_of_light',
        name: 'Path of Light',
        description: '+3 Luck, +1 Value Multiplier. Overwrites Path of Darkness.',
        cost: 60,
        tier: 'rare',
        attributes: { luck: 3, value_multiplier: 1 },
        nameStyle: { color: '#fbbf24', textStroke: '1px rgba(255,255,255,0.5)' },
        overwrites: ['path_of_darkness']
    },
    PATH_OF_DARKNESS: {
        id: 'path_of_darkness',
        name: 'Path of Darkness',
        description: '+3 Value Multiplier, +1 Luck. Overwrites Path of Light.',
        cost: 60,
        tier: 'rare',
        attributes: { value_multiplier: 3, luck: 1 },
        nameStyle: { color: '#7c3aed', textStroke: '1px rgba(0,0,0,0.5)' },
        overwrites: ['path_of_light']
    }
};

/**
 * Get perk by ID
 * @param {string} id 
 * @returns {Object|undefined}
 */
function getPerkById(id) {
    return Object.values(PERKS).find(p => p.id === id);
}

/**
 * Get perk cost (flat, one-time purchase)
 * @param {string} perkId
 * @returns {number} cost in chips
 */
function getPerkCost(perkId) {
    const perk = getPerkById(perkId);
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
            tier: perk.tier,
            rarity: perk.tier, // Backward compatibility
            type: perk.type || null,
            attributes: perk.attributes,
            special: perk.special || null,
            mod_rarity_modifiers: perk.mod_rarity_modifiers || null,
            requires: perk.requires || null,
            overwrites: perk.overwrites || null,
            maxStacks: perk.maxStacks || null,
            hidden: perk.hidden || false,
            nameStyle: perk.nameStyle || null
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
function getRandomShopPerks(wave, count = 4, owned = {}, rng = Math.random, luck = 0) {
    const allPerks = getShopPerks().filter(p => {
        // Standard check: filter if owned
        if (!p.maxStacks && owned[p.id]) return false;
        // Stackable check: filter if max stacks reached
        if (p.maxStacks && (owned[p.id] || 0) >= p.maxStacks) return false;
        // Requirement check: filter if requirement not met
        if (p.requires && !owned[p.requires]) return false;
        return true;
    });
    
    // Weight perks by tier and wave
    const weighted = allPerks.map(perk => {
        let weight = 1;
        
        // Special tier (Solar Power): High weight if unlocked
        if (perk.tier === 'special') {
            return { perk, weight: 40 }; // Very common if unlocked (User requested reduced rarity/more common)
        }
        
        // Early waves: common perks more likely
        if (wave <= 3) {
            weight = perk.tier === 'common' ? 8 : perk.tier === 'uncommon' ? 3 : 1;
        }
        // Mid waves: uncommon becomes more likely
        else if (wave <= 6) {
            weight = perk.tier === 'common' ? 4 : perk.tier === 'uncommon' ? 7 : perk.tier === 'rare' ? 3 : 1;
        }
        // Late waves: rare and epic more likely
        else {
            weight = perk.tier === 'uncommon' ? 2 : perk.tier === 'rare' ? 6 : perk.tier === 'epic' ? 4 : perk.tier === 'legendary' ? 2 : 1;
        }

        // Luck mitigation: Boost higher tiers
        if (luck > 0) {
            if (perk.tier === 'rare') weight *= (1 + luck * 0.15);
            if (perk.tier === 'epic') weight *= (1 + luck * 0.20);
            if (perk.tier === 'legendary') weight *= (1 + luck * 0.25);
        }
        
        return { perk, weight };
    });
    
    // Weighted random selection
    const selected = [];
    // Clone available so we don't modify the source weights, but we might remove items from this list
    let available = [...weighted];
    const selectedCounts = {}; // Track counts for limits
    
    for (let i = 0; i < count; i++) {
        if (available.length === 0) break;

        const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
        let random = rng() * totalWeight;
        
        for (let j = 0; j < available.length; j++) {
            random -= available[j].weight;
            if (random <= 0) {
                const selectedPerk = available[j].perk;
                const perkId = selectedPerk.id;

                // Clone and add instance ID
                const perkInstance = {
                    ...selectedPerk,
                    instanceId: `shop_perk_${perkId}_${Date.now()}_${i}_${Math.floor(rng() * 1000)}`
                };

                selected.push(perkInstance);
                
                // Handle duplicates logic
                const isSubperk = selectedPerk.type === 'subperk';
                const allowDupes = isSubperk; // Allow duplicates for all subperks (like Solar Power)
                
                selectedCounts[perkId] = (selectedCounts[perkId] || 0) + 1;
                const limit = selectedPerk.shopLimit || (isSubperk ? 2 : 1);

                // Remove from pool if it shouldn't be picked again
                // It is removed if:
                // 1. It doesn't allow duplicates
                // 2. OR it reached the duplicate limit
                if (!allowDupes || selectedCounts[perkId] >= limit) {
                    available.splice(j, 1);
                } else {
                    // If we keep it, maybe reduce its weight slightly to encourage variety? 
                    // Optional: available[j].weight *= 0.5; 
                }
                
                break;
            }
        }
    }
    
    return selected;
}
