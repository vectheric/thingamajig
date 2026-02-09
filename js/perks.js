/**
 * Perks System
 * One-time purchases that permanently buff your gameplay
 */

const PERKS = {
    // AFFINITY PERKS
    ICE_AFFINITY: {
        id: 'ice_affinity',
        name: 'Ice Affinity',
        description: 'You are cold as ice. Prevents Fire Affinity from spawning.',
        cost: 20,
        tier: 'uncommon',
        attributes: {},
        conditions: [
            { type: 'conflicts_perk', perkId: 'fire_affinity' }
        ],
        icon: '❄️',
        
    },
    FIRE_AFFINITY: {
        id: 'fire_affinity',
        name: 'Fire Affinity',
        description: 'You are hot as fire. Prevents Ice Affinity from spawning.',
        cost: 20,
        tier: 'uncommon',
        attributes: {},
        conditions: [
            { type: 'conflicts_perk', perkId: 'ice_affinity' }
        ],
        icon: '🔥',
        
    },
    CHIP_VISION: {
        id: 'chip_vision',
        name: 'Ȼ Vision',
        description: 'Allows you to see your Ȼ when hovering over the perks topbar.',
        cost: 10,
        tier: 'common',
        attributes: {},
        icon: '👁️',
        
    },

    // COMMON PERKS (15-25$ - ultra cheap early game)
    OLD_TIRE: {
        id: 'old_tire',
        name: 'Old Tire',
        description: "Sadly, it's too old to be use again, +1 Roll",
        cost: 2,
        tier: 'common',
        attributes: { rolls: { add: 1 } },
        icon: '',
    },
    NAZAR: {
        id: 'nazar',
        name: 'Nazar',
        description: 'Nazar Lag Gayi!!, +5% item rarity boost',
        cost: 2,
        tier: 'common',
        attributes: { luck: { add: 1 } },
        icon: '🧿',
    },
    // FORGEABLE PERKS
    FINAL_CLOVER: {
        id: 'final_clover',
        name: '57 Leaf Clover',
        description: 'The ultimate symbol of luck. Massive boost to all stats. Can only be forged.',
        cost: 0,
        tier: 'legendary',
        attributes: { 
            luck: { add: 25 }, 
            rolls: { add: 10 }, 
            value: { mult: 2.0 }, // +100% -> mult 1.0 (additive multiplier in legacy logic, or should be mult: 2.0?)
            // Legacy: valueBonus: 1.0 meant +100%. In new system, let's standarize.
            // If we use 'mult', usually it means x(Value). 
            // Existing logic: attributes[attr] = (attributes[attr] || 0) + (value * count) for non-multiplicative.
            // But valueBonus was treated as additive percent in item calc?
            // "modBonusSum += options.valueBonus" -> Yes, additive percent.
            // So valueBonus: 1.0 means +100% base value.
            // In new system: value: { addPercent: 1.0 } ? Or just stick to valueBonus for now.
            // User asked for "add/multi/substract value".
            // Let's use specific keys for clarity: valueAdd, valueMult.
            // But to keep it simple, I'll map 'value' to valueBonus in getAttributes if needed.
            // Let's stick to explicit keys compatible with new getAttributes.
            valueBonus: { add: 1.0 },
            chipBonus: { add: 1.0 },
            chipsEndWave: { add: 57 }
        },
        forgeable: true,
        forgeRecipe: {
            perks: ['lucky_clover', 'nazar', 'chip_eater', 'thunder_strike','hex_breaker']
        },
        bossExclusive: true,
        icon: '💠',
        nameStyle: { color: '#06f71aff', textStroke: '1px rgba(0,0,0,0.5)' },
    },
    LUCKY_CLOVER: {
        id: 'lucky_clover',
        name: 'Lucky Clover',
        description: '+15% item rarity boost. Can only be forged.',
        cost: 0,
        tier: 'rare',
        attributes: { luck: { add: 3 } },
        forgeable: true,
        forgeRecipe: {
            cash: 20,
            perks: ['nazar']
        },
        icon: '🍀',
        nameStyle: { color: '#3b82f6', textStroke: '1px rgba(0,0,0,0.5)' },
    },
    MIDAS_TOUCH: {
        id: 'midas_touch',
        name: 'Midas Touch',
        description: 'Turn items gold on touch, +10% Item values. Requires finding a Gold nugget',
        cost: 25,
        tier: 'legendary',
        attributes: {
            valueBonus: { add: 0.1 },
            modifiers: { golden: 1 } // Special handling for modifiers map
        },
        special: 'failed_wish',
        icon: '🖐️',
        conditions: [
            {
                type: 'unlock',
                condition: {
                    type: 'item_collected',
                    itemId: 'GOLD_NUGGET'
                }
            }
        ],
        
    },
    CHIPPY: {
        id: 'chippy',
        name: 'Chippy',
        description: '+3Ȼ at the end of each wave. Requires earning 80Ȼ in a run',
        cost: 20,
        tier: 'common',
        attributes: {
            chipsEndWave: { add: 3 }
        },
        icon: '🍟',
        conditions: [
            {
                type: 'unlock',
                condition: {
                    type: 'stat_threshold',
                    stat: 'totalChipsEarned',
                    threshold: 80
                }
            },
            {
                type: 'bonus_trigger',
                condition: {
                    type: 'stat_threshold',
                    stat: 'wave',
                    threshold: 5,
                    bonus: { chipsEndWave: { add: 3 } }
                }
            }
        ],
    },
    SPEED_RUNNER: {
        id: 'speed_runner',
        name: 'Speed Runner',
        description: '+1 Rolls. Requires finishing a wave in under 15 seconds',
        cost: 25,
        tier: 'common',
        attributes: { rolls: { add: 1 } },
        icon: '⚡',
        conditions: [
            {
                type: 'unlock',
                condition: {
                    type: 'stat_threshold',
                    stat: 'fastestWaveTime',
                    threshold: 15000, // 15 seconds
                    compare: 'less'
                }
            }
        ],
    },
    SHREWD_MERCHANT: {
        id: 'shrewd_merchant',
        name: 'Shrewd Merchant',
        description: '+15% Ȼ earnings',
        cost: 2,
        tier: 'common',
        attributes: { chipBonus: { add: 0.15 } },
        icon: '💎',
    },
    PROFIT_MARGIN: {
        id: 'profit_margin',
        name: 'Profit Margin',
        description: '+10% wave reward cash',
        cost: 2,
        tier: 'common',
        attributes: { cashBonus: { add: 0.1 } },
        icon: '💰',
    },

    // UNCOMMON PERKS (35-65$ - accessible early)
    CRYSTAL_BALL: {
        id: 'crystall_ball',
        name: 'Crystal Ball',
        description: '+2 Rolls, +1Ȼ multiplier',
        cost: 5,
        tier: 'uncommon',
        attributes: { rolls: { add: 2 }, chipBonus: { add: 1.0 } },
        icon: '🔮',
    },
    THUNDER_STRIKE: {
        id: 'thunder_strike',
        name: 'Thunder Strike',
        description: 'x1.6 Luck',
        cost: 5,
        tier: 'uncommon',
        attributes: { luck: { mult: 1.6 } },
        icon: '⚡',
    },
    TREASURE_HUNTER: {
        id: 'treasure_hunter',
        name: 'Treasure Hunter',
        description: '+2 Value multiplier, makes Golden/Ancient items more common',
        cost: 5,
        tier: 'uncommon',
        attributes: {
            valueBonus: { add: 1.0 },
            modifiers: { ancient: 0.6 }
        },
        icon: '👑',
    },
    POTATO: {
        id: 'potato',
        name: 'Potato ',
        description: 'Did you know? potatoes are packed with electrolytes, +2 Extra Ȼ',
        cost: 5,
        tier: 'uncommon',
        attributes: { addChip: { add: 2 } },
        icon: '🥔',
    },
    CASH_FLOW: {
        id: 'cash_flow',
        name: 'Cash Flow',
        description: '+50% wave reward cash',
        cost: 5,
        tier: 'uncommon',
        attributes: { cashBonus: { add: 0.5 } },
        icon: '🌊',
    },

    // RARE PERKS (80-120$ - mid game targets)
    HEX_BREAKER: {
        id: 'hex_breaker',
        name: 'Hex Breaker',
        description: 'Makes Cursed, Corrupted, and Shadowy items much rarer',
        cost: 90,
        tier: 'rare',
        attributes: {
            modifiers: { cursed: 3.0, corrupted: 3.0, shadowy: 2.0 }
        },
        icon: '🛡️',
    },
    MASTER_COLLECTOR: {
        id: 'master_collector',
        name: 'Master Collector',
        description: '+3 Value multiplier, +1 Luck',
        cost: 8,
        tier: 'rare',
        attributes: { valueBonus: { add: 2.0 }, luck: { add: 1 } },
        nameStyle: { color: '#FFD700' }, 
        icon: '🎩',
    },
    ROLLER_DELUXE: {
        id: 'roller_deluxe',
        name: 'Roller Deluxe',
        description: '+3 Rolls per wave',
        cost: 8,
        tier: 'rare',
        attributes: { rolls: { add: 3 } },
        icon: '🎰',
    },
    GOLDEN_FORTUNE: {
        id: 'golden_fortune',
        name: 'Golden Fortune',
        description: '+2 Value, +1Ȼ mult, +1 Luck',
        cost: 105,
        tier: 'rare',
        attributes: { valueBonus: { add: 1.0 }, chipBonus: { add: 1.0 }, luck: { add: 1 } },
        icon: '🪙',
    },
    MEGA_ROLLER: {
        id: 'mega_roller',
        name: 'Mega Roller',
        description: '+2 Rolls, +2 Value multiplier',
        cost: 110,
        tier: 'rare',
        attributes: { rolls: { add: 2 }, valueBonus: { add: 1.0 } },
        icon: '🎲',
    },
    REVENUE_STREAM: {
        id: 'revenue_stream',
        name: 'Revenue Stream',
        description: '+50% wave reward cash, +1Ȼ multiplier',
        cost: 40,
        tier: 'rare',
        attributes: { cashBonus: { add: 0.5 }, chipBonus: { add: 1.0 } },
        icon: '💸',
    },

    // EPIC PERKS (140-200$ - late game investments)
    JACKPOT: {
        id: 'jackpot',
        name: 'Jackpot',
        description: '+7Ȼ multiplier, +7 Rolls',
        cost: 77,
        tier: 'epic',
        attributes: { chipBonus: { add: 6.0 }, rolls: { add: 7 } },
        icon: '🎰',
    },
    PRISTINE_COLLECTOR: {
        id: 'pristine_collector',
        name: 'Pristine Collector',
        description: '+300% Value, +2 Luck',
        cost: 160,
        tier: 'epic',
        attributes: { valueBonus: { add: 3.0 }, luck: { add: 2 } },
        icon: '🏛️',
    },
    FORTUNE_MULTIPLIER: {
        id: 'fortune_multiplier',
        name: 'Fortune Multiplier',
        description: '+5Ȼ multiplier, +200% Value',
        cost: 175,
        tier: 'epic',
        attributes: { chipBonus: { add: 4.0 }, valueBonus: { add: 2.0 } },
        icon: '🎇',
    },
    WEALTH_ACCUMULATOR: {
        id: 'wealth_accumulator',
        name: 'Wealth Accumulator',
        description: '+100% wave cash reward, +2 Interest stacks',
        cost: 190,
        tier: 'epic',
        attributes: { cashBonus: { add: 1.0 }, max_interest_stacks: { add: 2 } },
        icon: '🏦',
    },

    // LEGENDARY PERKS (250-350$ - ultimate endgame)
 
    CHIP_EATER: {
        id: 'chip_eater',
        name: 'Ȼ Eater',
        description: 'Bonus +0.5% Item Value Bonus for every 1Ȼ earned AFTER purchasing this perk.',
        cost: 1,
        tier: 'common',
        attributes: {}, // Dynamic: 0.005 valueBonus per chip earned since purchase
        special: 'chip_eater',
        icon: '👾',
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
        nameStyle: { color: '#a500bbff', textStroke: '1px rgba(0,0,0,0.8)' },
        icon: '🚫',
    },
    M4LW4R3_ZER01: {
        id: 'M4LW4R3_ZER01',
        name: "m4Lw4r3_zer01",
        description: "A virus generator. Enables VIRUS upgrades. ",
        cost: 300,
        tier: 'mythical',
        attributes: { luck: { mult: 2 }, valueBonus: { add: 1.0 } },
        nameStyle: { color: 'rgba(202, 2, 2, 1)ff', textStroke: '1px rgba(255,255,255,0.7)' },
        special: 'w4NnA_cRy?',
        icon: '🦟',
        dynamicTooltip: 'virus_count',
        
    },
    VIRUS: {
        id: 'VIRUS',
        name: 'Virus',
        description: "Increases VIRUS luck by 6.66. Appears after purchasing m4lw4r3_zer01.",
        cost: 0,
        tier: 'special',
        rarity: 5,
        type: 'subperk',
        attributes: { luck: { add: 0.66 } },
        conditions: [
            { type: 'requires_perk', perkId: 'M4LW4R3_ZER01' }
        ],
        hidden: true,
        shopLimit: 3,
        maxStacks: 50,
        icon: '₪',
    },
    AUTO_ROLL_COMMON: {
        id: 'auto_roll_common',
        name: 'Auto-Roll Common',
        description: 'When you roll a Common item, automatically roll again (no extra roll cost)',
        cost: 12,
        tier: 'uncommon',
        attributes: {},
        special: 'auto_roll_common',
        icon: '🔄',
        
    },
    COMMON_REROLLER: {
        id: 'common_reroller',
        name: 'Common Reroller',
        description: 'Reroll common items once per wave',
        cost: 40,
        tier: 'uncommon',
        attributes: { rolls: { add: 1 } },
        special: 'reroll_common',
        conditions: [
            { type: 'requires_perk', perkId: 'auto_roll_common' }
        ],
        icon: '♻️',
        
    },
    
    // MODIFICATION PERKS
    MINECRAFT_MODS: {
        id: 'MINECRAFT_MODS',
        name: 'Minecraft Mods',
        description: '+50% chance for item modifications',
        cost: 75,
        tier: 'rare',
        attributes: { modification_chance: { add: 0.5 } },
        icon: '🔧',
    },
    ENCHANTED_TABLE: {
        id: 'enchanted_table',
        name: 'Enchanted Table',
        description: 'Using a mysterious power to enchant loots.',
        cost: 222,
        tier: 'Mythical',
         attributes: {
            modifiers: { enchanted: 1 }
        },
        icon: '✨',
        
    },

    // LEGENDARY MODIFICATION PERK
    PRISMA: {
        id: 'PRISMA',
        name: 'PRISMA',
        description: '+200% mod chance, +3 Rolls, +4 Value, +2 Luck, +3Ȼ - Guaranteed special items. Prismatic items common',
        cost: 777,
        tier: 'legendary',
        attributes: {
            modification_chance: { add: 2.0 },
            rolls: { add: 3 },
            valueBonus: { add: 3.0 },
            luck: { add: 7 },
            chipBonus: { add: 2.0 },
            modifiers: { prismatic: 0.2 }
        },
        special: 'guaranteed_mod_prismatic',
        icon: '🔺',
        
    },

    // ALIGNMENT PERKS (Mutually Exclusive)
    DAYBREAKER: {
        id: 'daybreaker',
        name: 'Daybreaker',
        description: '+3 Luck, +1 Value to every items. Overwrites Trial of Twilight.',
        cost: 60,
        tier: 'rare',
        attributes: { luck: { add: 3 }, addValue: { add: 1 } },
        nameStyle: { color: '#fbbf24', textStroke: '1px rgba(255,255,255,0.5)' },
        overwrites: ['trial_of_twilight'],
        icon: '🌅',
        
    },
    TRIAL_OF_TWILIGHT: {
        id: 'trial_of_twilight',
        name: 'Trial of Twilight',
        description: '+3 Value Multiplier, +1 Luck. Overwrite Daybreaker.',
        cost: 60,
        tier: 'rare',
        attributes: { valueBonus: { add: 0.5 }, luck: { add: 1 } },
        nameStyle: { color: '#7c3aed', textStroke: '1px rgba(0,0,0,0.5)' },
        overwrites: ['daybreaker'],
        icon: '🌑',
        
    },
    // EXODIA SET
    FORBIDDEN_ONE: {
        id: 'forbidden_one',
        name: 'Exodia, The Forbidden One',
        description: 'The head of the forbidden one. Collect all 5 pieces to win... or just get massive stats.',
        cost: 300,
        tier: 'legendary',
        attributes: { luck: { add: 2 } },
        set: 'exodia',
        setBonuses: {
            2: { rolls: { add: 2 } },
            3: { luck: { add: 5 } },
            4: { valueBonus: { add: 2.0 } },
            5: { luck: { add: 50 }, rolls: { add: 20 }, valueBonus: { add: 10.0 } }
        },
        dynamicTooltip: 'set_collection',
        icon: '🤯',
    },
    LEFT_ARM: {
        id: 'left_arm',
        name: 'Left Arm',
        description: 'Left arm of the forbidden one.',
        cost: 100,
        tier: 'special',
        rarity: 500,
        attributes: { rolls: { add: 1 } },
        set: 'exodia',
        dynamicTooltip: 'set_collection',
        icon: '💪',
        conditions: [
            { type: 'requires_perk', perkId: 'forbidden_one' }
        ],
    },
    RIGHT_ARM: {
        id: 'right_arm',
        name: 'Right Arm',
        description: 'Right arm of the forbidden one.',
        cost: 100,
        tier: 'special',
        rarity: 500,
        attributes: { rolls: { add: 1 } },
        set: 'exodia',
        dynamicTooltip: 'set_collection',
        icon: '🤳',
        conditions: [
            { type: 'requires_perk', perkId: 'forbidden_one' }
        ],
    },
    LEFT_LEG: {
        id: 'left_leg',
        name: 'Left Leg',
        description: 'Left leg of the forbidden one.',
        cost: 100,
        tier: 'special',
        rarity: 500,
        attributes: { luck: { add: 1 } },
        set: 'exodia',
        dynamicTooltip: 'set_collection',
        icon: '🦵',
        conditions: [
            { type: 'requires_perk', perkId: 'forbidden_one' }
        ],
    },
    RIGHT_LEG: {
        id: 'right_leg',
        name: 'Right Leg',
        description: 'Right leg of the forbidden one.',
        cost: 100,
        tier: 'special',
        rarity: 500,
        attributes: { luck: { add: 1 } },
        set: 'exodia',
        dynamicTooltip: 'set_collection',
        icon: '🦶',
        conditions: [
            { type: 'requires_perk', perkId: 'forbidden_one' }
        ],
    },
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
        .filter(perk => !perk.forgeable)
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
            conditions: perk.conditions || [],
            overwrites: perk.overwrites || null,
            hidden: perk.hidden || false,
            nameStyle: perk.nameStyle || null,
            maxStacks: perk.maxStacks || 1,
            shopLimit: perk.shopLimit || 1,
            stackable: !!perk.maxStacks || perk.type === 'subperk' 
        }));
}

