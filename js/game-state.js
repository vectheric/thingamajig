/**
 * Game State Management
 * Central source of truth for all game data
 */

class GameState {
    constructor(seed) {
        this.seed = (seed >>> 0) || (Date.now() >>> 0);
        this.seedString = String(this.seed);
        this.rngStreams = this._createRngStreams(this.seed);
        this.resetGame();
    }

    setSeed(seed, seedString) {
        this.seed = (seed >>> 0) || (Date.now() >>> 0);
        this.seedString = seedString || String(this.seed);
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
            totalRollsUsed: 0,
            maxChipsHeld: 0,
            fastestWaveTime: null // ms
        };
        
        // Wave timing
        this.currentWaveStartTime = Date.now();
        
        // History tracking for unlock requirements
        this.itemHistory = [];

        // Perk-specific tracking
        this.chipEaterStartValue = 0;
        
        // Track unlocked perks to show notifications only once per run
        this.unlockedPerks = new Set();
    }

    /**
     * Check for newly unlocked perks and notify
     */
    checkUnlockNotifications() {
        if (typeof PERKS === 'undefined' || typeof checkPerkConditions !== 'function' || typeof game === 'undefined' || !game.ui) return;

        for (const perkId in PERKS) {
            const perk = PERKS[perkId];
            // Only check if it has unlock conditions OR requirements (like Virus/Exodia) and we haven't unlocked it yet this run
            const hasUnlock = perk.conditions && perk.conditions.some(c => c.type === 'unlock');
            const hasRequirement = perk.conditions && perk.conditions.some(c => c.type === 'requires_perk');
            
            if ((hasUnlock || hasRequirement) && !this.unlockedPerks.has(perkId)) {
                if (checkPerkConditions(perk, this, this.perksPurchased)) {
                    this.unlockedPerks.add(perkId);
                    game.ui.showMessage(`Unlocked [${perk.name}]`, 'success');
                }
            }
        }
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
            this.checkUnlockNotifications();
        }
    }

    updateMaxChips(currentChips) {
        if (currentChips > this.stats.maxChipsHeld) {
            this.stats.maxChipsHeld = currentChips;
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
        const attrs = this.getAttributes();
        return this.currency.getInterestStacks(attrs.max_interest_stacks);
    }

    /**
     * Helper to apply attributes to the stats object
     * @param {Object} targetAttributes - The accumulator object
     * @param {Object} sourceAttributes - The attributes to apply
     * @param {number} multiplier - Multiplier for the values (usually count)
     */
    _applyAttributeSet(targetAttributes, sourceAttributes, multiplier = 1) {
        if (!sourceAttributes) return;

        for (const attr in sourceAttributes) {
            const value = sourceAttributes[attr];
            
            // Handle object definition (e.g. { add: 3 })
            if (typeof value === 'object' && value !== null) {
                if (value.add !== undefined) {
                    targetAttributes[attr] = (targetAttributes[attr] || 0) + (value.add * multiplier);
                }
                if (value.subtract !== undefined) {
                    targetAttributes[attr] = (targetAttributes[attr] || 0) - (value.subtract * multiplier);
                }
                // Multipliers are usually not scaled by count linearly like add, but powered? 
                // Logic in original was: attributes[attr] = (attributes[attr] || 1) * value.multiply;
                // If we have 2 stacks of x2 multiplier, is it x4? 
                // The original code didn't handle 'count' for object-based multipliers explicitly in the generic loop 
                // (it was inside the 'perk' loop where count=1).
                // But for sets, multiplier is usually 1 (the bonus is applied once if threshold met).
                if (value.multiply !== undefined) {
                    // Apply multiply 'multiplier' times? Usually just once for the bonus object.
                    // But if multiplier is 0 (inactive), we shouldn't apply.
                    // Actually, let's assume multiplier is 1 for set bonuses and conditions.
                    if (multiplier > 0) {
                        targetAttributes[attr] = (targetAttributes[attr] || 1) * Math.pow(value.multiply, multiplier);
                    }
                }
                if (value.divide !== undefined && value.divide !== 0) {
                    if (multiplier > 0) {
                        targetAttributes[attr] = (targetAttributes[attr] || 1) / Math.pow(value.divide, multiplier);
                    }
                }
                if (value.set !== undefined) {
                    if (multiplier > 0) targetAttributes[attr] = value.set;
                }
                // Modifiers
                if (value.modifiers) {
                    // Logic for modifiers if needed
                }
            } 
            // Legacy direct number handling
            else if (attr.startsWith('multi') || attr.startsWith('divide')) {
                targetAttributes[attr] = (targetAttributes[attr] || 1) * Math.pow(value, multiplier);
            } else if (attr.startsWith('set')) {
                if (multiplier > 0) targetAttributes[attr] = value;
            } else {
                // Additive accumulation
                if (typeof value === 'number') {
                    targetAttributes[attr] = (targetAttributes[attr] || 0) + (value * multiplier);
                }
            }
        }
    }

    /**
     * Calculate current attributes from purchased perks
     * @returns {Object} calculated attributes
     */
    getAttributes() {
        const attributes = {
            rolls: 0,
            luck: 0,
            max_interest_stacks: 5, // Default max
            modification_chance: 0,
            
            // Value modifiers
            addValue: 0, subtractValue: 0, multiValue: 1, divideValue: 1, setValue: undefined,
            
            // Chip modifiers
            addChip: 0, subtractChip: 0, multiChip: 1, divideChip: 1, setChip: undefined,
            chipsEndWave: 0, // Added for Chippy integration
            
            // Cash modifiers
            addCash: 0, subtractCash: 0, multiCash: 1, divideCash: 1, setCash: undefined
        };

        const activeSets = {}; // { setName: { count: 0, bonuses: {} } }

        for (const perkId in this.perksPurchased) {
            let count = this.perksPurchased[perkId];
            let perk = typeof getPerkById === 'function' ? getPerkById(perkId) : Object.values(PERKS).find(p => p.id === perkId);
            if (!perk && typeof getBossPerkById === 'function') perk = getBossPerkById(perkId);
            
            // Special handling for Nullification
            if (perkId === 'nullificati0n') {
                const wavesActive = typeof count === 'number' ? count : 0;
                attributes.luck = (attributes.luck || 0) + (0.404 * wavesActive);
                attributes.rolls = (attributes.rolls || 0) + (4 * wavesActive);
                continue; 
            }

            // Special handling for Chip Eater
            if (perkId === 'chip_eater') {
                continue;
            }

            if (perk) {
                // Standardize count
                if (perk.maxStacks) {
                    // It's a stackable perk, count is accurate
                } else {
                    count = 1; // Non-stackable owned = 1
                }

                // 1. Apply Base Attributes
                if (perk.attributes) {
                    this._applyAttributeSet(attributes, perk.attributes, count);
                }

                // 2. Track Sets
                if (perk.set) {
                    if (!activeSets[perk.set]) {
                        activeSets[perk.set] = { count: 0, bonuses: null };
                    }
                    activeSets[perk.set].count += 1; // Count unique perks in set? Or stacks? Usually unique perks.
                    // User asked for "Exodia", which implies unique pieces.
                    // If I have 2 left arms, does it count as 2 pieces? Usually Exodia needs distinct pieces.
                    // But for flexibility, let's say "count += 1" implies counting purchased instances.
                    // Since Exodia parts are likely non-stackable, this is fine.
                    
                    if (perk.setBonuses) {
                        activeSets[perk.set].bonuses = perk.setBonuses;
                    }
                }

                // 3. Apply Conditions
                if (perk.conditions) {
                    for (const condition of perk.conditions) {
                        if (condition.type === 'bonus_trigger' && condition.condition) {
                            const cond = condition.condition;
                            let met = false;
                            
                            if (cond.type === 'stat_threshold') {
                                const statValue = cond.stat === 'wave' ? this.wave : (this.stats[cond.stat] || 0);
                                const threshold = cond.threshold || 0;
                                
                                if (cond.compare === 'less') {
                                    if (statValue < threshold) met = true;
                                } else {
                                    if (statValue >= threshold) met = true;
                                }
                            }
                            
                            if (met && cond.bonus) {
                                this._applyAttributeSet(attributes, cond.bonus, 1);
                            }
                        }
                    }
                }
            }
        }

        // 4. Apply Set Bonuses
        for (const setName in activeSets) {
            const set = activeSets[setName];
            if (set.bonuses) {
                // Sort keys to apply in order? Not strictly necessary for additive, but good for predictable results.
                // Assuming bonuses are additive.
                // Logic: "boost its power" - maybe cumulative?
                // Exodia: 2 pieces -> +power, 3 pieces -> +more power.
                // Usually these are thresholds. "If you have >= 2, get this". "If you have >= 3, get that".
                // Should they stack? (e.g. get both 2-piece and 3-piece bonus?)
                // Standard RPG sets often stack. Let's assume yes.
                
                for (const thresholdStr in set.bonuses) {
                    const threshold = parseInt(thresholdStr);
                    if (set.count >= threshold) {
                        this._applyAttributeSet(attributes, set.bonuses[thresholdStr], 1);
                    }
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
        this.currentWaveStartTime = Date.now(); // Start timer
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
        
        // Add to history for unlock requirements
        if (this.itemHistory) {
            this.itemHistory.push({
                id: thing.id,
                attribute: thing.attribute ? thing.attribute.id : 'normal',
                mods: thing.mods ? thing.mods.map(m => m.id) : []
            });
            this.checkUnlockNotifications();
        }
        
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
                
                if (perk.attributes && perk.attributes.modifiers) {
                    for (const [modId, multiplier] of Object.entries(perk.attributes.modifiers)) {
                        // Fix: If multiplier is 1 (like Midas Touch), treat it as guaranteed mod
                        if (multiplier === 1) {
                            guaranteedMods.push(modId);
                        } else {
                            rarityMultipliers[modId] = (rarityMultipliers[modId] || 1) * multiplier;
                        }
                    }
                }
            }
        }

        const modOptions = {
            modChanceBoost: modChanceBoost,
            rng: this.rngStreams.mods,
            guaranteedMods: guaranteedMods,
            luck: effectiveLuck,
            rarityMultipliers: rarityMultipliers,
            valueBonus: attrs.valueBonus || 0,
            ownedPerks: this.perksPurchased
        };

        thing = applyModifications(thing, modOptions);
        
        // Luck-based extra roll (chance to reroll entirely if lucky)
        if (this.rngStreams.luck() < (attrs.luck || 0) * 0.05) {
            const newThing = rollThing(this.wave, this.rngStreams.loot, adjustedWeights);
            thing = applyModifications(newThing, modOptions);
        }
        
        // Apply Value Modifiers
        let val = thing.value;
        if (attrs.setValue !== undefined && attrs.setValue !== null) {
            val = attrs.setValue;
        }
        val = (val * attrs.multiValue) + attrs.addValue - attrs.subtractValue;
        if (attrs.divideValue > 0) val /= attrs.divideValue;
        thing.value = Math.max(0, Math.round(val));

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
        if (this.rareItemStreak === 2) return 'Double Rare 🔥';
        if (this.rareItemStreak === 3) return 'Triple Rare 🔥🔥';
        if (this.rareItemStreak >= 5) return `${this.rareItemStreak}x Rare Combo 🔥💥`;
        return null;
    }

    /**
     * Calculate total inventory value
     */
    getInventoryValue() {
        return this.inventory.reduce((sum, thing) => sum + thing.value, 0);
    }

    /** Calculate chips earned for a given inventory value (applies chip modifiers) */
    calculateEarnedChipsForValue(value) {
        const attrs = this.getAttributes();
        let chips = value;
        chips = (chips * attrs.multiChip) + attrs.addChip - attrs.subtractChip;
        if (attrs.divideChip > 0) chips /= attrs.divideChip;
        return Math.max(0, Math.round(chips));
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
        // Calculate Wave Time
        const duration = Date.now() - (this.currentWaveStartTime || Date.now());
        if (this.stats.fastestWaveTime === null || duration < this.stats.fastestWaveTime) {
            this.stats.fastestWaveTime = duration;
        }

        const attrs = this.getAttributes();
        
        // Chippy/End Wave Bonus (now integrated via attributes)
        let chipsBonus = attrs.chipsEndWave || 0;
        
        if (chipsBonus > 0) {
            this.currency.addChips(chipsBonus);
        }

        const maxStacks = attrs.max_interest_stacks || 5;
        const modifiers = {
            multiCash: attrs.multiCash,
            addCash: attrs.addCash,
            subtractCash: attrs.subtractCash,
            divideCash: attrs.divideCash,
            setCash: attrs.setCash
        };
        const rewards = this.currency.completeWave(maxStacks, modifiers);
        
        if (chipsBonus > 0) {
            rewards.chipsBonus = chipsBonus;
        }
        
        return rewards;
    }

    /**
     * Advance to next wave (pay chip cost). On boss wave completion, sets pendingBossReward instead.
     */
    advanceWave() {
        const cost = this.getWaveEntryCost();
        if (!this.currency.spendChips(cost)) {
            return { success: false, message: `Not enough Ȼ... Need ${cost}Ȼ, have ${this.chips}Ȼ` };
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
                return { success: true, message: 'Boss defeated', isBossReward: true };
            }
        }
        this.startWave();
        return { success: true, message: `Advanced to wave ${this.wave}` };
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

        // Check if already purchased (Stackable removed)
        if (this.perksPurchased[perkId]) {
            // Exception for subperks/stackable perks (like VIRUS)
            const isStackable = perk.type === 'subperk' || perk.maxStacks;
            if (!isStackable) {
                return { 
                    success: false, 
                    message: 'You already own this perk' 
                };
            }
            
            // Check limits for stackable perks
            const currentCount = (typeof this.perksPurchased[perkId] === 'number') 
                ? this.perksPurchased[perkId] 
                : 1; // Handle legacy 'true' as 1
            
            const limit = perk.maxStacks || perk.shopLimit || 1;
            
            if (currentCount >= limit) {
                return {
                    success: false,
                    message: `Max stacks reached (${limit})`
                };
            }
        }

        // Check for NULLIFICATI0N lock
        if (this.perksPurchased['nullificati0n']) {
            return {
                success: false,
                message: 'NULLIFICATI0N prevents further purchases'
            };
        }

        // Check Requirements
        if (perk.requires) {
            const requiredPerkId = perk.requires;
            const requiredPerk = typeof getPerkById === 'function' ? getPerkById(requiredPerkId) : Object.values(PERKS).find(p => p.id === requiredPerkId);
            
            if (!this.perksPurchased[requiredPerkId]) {
                return {
                    success: false,
                    message: `Requires ${requiredPerk ? requiredPerk.name : 'Unknown Perk'}`
                };
            }
        }

        const cost = getPerkCost(perkId);

        // Perks cost CASH (persistent currency), not chips
        if (this.cash < cost) {
            return {
                success: false,
                message: `Not enough cash... Need ${cost}$, have ${this.cash}$`
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

        // Add Perk (Single ownership or increment)
        if (this.perksPurchased[perkId]) {
            // Must be stackable if we reached here
            if (this.perksPurchased[perkId] === true) {
                this.perksPurchased[perkId] = 2;
            } else {
                this.perksPurchased[perkId]++;
            }
        } else {
            // First purchase
            if (perk.type === 'subperk' || perk.maxStacks) {
                this.perksPurchased[perkId] = 1;
            } else {
                this.perksPurchased[perkId] = true;
            }
        }

        // Initialize Chip Eater tracking
        if (perkId === 'chip_eater') {
            this.chipEaterStartValue = this.stats.totalChipsEarned || 0;
        }

        // Add to order for UI (unless hidden or already there)
        if (!perk.hidden && !this.perkOrder.includes(perkId)) {
            this.perkOrder.push(perkId);
        }

        this.checkUnlockNotifications();

        return {
            success: true,
            message: `Purchased [${perk.name}]`
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
            'Value x': `${attrs.multiValue.toFixed(2)}x`,
            'Ȼ x': `${attrs.multiChip.toFixed(2)}x`,
            'Cash x': `${attrs.multiCash.toFixed(2)}x`
        };
        if (attrs.modification_chance && attrs.modification_chance > 0) {
            result['Mod Chance'] = `+${Math.round(attrs.modification_chance * 100)}%`;
        }
        return result;
    }

    canForgePerk(perkId) {
        const perk = typeof getPerkById === 'function' ? getPerkById(perkId) : Object.values(PERKS).find(p => p.id === perkId);
        if (!perk) {
            return { canForge: false, reason: 'Perk not found' };
        }
        if (!perk.forgeable || !perk.forgeRecipe) {
            return { canForge: false, reason: 'Perk cannot be forged' };
        }
        if (this.perksPurchased['nullificati0n']) {
            return { canForge: false, reason: 'NULLIFICATI0N prevents forging' };
        }
        if (this.perksPurchased[perkId]) {
            return { canForge: false, reason: 'Already owned' };
        }
        const recipe = perk.forgeRecipe;
        if (recipe.cash && this.cash < recipe.cash) {
            return { canForge: false, reason: 'Missing Recipes' };
        }
        if (Array.isArray(recipe.perks)) {
            for (const requiredId of recipe.perks) {
                if (!this.perksPurchased[requiredId]) {
                    return { canForge: false, reason: 'Missing Recipes' };
                }
            }
        }
        return { canForge: true, reason: null };
    }

    getForgeableOptions() {
        const forgeablePerks = Object.values(PERKS).filter(p => p.forgeable);
        return forgeablePerks.map(perk => {
            const check = this.canForgePerk(perk.id);
            return {
                id: perk.id,
                name: perk.name,
                description: perk.description,
                rarity: perk.tier,
                tier: perk.tier, // Explicitly pass tier for UI
                icon: perk.icon, // Pass icon
                nameStyle: perk.nameStyle, // Pass nameStyle
                recipe: perk.forgeRecipe,
                canForge: check.canForge,
                reason: check.reason
            };
        });
    }

    forgePerk(perkId) {
        const perk = typeof getPerkById === 'function' ? getPerkById(perkId) : Object.values(PERKS).find(p => p.id === perkId);
        if (!perk) {
            return { success: false, message: 'Perk not found' };
        }
        if (!perk.forgeable || !perk.forgeRecipe) {
            return { success: false, message: 'Perk cannot be forged' };
        }
        const check = this.canForgePerk(perkId);
        if (!check.canForge) {
            return { success: false, message: check.reason || 'Cannot forge this perk' };
        }
        const recipe = perk.forgeRecipe;
        if (recipe.cash) {
            this.currency.spendCash(recipe.cash);
        }
        if (Array.isArray(recipe.perks)) {
            for (const requiredId of recipe.perks) {
                // Remove required perk (always remove entire perk since stacks are gone)
                if (this.perksPurchased[requiredId]) {
                    delete this.perksPurchased[requiredId];
                    const index = this.perkOrder.indexOf(requiredId);
                    if (index > -1) {
                        this.perkOrder.splice(index, 1);
                    }
                }
            }
        }
        
        // Add Perk (Single ownership)
        this.perksPurchased[perkId] = true;
        
        if (!perk.hidden && !this.perkOrder.includes(perkId)) {
            this.perkOrder.push(perkId);
        }
        if (perkId === 'chip_eater') {
            this.chipEaterStartValue = this.stats.totalChipsEarned || 0;
        }
        
        this.checkUnlockNotifications();

        return {
            success: true,
            message: `Forged [${perk.name}]`
        };
    }

    /**
     * Add a consumable item (max 6 slots)
     */
    addConsumable(consumable) {
        if (this.consumables.length >= 9) {
            return { success: false, message: 'Consumable slots full' };
        }
        this.consumables.push({
            ...consumable,
            id: Date.now() + Math.random()
        });
        
        // Track stats
        this.addStat('totalConsumablesBought', 1);
        
        return { success: true, message: `Added ${consumable.name}` };
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
            this.currency.addBonusInterestStack(consumable.value || 1);
        }
        
        // Track potion usage
        this.potionsUsed++;
        
        // Remove the consumable
        const name = consumable.name;
        this.consumables.splice(index, 1);
        return { success: true, message: `Used ${name}`, effect: consumable.effect };
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
