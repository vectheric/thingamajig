/**
 * Currency System
 * Framework for managing multiple currencies: Cash and Chips
 * Easy to extend with more currencies
 */

class CurrencySystem {
    constructor() {
        this.reset();
    }

    /**
     * Reset all currencies to starting values
     */
    reset() {
        // PERSISTENT currency - carries between rounds
        this.cash = 4;
        this.bonusInterestStacks = 0; // Stacks from consumables/bonuses
        
        // ROUND-LOCAL currency - resets each round
        this.chips = 0;
    }

    /**
     * Reset only round-local currency (chips)
     * Called at start of each round
     */
    resetRoundLocalCurrency() {
        this.chips = 0;
    }

    /**
     * Add chips to current round's budget
     * @param {number} amount - chips to add
     */
    addChips(amount) {
        if (amount > 0 && typeof game !== 'undefined' && game.gameState) {
            game.gameState.addStat('totalChipsEarned', amount);
        }
        this.chips = Math.max(0, this.chips + amount);
        
        if (typeof game !== 'undefined' && game.gameState && typeof game.gameState.updateMaxChips === 'function') {
            game.gameState.updateMaxChips(this.chips);
        }
    }

    /**
     * Spend chips from current round's budget
     * @param {number} amount - chips to spend
     * @returns {boolean} true if successful, false if insufficient chips
     */
    spendChips(amount) {
        if (this.chips >= amount) {
            this.chips -= amount;
            return true;
        }
        return false;
    }

    /**
     * Add cash (persistent currency)
     * @param {number} amount - cash to add
     */
    addCash(amount) {
        if (amount > 0 && typeof game !== 'undefined' && game.gameState) {
            game.gameState.addStat('totalCashEarned', amount);
        }
        this.cash = Math.max(0, this.cash + amount);
    }

    /**
     * Spend cash (persistent currency)
     * @param {number} amount - cash to spend
     * @returns {boolean} true if successful, false if insufficient cash
     */
    spendCash(amount) {
        if (this.cash >= amount) {
            this.cash -= amount;
            return true;
        }
        return false;
    }

    /**
     * Get current interest stacks
     * Dynamically calculated based on current cash (floor(cash/5)) + bonus stacks
     * @param {number} maxStacks - maximum allowed stacks for cash-based interest
     * @returns {number} current stacks
     */
    getInterestStacks(maxStacks = 5) {
        const cashInterest = Math.floor(this.cash / 5);
        return Math.min(cashInterest, maxStacks) + this.bonusInterestStacks;
    }

    /**
     * Add bonus interest stacks (from consumables etc)
     * @param {number} amount 
     */
    addBonusInterestStack(amount) {
        this.bonusInterestStacks += amount;
    }

    /**
     * Calculate and apply round completion rewards
     * Called after successfully completing a round
     * @param {number} maxInterestStacks - max interest stacks from perks
     * @param {Object} modifiers - { multiCash, addCash, subtractCash, divideCash }
     * @returns {Object} rewards breakdown
     */
    completeRound(maxInterestStacks = 5, modifiers = {}) {
        const baseReward = 5; // Base 5 dollars per round
        const interestReward = this.getInterestStacks(maxInterestStacks); // Dynamic interest based on current cash
        
        // Apply modifiers to calculate total cash
        // Formula: ((base + interest) * multi) + add - sub / divide
        // setCash overrides base + interest calculation if present
        let cash = baseReward + interestReward;
        
        if (modifiers.setCash !== undefined && modifiers.setCash !== null) {
            cash = modifiers.setCash;
        }

        const multi = modifiers.multiCash || 1;
        const add = modifiers.addCash || 0;
        const sub = modifiers.subtractCash || 0;
        const divide = modifiers.divideCash || 1;
        
        cash = (cash * multi) + add - sub;
        if (divide > 0) cash /= divide;
        
        const totalReward = Math.max(0, Math.round(cash));
        
        // Calculate bonus for display (total - base - interest)
        const cashBonus = totalReward - baseReward - interestReward;
        
        // Award cash
        this.addCash(totalReward);
        
        // Interest is now fully dynamic, so no need to "set" stacks for next round
        
        return {
            baseReward,
            interestReward,
            cashBonus,
            totalReward,
            totalCash: this.cash,
            interestStacks: interestReward
        };
    }

    /**
     * Get formatted currency display
     * @returns {Object} formatted strings for UI
     */
    getDisplay() {
        return {
            cash: this.cash,
            chips: this.chips,
            interestStacks: this.getInterestStacks(),
            interestLabel: `💰×${this.getInterestStacks()}`,
            cashLabel: `${this.cash}$`,
            chipsLabel: `${this.chips}Ȼ`
        };
    }

    /**
     * Get round entry cost (chips needed to continue round)
     * Costs are much lower at the beginning to ease new players
     * @param {number} round - current round number
     * @returns {number} chips required
     */
    static getRoundEntryCost(round) {
        // Use CONFIG if available
        if (typeof CONFIG !== 'undefined' && typeof CONFIG.getNormalRoundCost === 'function') {
            return CONFIG.getNormalRoundCost(round);
        }
        // Fallback logic matching CONFIG
        // Early rounds (1-3): Very cheap entry
        if (round <= 3) return 15;
        // Mid rounds (4-6): Moderate increase
        if (round <= 6) return 25 + (round - 4) * 5;
        // Late rounds (7+): Progressive increase
        return 40 + (round - 7) * 10;
    }

    /**
     * Check if player can afford round entry
     * @param {number} round - current round
     * @returns {boolean} true if enough chips
     */
    canAffordRoundEntry(round) {
        const cost = CurrencySystem.getRoundEntryCost(round);
        return this.chips >= cost;
    }

    /**
     * Pay for round entry
     * @param {number} round - current round
     * @returns {boolean} true if payment successful
     */
    payRoundEntry(round) {
        const cost = CurrencySystem.getRoundEntryCost(round);
        return this.spendChips(cost);
    }
}

/**
 * Create a new currency system instance
 * @returns {CurrencySystem}
 */
function createCurrencySystem() {
    return new CurrencySystem();
}