/**
 * Check if a perk's conditions are met
 * @param {Object} perk 
 * @param {Object} gameState 
 * @param {Object} ownedPerks 
 * @returns {boolean} true if all conditions pass
 */
function checkPerkConditions(perk, gameState, ownedPerks = {}) {
    if (!perk.conditions || perk.conditions.length === 0) return true;
    
    for (const condition of perk.conditions) {
        // Unlock Condition (Global)
        if (condition.type === 'unlock') {
            if (!gameState) continue; // Skip if no state (assume unlocked or default safe)
            const cond = condition.condition;
            
            if (cond.type === 'item_collected') {
                if (!gameState.itemHistory) return false;
                const hasItem = gameState.itemHistory.some(item => {
                    if (cond.itemId && item.id !== cond.itemId) return false;
                    if (cond.attribute && item.attribute !== cond.attribute) return false;
                    if (cond.modifier && (!item.mods || !item.mods.includes(cond.modifier))) return false;
                    if (cond.modifiers) {
                        if (!item.mods) return false;
                        for (const mod of cond.modifiers) {
                            if (!item.mods.includes(mod)) return false;
                        }
                    }
                    return true;
                });
                if (!hasItem) return false;
            } else if (cond.type === 'stat_threshold') {
                if (!gameState.stats) return false;
                const statValue = gameState.stats[cond.stat];
                if (statValue === undefined || statValue === null) return false;
                
                if (cond.compare === 'less') {
                    if (!(statValue < cond.threshold)) return false;
                } else {
                    if (!(statValue >= cond.threshold)) return false;
                }
            }
        }
        
        // Requirement (Shop Prerequisite)
        if (condition.type === 'requires_perk') {
            if (!ownedPerks[condition.perkId]) return false;
        }
        
        // Conflict (Shop Exclusion)
        if (condition.type === 'conflicts_perk') {
            if (ownedPerks[condition.perkId]) return false;
        }
    }
    
    return true;
}

