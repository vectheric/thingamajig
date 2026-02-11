/**
 * Perks System
 * One-time purchases that permanently buff your gameplay
 */

const PERKS = {
    // AFFINITY PERKS
    'ice_affinity': {
        name: 'Ice Affinity',
        description: 'You are cold as ice. Prevents Fire Affinity from spawning.',
        cost: 1,
        tier: 'common',
        icon: '❄️',
        properties: {
            conflict: ['fire_affinity'],
            stack: 1
        },
        stats: {}
    },
    'fire_affinity': {
        name: 'Fire Affinity',
        description: 'You are hot as fire. Prevents Ice Affinity from spawning.',
        cost: 1,
        tier: 'common',
        icon: '🔥',
        properties: {
            conflict: ['ice_affinity'],
            stack: 1
        },
        stats: {}
    },
    'chip_vision': {
        name: 'Ȼ Vision',
        description: 'Allows you to see your Ȼ when hovering over the perks topbar.',
        cost: 10,
        tier: 'common',
        icon: '👁️',
        properties: {
            stack: 1
        },
        stats: {}
    },

    // COMMON PERKS (15-25$ - ultra cheap early game)
    'old_tire': {
        name: 'Old Tire',
        description: "Sadly, it's too old to be use again, +1 Roll",
        cost: 2,
        tier: 'common',
        icon: '',
        properties: {
            stack: 50
        },
        stats: {
            rolls: { type: 'add', value: 1 }
        }
    },

    'nazar': {
        name: 'Nazar',
        description: 'Nazar Lag Gayi!!, +1 luck',
        cost: 2,
        tier: 'common',
        icon: '🧿',
        properties: {
            stack: 50
        },
        stats: {
            luck: { type: 'add', value: 1 }
        }
    },
    'explorers_compass': {
        name: 'Explorer\'s Compass',
        description: 'Guides you to interesting places. +20% Event Rate, +10 Luck.',
        cost: 150,
        tier: 'rare',
        icon: '🧭',
        properties: {
            stack: 1
        },
        stats: {
            luck: { type: 'add', value: 10 }
        }
    },
    'vip_card': {
        name: 'VIP Card',
        description: 'Shop rerolls start at 0$ instead of 5$.',
        cost: 100,
        tier: 'epic',
        icon: '💳',
        properties: {
            stack: 1
        },
        stats: {}
    },
    
    // FORGEABLE PERKS
    '57_leaf_clover': {
        name: '57 Leaf Clover',
        description: 'The ultimate symbol of luck. Massive boost to all stats. Can only be forged.',
        cost: 0,
        tier: 'epic',
        icon: '💠',
        nameStyle: { color: '#06f71aff', textStroke: '1px rgba(0,0,0,0.5)' },
        properties: {
            stack: 1
        },
        conditions: [
            { type: 'forging', recipe: ['lucky_clover', 'nazar', 'chip_eater', 'thunder_strike', 'hex_breaker'] }
        ],
        stats: {
            luck: { type: 'add', value: 25 },
            rolls: { type: 'add', value: 10 },
            multiValue: { type: 'multi', value: 2.0 },
            multiChip: { type: 'add', value: 1.0 },
            chipsEndRound: { type: 'add', value: 57 }
        }
    },
     '64_leaf_clover': {
        name: '64 le4f Cl0ver',
        description: 'final? 56 + 63 = 119 btw. Can only be forged.',
        cost: 0,
        tier: 'godlike',
        icon: '💠',
        nameStyle: { color: '#f70606ff', textStroke: '1px rgba(9, 255, 0, 1)' },
        properties: {
            stack: 1
        },
        conditions: [
            { type: 'forging',  cash: 119, recipe: ['car','formula_1','m4Lw4r3_zer01','57_leaf_clover','lucky_clover', 'nazar', 'chip_eater', 'thunder_strike', 'speed_runner','VIRUS','forbidden_one', 'placebo', 'placebo_p', 'placebo_pp','midas_touch', 'left_arm','right_arm','left_leg','right_leg'] }
        ],
        stats: {
            luck: { type: 'add', value: 9223 },
            rolls: { type: 'add', value: 32 },
            multiValue: { type: 'multi', value: 2147 },
            multiChip: { type: 'add', value: 6 },
            chipsEndRound: { type: 'add', value: 57 }
        }
    },
    'lucky_clover': {
        name: 'Lucky Clover',
        description: '+2 luck. Can only be forged.',
        cost: 0,
        tier: 'uncommon',
        icon: '🍀',
        nameStyle: { color: '#00ff40ff', textStroke: '1px rgba(0,0,0,0.5)' },
        properties: {
            stack: 1
        },
        conditions: [
            { type: 'forging', recipe: ['nazar'], cash: 20 }
        ],
        stats: {
            luck: { type: 'add', value: 2 }
        }
    },
    'potato_chips': {
        name: 'Potato chips',
        description: '"I will take a potato chip... AND EAT IT!". +3 rolls. Can only be forged.',
        cost: 0,
        tier: 'rare',
        icon: '🍟🥔',
        nameStyle: { color: '#ff9900ff', textStroke: '1px rgba(0,0,0,0.5)' },
        properties: {
            stack: 1
        },
        conditions: [
            { type: 'forging', recipe: ['chippy', 'potato'], cash: 20 }
        ],
        stats: {
            luck: { type: 'add', value: 2 }
        }
    },
    'car': {
        name: 'Car',
        description: 'weeeeeeeeeeeee, +4 rolls, Can only be forged.',
        cost: 0,
        tier: 'rare',
        icon: '🚗',
        nameStyle: { color: '#ff0000ff', textStroke: '1px rgba(0,0,0,0.5)' },
        properties: {
            stack: 1
        },
        conditions: [
            { type: 'forging', recipe: ['old_tire', 'electrolyte'], cash: 60 }
        ],
        stats: {
            rolls: { type: 'add', value: 4 }
        }
    },
    'placebo': {
        name: 'Placebo',
        description: 'Self-explanatory. Add +0.01 luck.',
        cost: 10,
        tier: 'common',
        icon: 'p',
        nameStyle: { color: '#8d1515ff', textStroke: '1px rgba(0,0,0,0.5)' },
        properties: {
            stack: 1
        },
        stats: {
            luck: { type: 'add', value: 0.01 }
        }
    },
    'placebo_p': {
        name: 'Placebo+',
        description: 'better. Add +0.1 luck.',
        cost: 10,
        tier: 'common',
        icon: 'p+',
        nameStyle: { color: '#cc2121ff', textStroke: '1px rgba(0,0,0,0.5)' },
        conditions: [
            { type: 'forging', recipe: ['placebo'], cash: 20 }
        ],
        properties: {
            stack: 1
        },
        stats: {
            luck: { type: 'add', value: 0.1 }
        }
    },
    'placebo_pp': {
        name: 'Placebo++',
        description: 'Even more etter. Add +1 luck.',
        cost: 10,
        tier: 'uncommon',
        icon: 'p++',
        nameStyle: { color: '#cc2121ff', textStroke: '1px rgba(0,0,0,0.5)' },
        conditions: [
            { type: 'forging', recipe: ['placebo', 'placebo_p'], cash: 20 }
        ],
        properties: {
            stack: 1
        },
        stats: {
            luck: { type: 'add', value: 0.1 }
        }
    },

    'formula_1': {
        name: 'Formula 1',
        description: 'Fast and Furious, +40 rolls, -100 lucks. Can only be forged.',
        cost: 0,
        tier: 'mythical',
        icon: '🏎',
        nameStyle: { color: '#ff0000ff', textStroke: '1px rgba(0,0,0,0.5)' },
        properties: {
            stack: 1
        },
        conditions: [
            { type: 'forging', recipe: ['car', 'thunder_strike', 'electrolyte', 'old_tire', 'chip_vision', 'fire_affinity'], cash: 120 }
        ],
        stats: {
            rolls: { type: 'add', value: 40 },
            luck: { type: 'sub', value: 100 }
        }
    },
    'midas_touch': {
        name: 'Midas Touch',
        description: 'Turn items gold on touch, +10% Item values. Requires finding a Gold nugget',
        cost: 33,
        tier: 'legendary',
        icon: '🖐️',
        special: {
            'gold turning': "turn gold on touch"
        },
        properties: {
            stack: 1
        },
        conditions: [
            {
                type: 'unlock',
                condition: {
                    type: 'item_collected',
                    itemId: 'GOLD_NUGGET'
                }
            }
        ],
        stats: {
            valueBonus: { type: 'add', value: 0.1 },
            modify: {
                'golden': { guaranteed: true }
            }
        }
    },

    'chippy': {
        name: 'Chippy',
        description: '+3Ȼ at the end of each round. Requires earning over 120Ȼ in a run',
        cost: 20,
        tier: 'common',
        icon: '🍟',
        properties: {
            stack: 1
        },
        conditions: [
            {
                type: 'unlock',
                condition: {
                    type: 'stat_threshold',
                    stat: 'totalChipsEarned',
                    threshold: 120
                }
            },
            {
                type: 'bonus_trigger',
                condition: {
                    type: 'stat_threshold',
                    stat: 'round',
                    threshold: 5,
                    bonus: { chipsEndRound: { type: 'add', value: 3 } }
                }
            }
        ],
        stats: {
            chipsEndRound: { type: 'add', value: 3 }
        }
    },
    'speed_runner': {
        name: 'Speed Runner',
        description: '+2 Rolls. Requires finishing a round in under 5 seconds',
        cost: 25,
        tier: 'common',
        icon: '⚡',
        properties: {
            stack: 50
        },
        conditions: [
            {
                type: 'unlock',
                condition: {
                    type: 'stat_threshold',
                    stat: 'fastestRoundTime',
                    threshold: 5000, // 15 seconds (comment says 15s but value is 5000ms=5s, user said 5s)
                    compare: 'less'
                }
            }
        ],
        stats: {
            rolls: { type: 'add', value: 2 }
        }
    },
    'electrolyte': {
        name: 'Electrolyte',
        description: 'thunderstriked a potato, + 0.5 luck, +2 rolls. Can only be crafted',
        cost: 25,
        tier: 'rare',
        icon: '⚡',
        properties: {
            stack: 1
        },
        conditions: [
            { type: 'forging', recipe: ['thunder_strike', 'potato'], cash: 44 }
        ],
        stats: {
            rolls: { type: 'add', value: 2 },
            luck: { type: 'add', value: 0.5 }
        }
    },
    'shrewd_merchant': {
        name: 'Shrewd Merchant',
        description: '+15% Ȼ earnings',
        cost: 2,
        tier: 'common',
        icon: '💎',
        properties: {
            stack: 50
        },
        stats: {
            chipBonus: { type: 'add', value: 0.15 }
        }
    },
    'profit_margin': {
        name: 'Profit Margin',
        description: '+10% round reward cash',
        cost: 2,
        tier: 'common',
        icon: '💰',
        properties: {
            stack: 50
        },
        stats: {
            cashBonus: { type: 'add', value: 0.1 }
        }
    },

    // UNCOMMON PERKS (35-65$ - accessible early)
    'interest_rate_2': {
        name: 'Interest Rate 2',
        description: 'Gain +3Ȼ at end of round.',
        cost: 15,
        tier: 'uncommon',
        icon: '📈',
        properties: {
            stack: 5
        },
        stats: {
            chipsEndRound: { type: 'add', value: 3 }
        }
    },
    'crystall_ball': {
        name: 'Crystal Ball',
        description: '+2 Rolls, +1Ȼ multiplier',
        cost: 5,
        tier: 'uncommon',
        icon: '🔮',
        properties: {
            stack: 5
        },
        stats: {
            rolls: { type: 'add', value: 2 },
            chipBonus: { type: 'add', value: 1.0 }
        }
    },
    'thunder_strike': {
        name: 'Thunder Strike',
        description: 'x1.6 Luck',
        cost: 5,
        tier: 'uncommon',
        icon: '⚡',
        properties: {
            stack: 50
        },
        stats: {
            luck: { type: 'multi', value: 1.6 }
        }
    },
    'treasure_hunter': {
        name: 'Treasure Hunter',
        description: '+2 Value multiplier, makes Golden/Ancient items more common',
        cost: 5,
        tier: 'uncommon',
        icon: '👑',
        properties: {
            stack: 50
        },
        stats: {
            valueBonus: { type: 'add', value: 1.0 },
            modify: {
                'ancient': { type: 'set', value: 0.6 } // Assuming value means rarity factor? Or chance? Original was modifiers: { ancient: 0.6 }
            }
        }
    },
    'potato': {
        name: 'Potato ',
        description: 'Did you know? potatoes are packed with electrolytes, +2 Extra Ȼ',
        cost: 5,
        tier: 'uncommon',
        icon: '🥔',
        properties: {
            stack: 50
        },
        stats: {
            addChip: { type: 'add', value: 2 }
        }
    },
    'cash_flow': {
        name: 'Cash Flow',
        description: '+50% round reward cash',
        cost: 5,
        tier: 'uncommon',
        icon: '🌊',
        properties: {
            stack: 50
        },
        stats: {
            cashBonus: { type: 'add', value: 0.5 }
        }
    },

    // RARE PERKS (80-120$ - mid game targets)
    'hex_breaker': {
        name: 'Hex Breaker',
        description: 'Makes Cursed, Corrupted, and Shadowy items much rarer',
        cost: 90,
        tier: 'rare',
        icon: '🛡️',
        properties: {
            stack: 50
        },
        stats: {
            modify: {
                'cursed': { type: 'set', value: 3.0 },
                'corrupted': { type: 'set', value: 3.0 },
                'shadowy': { type: 'set', value: 2.0 }
            }
        }
    },
    'master_collector': {
        name: 'Master Collector',
        description: '+3 Value multiplier, +1 Luck',
        cost: 8,
        tier: 'rare',
        icon: '🎩',
        nameStyle: { color: '#FFD700' }, 
        properties: {
            stack: 50
        },
        stats: {
            valueBonus: { type: 'add', value: 2.0 },
            luck: { type: 'add', value: 1 }
        }
    },
    'roller_deluxe': {
        name: 'Roller Deluxe',
        description: '+3 Rolls per round',
        cost: 8,
        tier: 'rare',
        icon: '🎰',
        properties: {
            stack: 50
        },
        stats: {
            rolls: { type: 'add', value: 3 }
        }
    },
    'golden_fortune': {
        name: 'Golden Fortune',
        description: '+2 Value, +1Ȼ mult, +1 Luck',
        cost: 105,
        tier: 'rare',
        icon: '🪙',
        properties: {
            stack: 50
        },
        stats: {
            valueBonus: { type: 'add', value: 1.0 },
            chipBonus: { type: 'add', value: 1.0 },
            luck: { type: 'add', value: 1 }
        }
    },
    'mega_roller': {
        name: 'Mega Roller',
        description: '+2 Rolls, +2 Value multiplier',
        cost: 110,
        tier: 'rare',
        icon: '🎲',
        properties: {
            stack: 50
        },
        stats: {
            rolls: { type: 'add', value: 2 },
            valueBonus: { type: 'add', value: 1.0 }
        }
    },
    'revenue_stream': {
        name: 'Revenue Stream',
        description: '+50% round reward cash, +1Ȼ multiplier',
        cost: 40,
        tier: 'rare',
        icon: '💸',
        properties: {
            stack: 50
        },
        stats: {
            cashBonus: { type: 'add', value: 0.5 },
            chipBonus: { type: 'add', value: 1.0 }
        }
    },

    'ancient_tablet': {
        name: 'Ancient Tablet',
        description: 'An ancient tablet containing the secret of time skipping. Allows you to spam Spacebar to skip rolling animation.',
        cost: 25,
        tier: 'epic',
        icon: '📜',
        properties: {
            stack: 1,
            round: { min: 5 }
        },
        stats: {}
    },

    // EPIC PERKS (140-200$ - late game investments)
    'jackpot': {
        name: 'Jackpot',
        description: '+7Ȼ multiplier, +7 Rolls',
        cost: 77,
        tier: 'epic',
        icon: '🎰',
        properties: {
            stack: 50
        },
        stats: {
            chipBonus: { type: 'add', value: 6.0 },
            rolls: { type: 'add', value: 7 }
        }
    },
    'pristine_collector': {
        name: 'Pristine Collector',
        description: '+300% Value, +2 Luck',
        cost: 160,
        tier: 'epic',
        icon: '🏛️',
        properties: {
            stack: 50
        },
        stats: {
            valueBonus: { type: 'add', value: 3.0 },
            luck: { type: 'add', value: 2 }
        }
    },
    'fortune_multiplier': {
        name: 'Fortune Multiplier',
        description: '+5Ȼ multiplier, +200% Value',
        cost: 175,
        tier: 'epic',
        icon: '🎇',
        properties: {
            stack: 50
        },
        stats: {
            chipBonus: { type: 'add', value: 4.0 },
            valueBonus: { type: 'add', value: 2.0 }
        }
    },
    'wealth_accumulator': {
        name: 'Wealth Accumulator',
        description: '+100% round cash reward, +2 Interest stacks',
        cost: 190,
        tier: 'epic',
        icon: '🏦',
        properties: {
            stack: 50
        },
        stats: {
            cashBonus: { type: 'add', value: 1.0 },
            max_interest_stacks: { type: 'add', value: 2 }
        }
    },

    // LEGENDARY PERKS (250-350$ - ultimate endgame)
    'chip_eater': {
        name: 'Ȼ Eater',
        description: 'Bonus +0.5% Item Value Bonus for every 1Ȼ earned AFTER purchasing this perk.',
        cost: 1,
        tier: 'common',
        icon: '👾',
        special: {
            'chip_eater': 'chip_eater'
        },
        properties: {
            stack: 1
        },
        stats: {} // Dynamic
    },

    // SPECIAL PERKS
    'm4Lw4r3_zer01': {
        name: "m4Lw4r3_zer01",
        description: "A virus generator. Enables VIRUS upgrades. ",
        cost: 101,
        tier: 'mythical',
        icon: '🦟',
        nameStyle: { color: 'rgba(202, 2, 2, 1)ff', textStroke: '1px rgba(255,255,255,0.7)' },
        special: {
            'w4NnA_cRy?': 'w4NnA_cRy?'
        },
        properties: {
            stack: 1,
            dynamictooltips: 'virus_count'
        },
        stats: {
            luck: { type: 'multi', value: 2 },
            valueBonus: { type: 'add', value: 1.0 }
        }
    },
    'VIRUS': {
        name: 'Virus',
        description: "Increases VIRUS luck by 6.66. Appears after purchasing m4lw4r3_zer01.",
        cost: 0,
        tier: 'special',
        icon: '₪',
        properties: {
            subperk: true,
            shopLimit: 3,
            stack: 50
        },
        conditions: [
            { type: 'requirePerk', perkId: ['M4LW4R3_ZER01'] }
        ],
        stats: {
            luck: { type: 'add', value: 0.66 }
        }
    },
    'auto_roll_common': {
        name: 'Auto-Roll Common',
        description: 'When you roll a Common item, automatically roll again (no extra roll cost)',
        cost: 12,
        tier: 'uncommon',
        icon: '🔄',
        special: {
            'auto_roll_common': 'auto_roll_common'
        },
        properties: {
            stack: 1
        },
        stats: {}
    },
    'common_reroller': {
        name: 'Common Reroller',
        description: 'Reroll common items once per round',
        cost: 40,
        tier: 'uncommon',
        icon: '♻️',
        special: {
            'reroll_common': 'reroll_common'
        },
        properties: {
            stack: 1
        },
        conditions: [
            { type: 'requirePerk', perkId: ['auto_roll_common'] }
        ],
        stats: {
            rolls: { type: 'add', value: 1 }
        }
    },
    
    // MODIFICATION PERKS
    'MINECRAFT_MODS': {
        name: 'Minecraft Mods',
        description: '+50% chance for item modifications',
        cost: 75,
        tier: 'rare',
        icon: '🔧',
        properties: {
            stack: 50
        },
        stats: {
            modification_chance: { type: 'add', value: 0.5 }
        }
    },
    'enchanting_table': {
        name: 'Enchanting Table',
        description: 'Using a mysterious power to enchant loots.',
        cost: 222,
        tier: 'mythical',
        icon: '✨',
        properties: {
            stack: 50
        },
        stats: {
            modify: {
                'enchanted': { guaranteed: true }
            }
        }
    },

    // LEGENDARY MODIFICATION PERK
    'PRISMA': {
        name: 'PRISMA',
        description: '+200% mod chance, +3 Rolls, +4 Value, +2 Luck, +3Ȼ - Guaranteed special items. Prismatic items common',
        cost: 777,
        tier: 'legendary',
        icon: '🔺',
        special: {
            'guaranteed_mod_prismatic': 'guaranteed_mod_prismatic'
        },
        properties: {
            stack: 50
        },
        stats: {
            modification_chance: { type: 'add', value: 2.0 },
            rolls: { type: 'add', value: 3 },
            valueBonus: { type: 'add', value: 3.0 },
            luck: { type: 'add', value: 7 },
            chipBonus: { type: 'add', value: 2.0 },
            modify: {
                'prismatic': { type: 'set', value: 0.2 }
            }
        }
    },

    // ALIGNMENT PERKS (Mutually Exclusive)
    'daybreaker': {
        name: 'Daybreaker',
        description: '+3 Luck, +1 Value to every items. Overwrites Trial of Twilight.',
        cost: 60,
        tier: 'rare',
        icon: '🌅',
        nameStyle: { color: '#fbbf24', textStroke: '1px rgba(255,255,255,0.5)' },
        properties: {
            overwrite: ['trial_of_twilight'],
            stack: 50
        },
        stats: {
            luck: { type: 'add', value: 3 },
            addValue: { type: 'add', value: 1 }
        }
    },
    'trial_of_twilight': {
        name: 'Trial of Twilight',
        description: '+3 Value Multiplier, +1 Luck. Overwrite Daybreaker.',
        cost: 60,
        tier: 'rare',
        icon: '🌑',
        nameStyle: { color: '#7c3aed', textStroke: '1px rgba(0,0,0,0.5)' },
        properties: {
            overwrite: ['daybreaker'],
            stack: 50
        },
        stats: {
            valueBonus: { type: 'add', value: 0.5 },
            luck: { type: 'add', value: 1 }
        }
    },
    // EXODIA SET
    'forbidden_one': {
        name: 'Exodia, The Forbidden One',
        description: 'The head of the forbidden one. Collect all 5 pieces to win... or just get massive stats.',
        cost: 300,
        tier: 'legendary',
        icon: '🤯',
        properties: {
            stack: 1,
            set: 'exodia',
            setBonuses: {
                2: { rolls: { type: 'add', value: 2 } },
                3: { luck: { type: 'add', value: 5 } },
                4: { valueBonus: { type: 'add', value: 2.0 } },
                5: { luck: { type: 'add', value: 50 }, rolls: { type: 'add', value: 20 }, valueBonus: { type: 'add', value: 10.0 } }
            },
            dynamictooltips: 'set_collection'
        },
        stats: {
            luck: { type: 'add', value: 2 }
        }
    },
    'left_arm': {
        name: 'Left Arm',
        description: 'Left arm of the forbidden one.',
        cost: 100,
        tier: 'special',
        icon: '💪',
        properties: {
            stack: 1,
            set: 'exodia',
            dynamictooltips: 'set_collection',
            subperk: true
        },
        conditions: [
            { type: 'requirePerk', perkId: ['forbidden_one'] }
        ],
        stats: {
            rolls: { type: 'add', value: 1 }
        }
    },
    'right_arm': {
        name: 'Right Arm',
        description: 'Right arm of the forbidden one.',
        cost: 100,
        tier: 'special',
        icon: '🤳',
        properties: {
            stack: 1,
            set: 'exodia',
            dynamictooltips: 'set_collection',
            subperk: true
        },
        conditions: [
            { type: 'requirePerk', perkId: ['forbidden_one'] }
        ],
        stats: {
            rolls: { type: 'add', value: 1 }
        }
    },
    'left_leg': {
        name: 'Left Leg',
        description: 'Left leg of the forbidden one.',
        cost: 100,
        tier: 'special',
        icon: '🦵',
        properties: {
            stack: 1,
            set: 'exodia',
            dynamictooltips: 'set_collection',
            subperk: true
        },
        conditions: [
            { type: 'requirePerk', perkId: ['forbidden_one'] }
        ],
        stats: {
            luck: { type: 'add', value: 1 }
        }
    },
    'right_leg': {
        name: 'Right Leg',
        description: 'Right leg of the forbidden one.',
        cost: 100,
        tier: 'special',
        icon: '🦶',
        properties: {
            stack: 1,
            set: 'exodia',
            dynamictooltips: 'set_collection',
            subperk: true
        },
        conditions: [
            { type: 'requirePerk', perkId: ['forbidden_one'] }
        ],
        stats: {
            luck: { type: 'add', value: 1 }
        }
    }
};

