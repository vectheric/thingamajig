/**
 * Game configuration - single source of truth for tuning
 */
const CONFIG = {
    /** Rounds between bosses (boss on round 5, 10, 15, 20, 25) */
    BOSS_ROUND_INTERVAL: 5,

    /** Normal round chip costs: [round] => chips required to advance */
    getNormalRoundCost(round) {
        if (round <= 3) return 15;
        if (round <= 6) return 25 + (round - 4) * 5;
        return 40 + (round - 7) * 10;
    },

    /** Boss round chip cost = base for that route × multiplier (scales with route) */
    getBossChipCost(routeIndex) {
        const base = 100;
        const perRoute = 50;
        return base + routeIndex * perRoute; // Route 1: 150, R2: 200, R3: 250, R4: 300, R5: 350
    },

    /** Number of exclusive perk choices offered after boss (player picks 3) */
    BOSS_PERK_OFFER_COUNT: 6,
    BOSS_PERK_PICK_COUNT: 3,

    /** Roll animation duration (ms) */
    ROLL_ANIMATION_MS: 800,

    /** Auto-roll common: max free rerolls per roll to prevent infinite loop */
    AUTO_ROLL_COMMON_MAX_REROLLS: 5,
};

/**
 * @param {number} round - 1-based round number
 * @returns {boolean} true if this round is a boss round
 */
function isBossRound(round) {
    return round > 0 && round % CONFIG.BOSS_ROUND_INTERVAL === 0;
}

/**
 * @param {number} round - 1-based round number
 * @returns {number} route index (0-based). Round 1-4 = 0, 5 = boss 0, 6-9 = 1, 10 = boss 1, ...
 */
function getRouteIndex(round) {
    return Math.floor((round - 1) / CONFIG.BOSS_ROUND_INTERVAL);
}

/**
 * Boss index 0..4 for round 5,10,15,20,25
 */
function getBossIndex(round) {
    if (!isBossRound(round)) return -1;
    return (round / CONFIG.BOSS_ROUND_INTERVAL) - 1;
}
