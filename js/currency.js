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
        // PERSISTENT currency - carries between waves
        this.cash = 4;
        this.interestStacks = 0; // 0-5, each stack = 1 bonus cash per wave completion
        
        // WAVE-LOCAL currency - resets each wave
        this.chips = 0;
    }

    /**
     * Reset only wave-local currency (chips)
     * Called at start of each wave
     */
    resetWaveLocalCurrency() {
        this.chips = 0;
    }

    /**
     * Add chips to current wave's budget
     * @param {number} amount - chips to add
     */
    addChips(amount) {
        this.chips = Math.max(0, this.chips + amount);
    }

    /**
     * Spend chips from current wave's budget
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
     * Get current interest stacks (0-maxStacks)
     * Each stack provides 1 bonus cash per wave completion
     * @returns {number} current stacks
     */
    getInterestStacks() {
        return this.interestStacks;
    }

    /**
     * Set interest stacks (clamped to 0-maxStacks)
     * @param {number} stacks - new stack count
     * @param {number} maxStacks - maximum allowed stacks
     */
    setInterestStacks(stacks, maxStacks = 5) {
        this.interestStacks = Math.max(0, Math.min(stacks, maxStacks));
    }

    /**
     * Calculate and apply wave completion rewards
     * Called after successfully completing a wave
     * @param {number} maxInterestStacks - max interest stacks from perks
     * @param {number} cashMultiplier - cash multiplier bonus from perks (0-based, e.g., 0.5 = +50%)
     * @returns {Object} rewards breakdown
     */
    completeWave(maxInterestStacks = 5, cashMultiplier = 0) {
        const baseReward = 5; // Base 5 dollars per wave
        const interestReward = this.interestStacks; // 1 dollar per interest stack
        const cashBonus = Math.round((baseReward + interestReward) * cashMultiplier);
        const totalReward = baseReward + interestReward + cashBonus;
        
        // Award cash
        this.addCash(totalReward);
        
        // Update interest stacks based on current cash
        // Every 5 cash = 1 interest stack
        const newStacks = Math.floor(this.cash / 5);
        this.setInterestStacks(newStacks, maxInterestStacks);
        
        return {
            baseReward,
            interestReward,
            cashBonus,
            totalReward,
            totalCash: this.cash,
            interestStacks: this.interestStacks
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
            interestStacks: this.interestStacks,
            interestLabel: `💰×${this.interestStacks}`,
            cashLabel: `${this.cash}$`,
            chipsLabel: `${this.chips}💰`
        };
    }

    /**
     * Get wave entry cost (chips needed to continue wave)
     * Costs are much lower at the beginning to ease new players
     * @param {number} wave - current wave number
     * @returns {number} chips required
     */
    static getWaveEntryCost(wave) {
        // Early waves (1-3): Very cheap entry
        if (wave <= 3) return 30;
        // Mid waves (4-6): Moderate increase
        if (wave <= 6) return 50 + (wave - 4) * 10;
        // Late waves (7+): Progressive increase
        return 90 + (wave - 7) * 20;
    }

    /**
     * Check if player can afford wave entry
     * @param {number} wave - current wave
     * @returns {boolean} true if enough chips
     */
    canAffordWaveEntry(wave) {
        const cost = CurrencySystem.getWaveEntryCost(wave);
        return this.chips >= cost;
    }

    /**
     * Pay for wave entry
     * @param {number} wave - current wave
     * @returns {boolean} true if payment successful
     */
    payWaveEntry(wave) {
        const cost = CurrencySystem.getWaveEntryCost(wave);
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