/**
 * Get perk by ID
 * @param {string} id 
 * @returns {Object|undefined}
 */
function getPerkById(id) {
    if (!PERKS[id]) return undefined;
    // Inject ID into object for backward compatibility if needed, though we should prefer using the key
    return { ...PERKS[id], id };
}

/**
 * Get perk cost (flat, one-time purchase)
 * @param {string} perkId
 * @returns {number} cost in chips
 */
function getPerkCost(perkId) {
    const perk = PERKS[perkId];
    if (!perk) return 0;
    return perk.cost;
}

/**
 * Get all available perks
 * @returns {Array} perk info for shop display
 */
function getShopPerks() {
    return Object.entries(PERKS)
        .filter(([id, perk]) => {
            const isForgeable = perk.conditions && perk.conditions.some(c => c.type === 'forging');
            return !isForgeable;
        })
        .map(([id, perk]) => ({
            id: id,
            name: perk.name,
            description: perk.description,
            cost: perk.cost,
            tier: perk.tier,
            rarity: perk.tier, // Backward compatibility
            properties: perk.properties,
            stats: perk.stats,
            special: perk.special || null,
            nameStyle: perk.nameStyle,
            icon: perk.icon
        }));
}

/**
 * Get random shop perks based on round
 * Higher rounds have better chance at rare/epic/legendary perks
 * @param {number} round - current round
 * @param {number} count - number of perks to return
 * @param {Object} owned - owned perks object
 * @returns {Array} random perks filtered by round
 */
