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
        this._badLuckStreak = 0;
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
        
        // Perk-specific tracking
        this.chipEaterStartValue = 0;
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
            let perk = typeof getPerkById === 'function' ? getPerkById(perkId) : Object.values(PERKS).find(p => p.id === perkId);
            if (!perk && typeof getBossPerkById === 'function') perk = getBossPerkById(perkId);
            
            // Special handling for Nullification (dynamic scaling)
            if (perkId === 'nullificati0n') {
                const wavesActive = typeof count === 'number' ? count : 0;
                attributes.luck = (attributes.luck || 0) + (0.404 * wavesActive);
                attributes.rolls = (attributes.rolls || 0) + (4 * wavesActive);
                continue; 
            }

            // Special handling for Chip Eater (dynamic scaling)
            if (perkId === 'chip_eater') {
                const totalChips = this.stats.totalChipsEarned || 0;
                const startValue = this.chipEaterStartValue || 0;
                const earnedSincePurchase = Math.max(0, totalChips - startValue);
                // 0.5 Value Multiplier per 1 Chip earned since purchase
                attributes.value_multiplier = (attributes.value_multiplier || 0) + (0.5 * earnedSincePurchase);
                continue;
            }

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
        // Bad luck streak persists across waves until a high tier item is found

        // Nullification Scaling: Increment active waves count
        if (this.perksPurchased['nullificati0n']) {
             // Store start wave if not present (legacy support or first run)
             // But actually, we need to track how many waves passed.
             // Let's use a specific counter for Nullification stacks.
             // We can store it in perksPurchased as a value? No, perksPurchased is usually boolean or stack count.
             // For Nullification, it's not "stacks" of the perk, it's "waves active".
             // Let's create a separate counter in stats or just use perksPurchased value if it's not boolean.
             // Actually, for Nullification, we can use perksPurchased['nullificati0n'] as the counter.
             // Initial purchase sets it to 1 (or 0). Each wave start increments it.
             // Wait, purchasePerk sets it to true. Let's change purchase logic for this specific perk or check here.
             
             if (this.perksPurchased['nullificati0n'] === true) {
                 this.perksPurchased['nullificati0n'] = 0; // Initialize counter
             }
             this.perksPurchased['nullificati0n']++;
        }
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
        // Calculate adjusted weights based on Luck and Bad Luck Streak
        const baseWeights = typeof getWaveBasedRarityWeights === 'function' ? getWaveBasedRarityWeights(this.wave) : {};
        const attrs = this.getAttributes();
        const luck = attrs.luck || 0;
        const badLuck = this._badLuckStreak || 0;
        
        // Luck Mitigation: Boost chances for higher tiers
        // Every 4 bad rolls adds effective luck, plus base luck
        const effectiveLuck = luck + Math.floor(badLuck / 4);
        
        const adjustedWeights = { ...baseWeights };
        
        if (effectiveLuck > 0) {
            // Boost Rare, Epic, Legendary based on effective luck
            if (adjustedWeights['rare']) adjustedWeights['rare'] *= (1 + effectiveLuck * 0.15);
            if (adjustedWeights['epic']) adjustedWeights['epic'] *= (1 + effectiveLuck * 0.20);
            if (adjustedWeights['legendary']) adjustedWeights['legendary'] *= (1 + effectiveLuck * 0.25);
        }

        let thing = rollThing(this.wave, this.rngStreams.loot, adjustedWeights);
        
        // Update Bad Luck Streak
        // Reset on Rare or better
        if (thing.tier === 'rare' || thing.tier === 'epic' || thing.tier === 'legendary') {
            this._badLuckStreak = 0;
        } else {
            this._badLuckStreak++;
        }

        // Prepare modification options
        const guaranteedMods = [];
        const rarityMultipliers = {};
        
        // Check for perks that guarantee mods or modify rarity
        for (const perkId in this.perksPurchased) {
            // Find perk definition
            const perk = typeof getPerkById === 'function' ? getPerkById(perkId) : Object.values(PERKS).find(p => p.id === perkId);
            
            if (perk) {
                if (perk.special && perk.special.startsWith('guaranteed_mod_')) {
                    const modId = perk.special.replace('guaranteed_mod_', '');
                    guaranteedMods.push(modId);
                }
                
                if (perk.mod_rarity_modifiers) {
                    for (const [modId, multiplier] of Object.entries(perk.mod_rarity_modifiers)) {
                        rarityMultipliers[modId] = (rarityMultipliers[modId] || 1) * multiplier;
                    }
                }
            }
        }

        const modOptions = {
            modChanceBoost: modChanceBoost,
            rng: this.rngStreams.mods,
            guaranteedMods: guaranteedMods,
            luck: effectiveLuck,
            rarityMultipliers: rarityMultipliers
        };

        thing = applyModifications(thing, modOptions);
        
        // Luck-based extra roll (chance to reroll entirely if lucky)
        if (this.rngStreams.luck() < (attrs.luck || 0) * 0.05) {
            const newThing = rollThing(this.wave, this.rngStreams.loot, adjustedWeights);
            thing = applyModifications(newThing, modOptions);
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
        // Find the perk first
        const perk = typeof getPerkById === 'function' ? getPerkById(perkId) : Object.values(PERKS).find(p => p.id === perkId);
        if (!perk) return { success: false, message: 'Perk not found' };

        // Check if already purchased / Max Stacks
        if (this.perksPurchased[perkId]) {
            if (!perk.maxStacks) {
                return { 
                    success: false, 
                    message: 'You already own this perk!' 
                };
            }
            if (this.perksPurchased[perkId] >= perk.maxStacks) {
                return {
                    success: false,
                    message: 'Max stacks reached!'
                };
            }
        }

        // Check for NULLIFICATI0N lock
        if (this.perksPurchased['nullificati0n']) {
            return {
                success: false,
                message: 'NULLIFICATI0N prevents further purchases!'
            };
        }

        // Check Requirements
        if (perk.requires) {
            const requiredPerkId = perk.requires;
            const requiredPerk = typeof getPerkById === 'function' ? getPerkById(requiredPerkId) : Object.values(PERKS).find(p => p.id === requiredPerkId);
            
            if (!this.perksPurchased[requiredPerkId]) {
                return {
                    success: false,
                    message: `Requires ${requiredPerk ? requiredPerk.name : 'Unknown Perk'}!`
                };
            }
        }

        const cost = getPerkCost(perkId);

        // Perks cost CASH (persistent currency), not chips
        if (this.cash < cost) {
            return {
                success: false,
                message: `Not enough cash! Need ${cost}$, have ${this.cash}$`
            };
        }

        // Handle Overwrites (Mutually Exclusive Perks)
        if (perk.overwrites && Array.isArray(perk.overwrites)) {
            perk.overwrites.forEach(overwrittenId => {
                if (this.perksPurchased[overwrittenId]) {
                    delete this.perksPurchased[overwrittenId];
                    // Remove from perkOrder to update UI correctly
                    const index = this.perkOrder.indexOf(overwrittenId);
                    if (index > -1) {
                        this.perkOrder.splice(index, 1);
                    }
                }
            });
        }

        this.currency.spendCash(cost);

        // Special handling for NULLIFICATI0N: Wipes all other perks
        if (perkId === 'nullificati0n') {
            this.perksPurchased = {};
            this.perkOrder = [];
        }

        // Add Perk
        if (perk.maxStacks) {
            this.perksPurchased[perkId] = (this.perksPurchased[perkId] || 0) + 1;
        } else {
            this.perksPurchased[perkId] = true;
        }

        // Initialize Chip Eater tracking
        if (perkId === 'chip_eater') {
            this.chipEaterStartValue = this.stats.totalChipsEarned || 0;
        }

        // Add to order for UI (unless hidden or already there for stacks)
        if (!perk.hidden && !this.perkOrder.includes(perkId)) {
            this.perkOrder.push(perkId);
        }

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
     * Check if player has enough chips (potential) to advance
     */
    hasReachedWaveGoal() {
        const value = this.getInventoryValue();
        const earned = this.calculateEarnedChipsForValue(value);
        const cost = this.getWaveEntryCost();
        return earned >= cost;
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
