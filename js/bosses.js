/**
 * Boss and Route system - every 5th wave is a boss; defeat to gain route and choose exclusive perks
 */

const BOSS_EXCLUSIVE_PERKS = {
    // Boss 1 - Chip Hoarder (Wave 5)
    boss1_chip_surge: {
        id: 'boss1_chip_surge',
        name: 'Ȼ Surge',
        description: '+25% Ȼ earnings (Boss 1)',
        rarity: 'rare',
        attributes: { multiChip: 2 },
        source: 'boss1'
    },
    boss1_extra_hand: {
        id: 'boss1_extra_hand',
        name: 'Extra Hand',
        description: '+2 Rolls (Boss 1)',
        rarity: 'rare',
        attributes: { rolls: 2 },
        source: 'boss1'
    },
    boss1_lucky_coin: {
        id: 'boss1_lucky_coin',
        name: 'Lucky Coin',
        description: '+15% Luck (Boss 1)',
        rarity: 'rare',
        attributes: { luck: 3 },
        source: 'boss1'
    },
    boss1_value_eye: {
        id: 'boss1_value_eye',
        name: 'Value Eye',
        description: '+20% Item value (Boss 1)',
        rarity: 'rare',
        attributes: { multiValue: 2 },
        source: 'boss1'
    },
    boss1_interest_seed: {
        id: 'boss1_interest_seed',
        name: 'Interest Seed',
        description: '+1 Max Interest stack (Boss 1)',
        rarity: 'rare',
        attributes: { max_interest_stacks: 1 },
        source: 'boss1'
    },
    boss1_mod_dust: {
        id: 'boss1_mod_dust',
        name: 'Mod Dust',
        description: '+30% Mod chance (Boss 1)',
        rarity: 'rare',
        attributes: { modification_chance: 0.3 },
        source: 'boss1'
    },

    // Boss 2 - Value Guardian (Wave 10)
    boss2_golden_vein: {
        id: 'boss2_golden_vein',
        name: 'Golden Vein',
        description: '+35% Item value (Boss 2)',
        rarity: 'epic',
        attributes: { multiValue: 4 },
        source: 'boss2'
    },
    boss2_roll_master: {
        id: 'boss2_roll_master',
        name: 'Roll Master',
        description: '+3 Rolls (Boss 2)',
        rarity: 'epic',
        attributes: { rolls: 3 },
        source: 'boss2'
    },
    boss2_chip_hoard: {
        id: 'boss2_chip_hoard',
        name: 'Ȼ Hoard',
        description: '+30% Ȼ (Boss 2)',
        rarity: 'epic',
        attributes: { multiChip: 3 },
        source: 'boss2'
    },
    boss2_cash_rush: {
        id: 'boss2_cash_rush',
        name: 'Cash Rush',
        description: '+75% wave cash (Boss 2)',
        rarity: 'epic',
        attributes: { multiCash: 0.75 },
        source: 'boss2'
    },
    boss2_pristine_luck: {
        id: 'boss2_pristine_luck',
        name: 'Pristine Luck',
        description: '+25% Luck (Boss 2)',
        rarity: 'epic',
        attributes: { luck: 5 },
        source: 'boss2'
    },
    boss2_enchanted_touch: {
        id: 'boss2_enchanted_touch',
        name: 'Enchanted Touch',
        description: '+50% Mod chance (Boss 2)',
        rarity: 'epic',
        attributes: { modification_chance: 0.5 },
        source: 'boss2'
    },

    // Boss 3 - Fortune Keeper (Wave 15)
    boss3_fortune_aura: {
        id: 'boss3_fortune_aura',
        name: 'Fortune Aura',
        description: '+4 Rolls, +20% Value (Boss 3)',
        rarity: 'epic',
        attributes: { rolls: 4, multiValue: 2 },
        source: 'boss3'
    },
    boss3_mega_chips: {
        id: 'boss3_mega_chips',
        name: 'Mega Ȼ',
        description: '+45% Ȼ (Boss 3)',
        rarity: 'epic',
        attributes: { multiChip: 5 },
        source: 'boss3'
    },
    boss3_interest_king: {
        id: 'boss3_interest_king',
        name: 'Interest King',
        description: '+2 Interest stacks (Boss 3)',
        rarity: 'epic',
        attributes: { max_interest_stacks: 2 },
        source: 'boss3'
    },
    boss3_legend_luck: {
        id: 'boss3_legend_luck',
        name: 'Legend Luck',
        description: '+35% Luck (Boss 3)',
        rarity: 'epic',
        attributes: { luck: 7 },
        source: 'boss3'
    },
    boss3_artifact_chance: {
        id: 'boss3_artifact_chance',
        name: 'Artifact Chance',
        description: '+70% Mod chance (Boss 3)',
        rarity: 'epic',
        attributes: { modification_chance: 0.7 },
        source: 'boss3'
    },
    boss3_cash_flow_master: {
        id: 'boss3_cash_flow_master',
        name: 'Cash Flow Master',
        description: '+100% wave cash (Boss 3)',
        rarity: 'epic',
        attributes: { multiCash: 1.0 },
        source: 'boss3'
    },

    // Boss 4 - Greed Lord (Wave 20)
    boss4_greed_embrace: {
        id: 'boss4_greed_embrace',
        name: 'Greed Embrace',
        description: '+5 Rolls, +30% Value, +40% Chips (Boss 4)',
        rarity: 'legendary',
        attributes: { rolls: 5, multiValue: 3, multiChip: 4 },
        source: 'boss4'
    },
    boss4_omnipotent_roll: {
        id: 'boss4_omnipotent_roll',
        name: 'Omnipotent Roll',
        description: '+6 Rolls (Boss 4)',
        rarity: 'legendary',
        attributes: { rolls: 6 },
        source: 'boss4'
    },
    boss4_golden_rain: {
        id: 'boss4_golden_rain',
        name: 'Golden Rain',
        description: '+50% Value (Boss 4)',
        rarity: 'legendary',
        attributes: { multiValue: 5 },
        source: 'boss4'
    },
    boss4_chip_tycoon: {
        id: 'boss4_chip_tycoon',
        name: 'Ȼ Tycoon',
        description: '+60% Ȼ (Boss 4)',
        rarity: 'legendary',
        attributes: { multiChip: 6 },
        source: 'boss4'
    },
    boss4_interest_emperor: {
        id: 'boss4_interest_emperor',
        name: 'Interest Emperor',
        description: '+3 Interest stacks (Boss 4)',
        rarity: 'legendary',
        attributes: { max_interest_stacks: 3 },
        source: 'boss4'
    },
    boss4_mystic_overflow: {
        id: 'boss4_mystic_overflow',
        name: 'Mystic Overflow',
        description: '+100% Mod chance (Boss 4)',
        rarity: 'legendary',
        attributes: { modification_chance: 1.0 },
        source: 'boss4'
    },

    // Boss 5 - Supreme Collector (Wave 25)
    boss5_supreme_roll: {
        id: 'boss5_supreme_roll',
        name: 'Supreme Roll',
        description: '+7 Rolls (Boss 5)',
        rarity: 'legendary',
        attributes: { rolls: 7 },
        source: 'boss5'
    },
    boss5_supreme_value: {
        id: 'boss5_supreme_value',
        name: 'Supreme Value',
        description: '+60% Value (Boss 5)',
        rarity: 'legendary',
        attributes: { multiValue: 6 },
        source: 'boss5'
    },
    boss5_supreme_chips: {
        id: 'boss5_supreme_chips',
        name: 'Supreme Ȼ',
        description: '+75% Ȼ (Boss 5)',
        rarity: 'legendary',
        attributes: { multiChip: 8 },
        source: 'boss5'
    },
    boss5_supreme_luck: {
        id: 'boss5_supreme_luck',
        name: 'Supreme Luck',
        description: '+50% Luck (Boss 5)',
        rarity: 'legendary',
        attributes: { luck: 10 },
        source: 'boss5'
    },
    boss5_supreme_interest: {
        id: 'boss5_supreme_interest',
        name: 'Supreme Interest',
        description: '+4 Interest stacks (Boss 5)',
        rarity: 'legendary',
        attributes: { max_interest_stacks: 4 },
        source: 'boss5'
    },
    boss5_supreme_mod: {
        id: 'boss5_supreme_mod',
        name: 'Supreme Mod',
        description: '+150% Mod chance (Boss 5)',
        rarity: 'legendary',
        attributes: { modification_chance: 1.5 },
        source: 'boss5'
    },
};

