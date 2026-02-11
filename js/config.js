/**
 * Game configuration - single source of truth for tuning
 */
const CONFIG = {
    /** Rounds between bosses (boss on round 5, 10, 15, 20, 25) */
    BOSS_ROUND_INTERVAL: 5,

    /**
     * Round Cost Scaling Framework
     * Modify these values to tune the difficulty curve
     */
    ROUND_COST_SCALING: {
        // Normal Rounds
        NORMAL_BASE: 10,          // Starting cost for Round 1
        NORMAL_GROWTH: 5,         // Linear increase per round (easy early game)
        NORMAL_EXPONENT: 1.5,    // 15% compounding growth per round after threshold
        EXPONENTIAL_START_ROUND: 20, // Exponential growth kicks in after Route 3 (Round 15)
        
        // Boss Rounds
        BOSS_BASE: 50,           // Base cost for first boss
        BOSS_GROWTH: 50,          // Increase per route/boss
        BOSS_EXPONENT: 1.0        // Multiplier for boss scaling
    },

    /** Normal round chip costs: calculated dynamically based on scaling config */
    getNormalRoundCost(round) {
        // Use the scaling config
        const { NORMAL_BASE, NORMAL_GROWTH, NORMAL_EXPONENT, EXPONENTIAL_START_ROUND } = this.ROUND_COST_SCALING;
        
        // Base Linear Cost (Easy scaling)
        let cost = NORMAL_BASE + ((round - 1) * NORMAL_GROWTH);
        
        // Apply Exponential Scaling only after the "Easy Routes" are done
        // Default: After Round 15 (End of Route 3)
        if (round > EXPONENTIAL_START_ROUND) {
            const exponentialSteps = round - EXPONENTIAL_START_ROUND;
            // Compound the cost: CurrentLinearCost * (Exponent ^ Steps)
            cost = cost * Math.pow(NORMAL_EXPONENT, exponentialSteps);
        }

        return Math.floor(cost / 5) * 5; // Round to nearest 5 for clean numbers
    },

    /** Boss round chip cost = base for that route × multiplier (scales with route) */
    getBossChipCost(routeIndex) {
        const { BOSS_BASE, BOSS_GROWTH, BOSS_EXPONENT } = this.ROUND_COST_SCALING;
        
        // Base + (Route * Growth) * (Exponent ^ Route)
        const linearPart = routeIndex * BOSS_GROWTH;
        const finalCost = BOSS_BASE + (linearPart * Math.pow(BOSS_EXPONENT, routeIndex));
        
        return Math.floor(finalCost / 10) * 10; // Round to nearest 10
    },

    /** Number of exclusive augment choices offered after boss (player picks 3) */
    BOSS_AUGMENT_OFFER_COUNT: 6,
    BOSS_AUGMENT_PICK_COUNT: 3,

    /** Roll animation duration (ms) */
    ROLL_ANIMATION_MS: 1200,

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
