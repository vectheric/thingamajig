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
        this.bonusInterestStacks = 0; // Stacks from consumables/bonuses
        
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
        if (amount > 0 && typeof game !== 'undefined' && game.gameState) {
            game.gameState.addStat('totalChipsEarned', amount);
        }
        this.chips = Math.max(0, this.chips + amount);
        
        if (typeof game !== 'undefined' && game.gameState && typeof game.gameState.updateMaxChips === 'function') {
            game.gameState.updateMaxChips(this.chips);
        }
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
     * Calculate and apply wave completion rewards
     * Called after successfully completing a wave
     * @param {number} maxInterestStacks - max interest stacks from perks
     * @param {Object} modifiers - { multiCash, addCash, subtractCash, divideCash }
     * @returns {Object} rewards breakdown
     */
    completeWave(maxInterestStacks = 5, modifiers = {}) {
        const baseReward = 5; // Base 5 dollars per wave
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
        
        // Interest is now fully dynamic, so no need to "set" stacks for next wave
        
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
     * Get wave entry cost (chips needed to continue wave)
     * Costs are much lower at the beginning to ease new players
     * @param {number} wave - current wave number
     * @returns {number} chips required
     */
    static getWaveEntryCost(wave) {
        // Use CONFIG if available
        if (typeof CONFIG !== 'undefined' && typeof CONFIG.getNormalWaveCost === 'function') {
            return CONFIG.getNormalWaveCost(wave);
        }
        // Fallback logic matching CONFIG
        // Early waves (1-3): Very cheap entry
        if (wave <= 3) return 15;
        // Mid waves (4-6): Moderate increase
        if (wave <= 6) return 25 + (wave - 4) * 5;
        // Late waves (7+): Progressive increase
        return 40 + (wave - 7) * 10;
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