const BOSSES = [
    {
        id: 'boss1',
        index: 0,
        name: 'Ȼ Hoarder',
        description: 'Collect enough Ȼ to overwhelm the hoard.',
        wave: 5,
        perkIds: Object.keys(BOSS_EXCLUSIVE_PERKS).filter(id => BOSS_EXCLUSIVE_PERKS[id].source === 'boss1'),
    },
    {
        id: 'boss2',
        index: 1,
        name: 'Value Guardian',
        description: 'Prove your worth in Ȼ.',
        wave: 10,
        perkIds: Object.keys(BOSS_EXCLUSIVE_PERKS).filter(id => BOSS_EXCLUSIVE_PERKS[id].source === 'boss2'),
    },
    {
        id: 'boss3',
        index: 2,
        name: 'Fortune Keeper',
        description: 'Fortune demands a tribute.',
        wave: 15,
        perkIds: Object.keys(BOSS_EXCLUSIVE_PERKS).filter(id => BOSS_EXCLUSIVE_PERKS[id].source === 'boss3'),
    },
    {
        id: 'boss4',
        index: 3,
        name: 'Greed Lord',
        description: 'Only immense wealth can satisfy.',
        wave: 20,
        perkIds: Object.keys(BOSS_EXCLUSIVE_PERKS).filter(id => BOSS_EXCLUSIVE_PERKS[id].source === 'boss4'),
    },
    {
        id: 'boss5',
        index: 4,
        name: 'Supreme Collector',
        description: 'The ultimate Ȼ challenge.',
        wave: 25,
        perkIds: Object.keys(BOSS_EXCLUSIVE_PERKS).filter(id => BOSS_EXCLUSIVE_PERKS[id].source === 'boss5'),
    },
];

function getBossByWave(wave) {
    return BOSSES.find(b => b.wave === wave) || null;
}

function getBossById(bossId) {
    return BOSSES.find(b => b.id === bossId) || null;
}

/**
 * Get N random exclusive perks for a boss (no duplicates, not already owned)
 */
function getBossPerkOptions(bossId, count, ownedPerkIds) {
    const boss = getBossById(bossId);
    if (!boss) return [];
    const pool = boss.perkIds
        .map(id => BOSS_EXCLUSIVE_PERKS[id])
        .filter(p => p && !ownedPerkIds.includes(p.id));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

function getBossPerkById(perkId) {
    return BOSS_EXCLUSIVE_PERKS[perkId] || null;
}
