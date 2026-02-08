/**
 * Game State Management
 * Central source of truth for all game data
 */

class GameState {
    constructor(seed) {
        this.seed = (seed >>> 0) || (Date.now() >>> 0);
        this.rngStreams = this._createRngStreams(this.seed);
        this.resetGame();
    }

    _deriveSeed(label) {
        let h = 2166136261;
        const s = `${this.seed}:${label}`;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    _createRngStreams() {
        const mk = (label) => (typeof createSeededRng === 'function' ? createSeededRng(this._deriveSeed(label)) : Math.random);
        return {
            loot: mk('loot'),
            mods: mk('mods'),
            perks: mk('perks'),
            luck: mk('luck')
        };
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
        this.pendingNextWave = null;
        this._lowRarityStreak = 0;
        this.consumables = []; // Array of consumable items (max 9)
        this.lootPage = 0; // Current loot page for pagination (formerly inventoryPage)
        this.itemsPerPage = 10;
        this.potionsUsed = 0; // Track potions used during run

        // Stats Tracking
        this.stats = {
            startTime: Date.now(),
            totalChipsEarned: 0,
            totalCashEarned: 0,
            totalItemsRolled: 0,
            totalRollsUsed: 0
        };
    }

    getGameTime() {
        const now = Date.now();
        const diff = now - this.stats.startTime;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    addStat(key, value) {
        if (this.stats[key] !== undefined) {
            this.stats[key] += value;
        }
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
        this._lowRarityStreak = 0;
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
        let rarityWeightsOverride;
        if (typeof getWaveBasedRarityWeights === 'function') {
            const base = getWaveBasedRarityWeights(this.wave);
            const s = this._lowRarityStreak;
            if (s >= 6) {
                const boost = Math.min(10, (s - 5) * 2);
                rarityWeightsOverride = {
                    ...base,
                    rare: (base.rare || 0) + boost,
                    epic: (base.epic || 0) + Math.max(1, Math.floor(boost / 2)),
                    legendary: (base.legendary || 0) + Math.max(0, Math.floor(boost / 5)),
                    common: Math.max(0, (base.common || 0) - boost)
                };
            }
        }

        let thing = rollThing(this.wave, this.rngStreams.loot, rarityWeightsOverride);
        thing = applyModifications(thing, modChanceBoost, this.rngStreams.mods);
        const attrs = this.getAttributes();
        if (this.rngStreams.luck() < (attrs.luck || 0) * 0.05) {
            thing = applyModifications(rollThing(this.wave, this.rngStreams.loot, rarityWeightsOverride), modChanceBoost, this.rngStreams.mods);
        }
        thing.value = Math.round(thing.value * (1 + (attrs.value_multiplier || 0) * 0.1));

        if (thing.rarity === 'rare' || thing.rarity === 'epic' || thing.rarity === 'legendary') {
            this._lowRarityStreak = 0;
        } else {
            this._lowRarityStreak++;
        }
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

    /** Calculate chips earned for a given inventory value (applies chip_multiplier attribute) */
    calculateEarnedChipsForValue(value) {
        const attrs = this.getAttributes();
        const multiplier = 1 + (attrs.chip_multiplier || 0) * 0.15;
        return Math.round(Math.max(0, value) * multiplier);
    }

    /**
     * Sell inventory and earn chips for this wave
     */
    sellInventory() {
        const value = this.getInventoryValue();
        const earnedChips = this.calculateEarnedChipsForValue(value);
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

    /**
     * Add a consumable item (max 6 slots)
     */
    addConsumable(consumable) {
        if (this.consumables.length >= 9) {
            return { success: false, message: 'Consumable slots full!' };
        }
        this.consumables.push({
            ...consumable,
            id: Date.now() + Math.random()
        });
        return { success: true, message: `Added ${consumable.name}!` };
    }

    /**
     * Use a consumable by index
     */
    useConsumable(index) {
        if (index < 0 || index >= this.consumables.length) {
            return { success: false, message: 'Invalid consumable slot' };
        }
        const consumable = this.consumables[index];
        
        // Apply consumable effect
        if (consumable.effect === 'rolls') {
            this.rollsUsed = Math.max(0, this.rollsUsed - (consumable.value || 1));
        } else if (consumable.effect === 'cash') {
            this.currency.addCash(consumable.value || 10);
        } else if (consumable.effect === 'interest') {
            this.currency.addInterestStacks(consumable.value || 1);
        }
        
        // Track potion usage
        this.potionsUsed++;
        
        // Remove the consumable
        const name = consumable.name;
        this.consumables.splice(index, 1);
        return { success: true, message: `Used ${name}!`, effect: consumable.effect };
    }

    /**
     * Get paginated loot items (formerly inventory)
     */
    getPaginatedLoot() {
        const start = this.lootPage * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return {
            items: this.inventory.slice(start, end),
            totalItems: this.inventory.length,
            currentPage: this.lootPage,
            totalPages: Math.ceil(this.inventory.length / this.itemsPerPage),
            hasNext: end < this.inventory.length,
            hasPrev: this.lootPage > 0
        };
    }

    /**
     * Go to next loot page
     */
    nextLootPage() {
        const maxPage = Math.ceil(this.inventory.length / this.itemsPerPage) - 1;
        if (this.lootPage < maxPage) {
            this.lootPage++;
        }
    }

    /**
     * Go to previous loot page
     */
    prevLootPage() {
        if (this.lootPage > 0) {
            this.lootPage--;
        }
    }

    /**
     * Reset loot page when starting new wave
     */
    resetLootPage() {
        this.lootPage = 0;
    }

    /**
     * Get paginated inventory items (legacy - redirects to loot)
     */
    getPaginatedInventory() {
        return this.getPaginatedLoot();
    }

    /**
     * Go to next inventory page (legacy - redirects to loot)
     */
    nextInventoryPage() {
        this.nextLootPage();
    }

    /**
     * Go to previous inventory page (legacy - redirects to loot)
     */
    prevInventoryPage() {
        this.prevLootPage();
    }

    /**
     * Reset inventory page (legacy - redirects to loot)
     */
    resetInventoryPage() {
        this.resetLootPage();
    }
}
