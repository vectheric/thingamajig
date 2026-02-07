/**
 * Game configuration - single source of truth for tuning
 */
const CONFIG = {
    /** Waves between bosses (boss on wave 5, 10, 15, 20, 25) */
    BOSS_WAVE_INTERVAL: 5,

    /** Normal wave chip costs: [wave] => chips required to advance */
    getNormalWaveCost(wave) {
        if (wave <= 3) return 30;
        if (wave <= 6) return 50 + (wave - 4) * 10;
        return 90 + (wave - 7) * 20;
    },

    /** Boss wave chip cost = base for that route × multiplier (scales with route) */
    getBossChipCost(routeIndex) {
        const base = 150;
        const perRoute = 80;
        return base + routeIndex * perRoute; // Route 1: 230, R2: 310, R3: 390, R4: 470, R5: 550
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
 * @param {number} wave - 1-based wave number
 * @returns {boolean} true if this wave is a boss wave
 */
function isBossWave(wave) {
    return wave > 0 && wave % CONFIG.BOSS_WAVE_INTERVAL === 0;
}

/**
 * @param {number} wave - 1-based wave number
 * @returns {number} route index (0-based). Wave 1-4 = 0, 5 = boss 0, 6-9 = 1, 10 = boss 1, ...
 */
function getRouteIndex(wave) {
    return Math.floor((wave - 1) / CONFIG.BOSS_WAVE_INTERVAL);
}

/**
 * Boss index 0..4 for wave 5,10,15,20,25
 */
function getBossIndex(wave) {
    if (!isBossWave(wave)) return -1;
    return (wave / CONFIG.BOSS_WAVE_INTERVAL) - 1;
}