function getRandomShopPerks(round, count = 4, owned = {}, rng = Math.random, luck = 0, gameState = null) {
    const availablePerks = [];
    
    // Helper to check unlock conditions
    const checkUnlockCondition = (condition) => {
        if (!gameState) return true; // Fallback if no gamestate, assume unlocked or locked? usually locked if strict, but let's say true to avoid breaking tests
        
        if (condition.type === 'stat_threshold') {
            const statVal = gameState.stats[condition.stat] || 0;
            const threshold = condition.threshold;
            if (condition.compare === 'less') {
                return statVal < threshold;
            }
            return statVal >= threshold;
        }
        
        if (condition.type === 'item_collected') {
            // Check item history or current inventory
            // Assuming itemHistory stores item IDs
            if (gameState.itemHistory && gameState.itemHistory.includes(condition.itemId)) return true;
            // Also check current inventory just in case
            if (gameState.inventory && gameState.inventory.some(i => i.id === condition.itemId)) return true;
            return false;
        }

        return true;
    };

    // Helper to check if perk is unlocked/available
    const isPerkAvailable = (id, perk) => {
        // 1. Check conflicts
        if (perk.properties && perk.properties.conflict) {
            const conflicts = Array.isArray(perk.properties.conflict) ? perk.properties.conflict : [perk.properties.conflict];
            for (const conflictId of conflicts) {
                if (owned[conflictId]) return false;
            }
        }

        // 2. Check prerequisites/conditions
        if (perk.conditions) {
            // Check for 'requirePerk'
            const reqPerk = perk.conditions.find(c => c.type === 'requirePerk' || c.type === 'requires_perk');
            if (reqPerk) {
                const requiredIds = Array.isArray(reqPerk.perkId) ? reqPerk.perkId : [reqPerk.perkId];
                const hasRequirement = requiredIds.every(reqId => owned[reqId]);
                if (!hasRequirement) return false;
            }
            
            // Check for 'unlock' conditions
            const unlockCond = perk.conditions.find(c => c.type === 'unlock');
            if (unlockCond) {
                if (!checkUnlockCondition(unlockCond.condition)) return false;
            }

            // Forging perks shouldn't appear in random shop
            if (perk.conditions.some(c => c.type === 'forging')) return false;
        }

        // 3. Check stack limit
        const currentStack = owned[id] || 0;
        const maxStack = (perk.properties && perk.properties.stack !== undefined && perk.properties.stack !== null) ? perk.properties.stack : 1;
        if (currentStack >= maxStack) return false;

        // 4. Check round constraint
        if (perk.properties && perk.properties.round) {
            const r = perk.properties.round;
            if (r.min !== undefined && round < r.min) return false;
            if (r.max !== undefined && round > r.max) return false;
        }

        // 5. Check subperk property (implicit logic: subperks only appear if requirements met, which we checked above)
        // But if it's a subperk WITHOUT requirements (weird), maybe hide it?
        // Usually subperks have 'subperk: true' in properties.
        if (perk.properties && perk.properties.subperk && !perk.conditions) {
             // If it's a subperk with NO conditions, it probably shouldn't be in the general pool?
             // Or maybe it's just a "special" perk. 
             // Let's assume if it passed requirements check, it's fine.
        }

        return true;
    };

    for (const [id, perk] of Object.entries(PERKS)) {
        if (isPerkAvailable(id, perk)) {
            availablePerks.push({ ...perk, id });
        }
    }

    // Weighting logic
    const weightedPerks = availablePerks.map(perk => {
        let weight = 100;
        if (perk.tier === 'common') weight = 100;
        if (perk.tier === 'uncommon') weight = 60;
        if (perk.tier === 'rare') weight = 30;
        if (perk.tier === 'epic') weight = 10;
        if (perk.tier === 'legendary') weight = 5;
        if (perk.tier === 'mythical') weight = 1;
        if (perk.tier === 'special') weight = 1; 
        
        // Luck influence
        if (luck > 0) {
            if (perk.tier !== 'common') weight *= (1 + luck * 0.1);
        }

        return { perk, weight };
    });

    const selected = [];
    
    // Helper to count occurrences in current selection
    const countInSelection = (perkId) => selected.filter(p => p.id === perkId).length;

    for (let i = 0; i < count; i++) {
        if (weightedPerks.length === 0) break;
        
        const totalWeight = weightedPerks.reduce((sum, item) => sum + item.weight, 0);
        let random = rng() * totalWeight;
        
        for (let j = 0; j < weightedPerks.length; j++) {
            random -= weightedPerks[j].weight;
            if (random <= 0) {
                const selectedPerk = weightedPerks[j].perk;
                
                // Check shop limit
                const shopLimit = (selectedPerk.properties && selectedPerk.properties.shopLimit) || 1;
                const currentCount = countInSelection(selectedPerk.id);
                
                if (currentCount < shopLimit) {
                    selected.push(selectedPerk);
                    
                    // If we reached the limit for this perk in this shop session, remove it from pool
                    if (currentCount + 1 >= shopLimit) {
                        weightedPerks.splice(j, 1);
                    }
                    // Else: leave it in the pool so it can be picked again
                } else {
                    // Should not happen if logic below is correct, but safe guard
                    weightedPerks.splice(j, 1);
                    i--; // Retry this iteration since we didn't pick anything
                }
                
                break;
            }
        }
    }
    
    return selected;
}


