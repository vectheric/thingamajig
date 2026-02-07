/**
 * Game State Management
 * Central source of truth for all game data
 */

class GameState {
    constructor() {
        this.resetGame();
    }

    resetGame() {
        this.wave = 1;
        this.currency = new CurrencySystem();
        this.inventory = [];
        this.perksPurchased = {};
        this.perkOrder = []; // order of perk ids for topbar display
        this.rollsUsed = 0;
        this.rareItemStreak = 0;
        this.pendingBossReward = null;
    }

    /** Reorder inventory (drag & drop) */
    reorderInventory(fromIndex, toIndex) {
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= this.inventory.length || toIndex >= this.inventory.length) return;
        const [item] = this.inventory.splice(fromIndex, 1);
        this.inventory.splice(toIndex, 0, item);
    }

    /**
     * Get chips (wave-local currency)
     */
    get chips() {
        return this.currency.chips;
    }

    /**
     * Get cash (persistent currency)
     */
    get cash() {
        return this.currency.cash;
    }

    /**
     * Get interest stacks
     */
    get interestStacks() {
        return this.currency.getInterestStacks();
    }

    /**
     * Calculate current attributes from purchased perks
     * @returns {Object} calculated attributes
     */
    getAttributes() {
        const attributes = {
            rolls: 0,
            luck: 0,
            value_multiplier: 0,
            chip_multiplier: 0,
            cash_multiplier: 0,
            max_interest_stacks: 5, // Default max, can be increased by perks
            modification_chance: 0
        };

        for (const perkId in this.perksPurchased) {
            const count = this.perksPurchased[perkId];
            let perk = PERKS[Object.keys(PERKS).find(k => PERKS[k].id === perkId)];
            if (!perk && typeof getBossPerkById === 'function') perk = getBossPerkById(perkId);
            if (perk && perk.attributes) {
                for (const attr in perk.attributes) {
                    attributes[attr] = (attributes[attr] || 0) + (perk.attributes[attr] * count);
                }
            }
        }
        return attributes;
    }

    /**
     * Start a new wave
     */
    startWave() {
        this.rollsUsed = 0;
        this.inventory = [];
        this.rareItemStreak = 0; // Reset streak at wave start
        this.currency.resetWaveLocalCurrency(); // Reset chips for new wave
    }

    /**
     * Get wave entry cost in chips (next wave: normal or boss)
     */
    getWaveEntryCost() {
        const nextWave = this.wave + 1;
        if (typeof isBossWave === 'function' && isBossWave(nextWave)) {
            const routeIndex = typeof getRouteIndex === 'function' ? getRouteIndex(nextWave) : 0;
            return CONFIG.getBossChipCost(routeIndex);
        }
        return CONFIG.getNormalWaveCost(nextWave);
    }

    /** True if current wave is a boss wave */
    isBossWave() {
        return typeof isBossWave === 'function' && isBossWave(this.wave);
    }

    /** Current route index (0-based) */
    getRouteIndex() {
        return typeof getRouteIndex === 'function' ? getRouteIndex(this.wave) : 0;
    }

    /** Boss for current wave, or null */
    getCurrentBoss() {
        return typeof getBossByWave === 'function' ? getBossByWave(this.wave) : null;
    }

    /** True if player has auto-roll common perk */
    hasAutoRollCommon() {
        return !!this.perksPurchased['auto_roll_common'];
    }

    /**
     * Get available rolls for this wave
     */
    getAvailableRolls() {
        const baseRolls = 3;
        const attrs = this.getAttributes();
        const extraRolls = attrs.rolls;
        return baseRolls + extraRolls;
    }

    /**
     * Get remaining rolls
     */
    getRemainingRolls() {
        return this.getAvailableRolls() - this.rollsUsed;
    }

    /**
     * Roll a thing and add to inventory. Handles auto-roll common (reroll without spending another roll).
     * @returns {Object|null} rolled thing or null if no rolls left
     */
    rollThing() {
        if (this.getRemainingRolls() <= 0) return null;

        this.rollsUsed++;
        const attrs = this.getAttributes();
        const modChanceBoost = 1.0 + (attrs.modification_chance || 0);
        const maxAutoRerolls = (typeof CONFIG !== 'undefined' && CONFIG.AUTO_ROLL_COMMON_MAX_REROLLS) || 5;

        let thing = this._doOneRoll(modChanceBoost);
        let autoRerolls = 0;
        while (this.hasAutoRollCommon() && thing.rarity === 'common' && autoRerolls < maxAutoRerolls) {
            thing = this._doOneRoll(modChanceBoost);
            autoRerolls++;
        }

        this.inventory.push(thing);
        return thing;
    }

    _doOneRoll(modChanceBoost) {
        let thing = rollThing(this.wave);
        thing = applyModifications(thing, modChanceBoost);
        const attrs = this.getAttributes();
        if (Math.random() < (attrs.luck || 0) * 0.05) {
            thing = applyModifications(rollThing(this.wave), modChanceBoost);
        }
        thing.value = Math.round(thing.value * (1 + (attrs.value_multiplier || 0) * 0.1));
        return thing;
    }

    /**
     * Update rare item streak for dopamine rewards
     */
    updateRareStreak(rarity) {
        if (rarity === 'epic' || rarity === 'legendary') {
            this.rareItemStreak++;
        } else {
            this.rareItemStreak = 0;
        }
        return this.rareItemStreak;
    }

    /**
     * Get rare item streak message
     */
    getRareStreakMessage() {
        if (this.rareItemStreak === 2) return 'Double Rare! 🔥';
        if (this.rareItemStreak === 3) return 'Triple Rare! 🔥🔥';
        if (this.rareItemStreak >= 5) return `${this.rareItemStreak}x Rare Combo! 🔥💥`;
        return null;
    }

    /**
     * Calculate total inventory value
     */
    getInventoryValue() {
        return this.inventory.reduce((sum, thing) => sum + thing.value, 0);
    }

    /**
     * Sell inventory and earn chips for this wave
     */
    sellInventory() {
        const value = this.getInventoryValue();
        const attrs = this.getAttributes();
        const multiplier = 1 + attrs.chip_multiplier * 0.15;
        const earnedChips = Math.round(value * multiplier);
        this.currency.addChips(earnedChips);
        return earnedChips;
    }

    /**
     * Complete a wave and earn rewards
     * Awards cash and applies interest, including cash bonuses from perks
     * @returns {Object} rewards breakdown
     */
    completeWave() {
        const attrs = this.getAttributes();
        const maxStacks = attrs.max_interest_stacks || 5;
        const cashMultiplier = attrs.cash_multiplier || 0;
        return this.currency.completeWave(maxStacks, cashMultiplier);
    }

    /**
     * Advance to next wave (pay chip cost). On boss wave completion, sets pendingBossReward instead.
     */
    advanceWave() {
        const cost = this.getWaveEntryCost();
        if (!this.currency.spendChips(cost)) {
            return { success: false, message: `Not enough chips! Need ${cost}, have ${this.chips}` };
        }
        this.wave += 1;
        const nowOnBoss = typeof isBossWave === 'function' && isBossWave(this.wave);
        if (nowOnBoss) {
            const boss = typeof getBossByWave === 'function' ? getBossByWave(this.wave) : null;
            if (boss) {
                const owned = Object.keys(this.perksPurchased).filter(id => this.perksPurchased[id]);
                const options = typeof getBossPerkOptions === 'function'
                    ? getBossPerkOptions(boss.id, CONFIG.BOSS_PERK_OFFER_COUNT, owned)
                    : [];
                this.pendingBossReward = { bossId: boss.id, boss, perkOptions: options };
                this.startWave();
                return { success: true, message: 'Boss defeated!', isBossReward: true };
            }
        }
        this.startWave();
        return { success: true, message: `Advanced to wave ${this.wave}!` };
    }

    /** After confirming 3 boss perks, advance to next wave and clear pending */
    confirmBossReward() {
        if (!this.pendingBossReward) return;
        this.pendingBossReward = null;
        this.wave += 1;
        this.startWave();
    }

    /** After defeating boss: pick a perk from boss reward (call 3 times). Returns false if already picked 3 or invalid. */
    chooseBossPerk(perkId) {
        if (!this.pendingBossReward) return false;
        const { perkOptions } = this.pendingBossReward;
        const perk = typeof getBossPerkById === 'function' ? getBossPerkById(perkId) : null;
        if (!perk || !perkOptions.some(p => p.id === perkId)) return false;
        if (this.perksPurchased[perkId]) return false;
        const picked = Object.keys(this.perksPurchased).filter(id => perkOptions.some(p => p.id === id)).length;
        if (picked >= CONFIG.BOSS_PERK_PICK_COUNT) return false;
        this.perksPurchased[perkId] = true;
        if (!this.perkOrder.includes(perkId)) this.perkOrder.push(perkId);
        return true;
    }

    /** Returns number of boss perks picked this reward round */
    getBossPerksPickedCount() {
        if (!this.pendingBossReward) return 0;
        return Object.keys(this.perksPurchased).filter(id =>
            this.pendingBossReward.perkOptions.some(p => p.id === id)).length;
    }


    /**
     * Purchase a perk (one-time only, costs CASH not chips)
     * @param {string} perkId
     * @returns {Object} { success: boolean, message: string }
     */
    purchasePerk(perkId) {
        // Check if already purchased
        if (this.perksPurchased[perkId]) {
            return { 
                success: false, 
                message: 'You already own this perk!' 
            };
        }

        // Find the perk
        const perkKey = Object.keys(PERKS).find(k => PERKS[k].id === perkId);
        if (!perkKey) return { success: false, message: 'Perk not found' };

        const perk = PERKS[perkKey];
        const cost = getPerkCost(perkId);

        // Perks cost CASH (persistent currency), not chips
        if (this.cash < cost) {
            return {
                success: false,
                message: `Not enough cash! Need ${cost}$, have ${this.cash}$`
            };
        }

        this.currency.spendCash(cost);
        this.perksPurchased[perkId] = true;
        if (!this.perkOrder.includes(perkId)) this.perkOrder.push(perkId);

        return {
            success: true,
            message: `Purchased ${perk.name}!`
        };
    }

    /**
     * Get formatted attributes for display
     */
    getFormattedAttributes() {
        const attrs = this.getAttributes();
        const result = {
            'Rolls/Wave': this.getAvailableRolls(),
            'Luck': `${attrs.luck * 5}%`,
            'Value +': `${attrs.value_multiplier * 10}%`,
            'Chips +': `${attrs.chip_multiplier * 15}%`,
            'Cash Bonus': `${attrs.cash_multiplier * 100}%`
        };
        if (attrs.modification_chance && attrs.modification_chance > 0) {
            result['Mod Chance'] = `+${Math.round(attrs.modification_chance * 100)}%`;
        }
        return result;
    }
}