/**
 * Get random perks based on wave
 * Higher waves have better chance at rare/epic/legendary perks
 * @param {number} wave - current wave
 * @param {number} count - number of perks to return
 * @param {Object} owned - owned perks object
 * @returns {Array} random perks filtered by wave
 */
function getRandomShopPerks(wave, count = 4, owned = {}, rng = Math.random, luck = 0, gameState = null) {
    const allPerks = getShopPerks().filter(p => {
        // Standard check: filter if owned (unless stackable and under limit)
        const ownedCount = (typeof owned[p.id] === 'number') ? owned[p.id] : (owned[p.id] ? 1 : 0);
        
        if (ownedCount > 0) {
             // If it's not stackable, or we reached max stacks, filter it out
             if (!p.maxStacks || p.maxStacks <= 1) return false;
             if (ownedCount >= p.maxStacks) return false;
        }
        
        // Check unified conditions
        if (!checkPerkConditions(p, gameState, owned)) return false;

        // Reverse Conflict check (Owned -> Self)
        // Check if any owned perk prevents this one from spawning
        const ownedIds = Object.keys(owned);
        for (const oId of ownedIds) {
            const oPerk = getPerkById(oId);
            if (oPerk && oPerk.conditions) {
                // If owned perk has a conflict condition against this perk
                const conflict = oPerk.conditions.find(c => c.type === 'conflicts_perk' && c.perkId === p.id);
                if (conflict) return false;
            }
        }

        return true;
    });
    
    // Weight perks by tier and wave (Higher Rarity = Rarer)
    const TIER_RARITY = {
        'common': 12,
        'uncommon': 25,
        'rare': 60,
        'epic': 200,
        'legendary': 500,
        'mythical': 1200,
        'special': null // Special handling
    };

    const weighted = allPerks.map(perk => {
        let rarity = perk.rarityValue || TIER_RARITY[perk.tier] || 10;
        
        
        
        // Wave-based Rarity Adjustment (Simulates "Base Tier Weight" from things.js)
        // Adjust rarity based on wave (Lower score = More common)
        let waveMultiplier = 1.0;

        if (wave <= 3) {
            // Early: Common is normal, others rare
            if (perk.tier === 'common') waveMultiplier = 0.5; // More common
            if (perk.tier === 'uncommon') waveMultiplier = 1.5;
            if (perk.tier === 'rare') waveMultiplier = 3.0;
        }
        else if (wave <= 6) {
            // Mid: Uncommon common
            if (perk.tier === 'uncommon') waveMultiplier = 0.8;
            if (perk.tier === 'rare') waveMultiplier = 1.2;
        }
        else {
            // Late: Higher tiers accessible
            if (perk.tier === 'rare') waveMultiplier = 0.9;
            if (perk.tier === 'epic') waveMultiplier = 1.0;
            if (perk.tier === 'legendary') waveMultiplier = 1.0;
        }
        
        // Apply Wave Multiplier to Score
        rarity *= waveMultiplier;

        // Luck Mitigation: Reduce effective rarity (making it more common)
        if (luck > 0) {
            // Luck reduces rarity by percentage
            // e.g. Luck 10 -> 1.5x boost -> Rarity / 1.5
            const luckFactor = 1 + (luck * 0.1); 
            rarity /= luckFactor;
        }
        
        // Calculate Weight: Inverse of Rarity
        let weight = 1000 / Math.max(1, rarity);
        
        return { perk, weight };
    });
    
    // Weighted random selection
    const selected = [];
    let available = [...weighted];
    const selectedCounts = {}; 
    
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
                selectedCounts[perkId] = (selectedCounts[perkId] || 0) + 1;
                const limit = selectedPerk.shopLimit || (isSubperk ? 2 : 1);
                
                // For regular stackable perks, we generally don't want the SAME perk appearing twice in one shop roll
                // unless explicitly allowed. Typically shop shows unique items per roll.
                // But for subperks or specific logic, maybe. 
                // Default: Remove from available for this roll.
                if (selectedCounts[perkId] >= limit) {
                    available.splice(j, 1);
                }
                break;
            }
        }
    }
    
    return selected;
}
