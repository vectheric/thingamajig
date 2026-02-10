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
        this.round = 1;
        this.currency = new CurrencySystem();
        this.inventory = [];
        this.perksPurchased = {};
        this.perkOrder = []; // order of perk ids for topbar display
        this.rollsUsed = 0;
        this.rareItemStreak = 0;
        this.pendingBossReward = null;
        this.pendingNextRound = null;
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
            fastestRoundTime: null // ms
        };
        
        // Round timing
        this.currentRoundStartTime = Date.now();
        
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
            if (!perk.conditions) continue;
            
            // Only check if it has unlock conditions OR requirements (like Virus/Exodia) and we haven't unlocked it yet this run
            const hasUnlock = perk.conditions.some(c => c.type === 'unlock');
            const hasRequirement = perk.conditions.some(c => c.type === 'requires_perk');
            
            if ((hasUnlock || hasRequirement) && !this.unlockedPerks.has(perkId)) {
                if (checkPerkConditions(perk, this, this.perksPurchased)) {
                    this.unlockedPerks.add(perkId);
                    const color = perk.nameStyle?.color || perk.color || '#fff';
                    game.ui.showMessage(`Unlocked <span style="color:${color}">[${perk.name}]</span>`, 'unlock');
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
     * Get chips (round-local currency)
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
     * @param {Object} sourceStats - The stats to apply (new schema)
     * @param {number} multiplier - Multiplier for the values (usually count)
     */
    _applyAttributeSet(targetAttributes, sourceStats, multiplier = 1) {
        if (!sourceStats) return;

        for (const statName in sourceStats) {
            const statDef = sourceStats[statName];
            
            // Handle 'modify' (modifiers) specifically
            if (statName === 'modify') {
                if (!targetAttributes.modifiers) targetAttributes.modifiers = {};
                
                for (const modName in statDef) {
                    const modStat = statDef[modName];
                    // modStat is like { set: 1 } or { value: -1 } (which assumes add?)
                    // User example: 'golden': {set: 1}, 'prismatic': {value: -1}, 'ectoplasmic': {multi: 1}
                    
                    let currentVal = targetAttributes.modifiers[modName] || 0;
                    
                    if (modStat.guaranteed) {
                        if (!targetAttributes.guaranteedMods) targetAttributes.guaranteedMods = [];
                        if (multiplier > 0) targetAttributes.guaranteedMods.push(modName);
                    } else if (modStat.set !== undefined) {
                        if (multiplier > 0) targetAttributes.modifiers[modName] = modStat.set;
                    } else if (modStat.value !== undefined) {
                        // Assume additive if 'value' is used without type, or 'add' implied
                        targetAttributes.modifiers[modName] = currentVal + (modStat.value * multiplier);
                    } else if (modStat.multi !== undefined) {
                        // Multiplier for chance/rarity?
                        // If it's a multiplier, default base should be 1?
                        // But modifiers map usually stores "rarity factor" or "chance weight".
                        // If it's weight, multi makes sense.
                        const base = currentVal === 0 ? 1 : currentVal;
                        targetAttributes.modifiers[modName] = base * Math.pow(modStat.multi, multiplier);
                    } else if (modStat.div !== undefined) {
                        const base = currentVal === 0 ? 1 : currentVal;
                        targetAttributes.modifiers[modName] = base / Math.pow(modStat.div, multiplier);
                    }
                }
                continue;
            }

            // Standard Stat Handling
            if (statDef && typeof statDef === 'object') {
                const type = statDef.type;
                const value = statDef.value;

                switch (type) {
                    case 'add':
                        targetAttributes[statName] = (targetAttributes[statName] || 0) + (value * multiplier);
                        break;
                    case 'sub':
                    case 'subtract':
                        targetAttributes[statName] = (targetAttributes[statName] || 0) - (value * multiplier);
                        break;
                    case 'multi':
                    case 'mult':
                    case 'multiply':
                        // Initialize to 1 if not present for multiplication
                        if (targetAttributes[statName] === undefined) targetAttributes[statName] = 1;
                        if (multiplier > 0) {
                            targetAttributes[statName] *= Math.pow(value, multiplier);
                        }
                        break;
                    case 'div':
                    case 'divide':
                         if (targetAttributes[statName] === undefined) targetAttributes[statName] = 1;
                         if (multiplier > 0) {
                            targetAttributes[statName] /= Math.pow(value, multiplier);
                         }
                        break;
                    case 'set':
                        if (multiplier > 0) targetAttributes[statName] = value;
                        break;
                    default:
                        // Fallback for "legacy" style if mixed { rolls: { add: 1 } } vs { rolls: 1 }
                        if (statDef.add !== undefined) targetAttributes[statName] = (targetAttributes[statName] || 0) + (statDef.add * multiplier);
                        // ... other legacy checks if needed, but we are enforcing new schema
                        break;
                }
            } else if (typeof statDef === 'number') {
                // Direct number = additive (legacy support)
                targetAttributes[statName] = (targetAttributes[statName] || 0) + (statDef * multiplier);
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
            valueBonus: 0,
            multiValue: 1,
            addValue: 0,
            subtractValue: 0,
            divideValue: 1,
            setValue: undefined,
            // In new schema, valueBonus: { type: 'multi', value: 2.0 } implies it starts at 1?
            // Or valueBonus: { type: 'add', value: 0.1 } implies it starts at 0?
            // Existing logic uses valueBonus as additive percentage (0.1 = +10%).
            // But 'multi' logic in _applyAttributeSet inits to 1.
            // Let's ensure consistent starting values for known stats.
            // Actually, let's let _applyAttributeSet handle initialization if undefined.
            // But for 'valueBonus', if we mix add and multi, we need to be careful.
            // Usually: (Base + Add) * Multi.
            // Our simple _applyAttributeSet does operations sequentially.
            // This might depend on order of perks.
            // Ideally we separate add and multi. But for now let's stick to simple accumulator.
            
            // Chip modifiers
            addChip: 0, subtractChip: 0, multiChip: 1, divideChip: 1, setChip: undefined,
            chipsEndRound: 0,
            
            // Cash modifiers
            addCash: 0, subtractCash: 0, multiCash: 1, divideCash: 1, setCash: undefined,
            
            modifiers: {}, // Initialize modifiers map
            guaranteedMods: [] // Initialize guaranteed mods list
        };

        const activeSets = {}; // { setName: { count: 0, bonuses: {} } }

        for (const perkId in this.perksPurchased) {
            let count = this.perksPurchased[perkId];
            let perk = typeof getPerkById === 'function' ? getPerkById(perkId) : PERKS[perkId];
            if (!perk && typeof getBossPerkById === 'function') perk = getBossPerkById(perkId);
            
            // Special handling for Nullification (Removed/Commented out as requested, but logic exists)
            // User said "remove NULLIFICAT0N". It's not in PERKS anymore.
            // So we can skip special handling or leave it as dead code.
            // But if it's in perksPurchased from save, we might want to ignore it?
            // User said "remove it", implies it shouldn't exist.

            // Special handling for Chip Eater
            if (perkId === 'chip_eater') {
                continue;
            }

            if (perk) {
                // Standardize count
                const maxStack = (perk.properties && perk.properties.stack) || 1;
                // If it's a stackable perk (maxStack > 1 or specific property), count is accurate.
                // If maxStack is 1, count should be 1.
                // But perksPurchased stores count.
                
                // 1. Apply Base Stats
                if (perk.stats) {
                    this._applyAttributeSet(attributes, perk.stats, count);
                }

                // 2. Track Sets
                if (perk.properties && perk.properties.set) {
                    const setName = perk.properties.set;
                    if (!activeSets[setName]) {
                        activeSets[setName] = { count: 0, bonuses: null };
                    }
                    activeSets[setName].count += count; // Count stacks or instances?
                    
                    if (perk.properties.setBonuses) {
                        activeSets[setName].bonuses = perk.properties.setBonuses;
                    }
                }

                // 3. Apply Conditions (Bonus Triggers)
                if (perk.conditions) {
                    for (const condition of perk.conditions) {
                        if (condition.type === 'bonus_trigger' && condition.condition) {
                            const cond = condition.condition;
                            let met = false;
                            
                            if (cond.type === 'stat_threshold') {
                                const statValue = cond.stat === 'round' ? this.round : (this.stats[cond.stat] || 0);
                                const threshold = cond.threshold || 0;
                                
                                if (cond.compare === 'less') {
                                    if (statValue < threshold) met = true;
                                } else {
                                    if (statValue >= threshold) met = true;
                                }
                            }
                            
                            if (met && cond.bonus) {
                                this._applyAttributeSet(attributes, cond.bonus, 1); // Trigger bonus usually applies once?
                            }
                        }
                    }
                }

                // 4. Handle Special Properties (Guaranteed Mods)
                if (perk.special) {
                    for (const key in perk.special) {
                        if (key.startsWith('guaranteed_mod_')) {
                            const modId = key.replace('guaranteed_mod_', '');
                            // Only add if not already present to avoid duplicates
                            if (!attributes.guaranteedMods.includes(modId)) {
                                attributes.guaranteedMods.push(modId);
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
     * Start a new round
     */
    startRound() {
        this.rollsUsed = 0;
        this.inventory = [];
        this.rareItemStreak = 0; // Reset streak at round start
        this.currency.resetRoundLocalCurrency(); // Reset chips for new round
        this.currentRoundStartTime = Date.now(); // Start timer
        // Bad luck streak persists across rounds until a high tier item is found

        // Nullification Scaling: Increment active rounds count
        if (this.perksPurchased['nullificati0n']) {
             // Store start round if not present (legacy support or first run)
             // But actually, we need to track how many rounds passed.
             // Let's use a specific counter for Nullification stacks.
             // We can store it in perksPurchased as a value? No, perksPurchased is usually boolean or stack count.
             // For Nullification, it's not "stacks" of the perk, it's "rounds active".
             // Let's create a separate counter in stats or just use perksPurchased value if it's not boolean.
             // Actually, for Nullification, we can use perksPurchased['nullificati0n'] as the counter.
             // Initial purchase sets it to 1 (or 0). Each round start increments it.
             // Wait, purchasePerk sets it to true. Let's change purchase logic for this specific perk or check here.
             
             if (this.perksPurchased['nullificati0n'] === true) {
                 this.perksPurchased['nullificati0n'] = 0; // Initialize counter
             }
             this.perksPurchased['nullificati0n']++;
        }
    }

    /**
     * Get round entry cost in chips (next round: normal or boss)
     */
    getRoundEntryCost() {
        const nextRound = this.round + 1;
        if (typeof isBossRound === 'function' && isBossRound(nextRound)) {
            const routeIndex = typeof getRouteIndex === 'function' ? getRouteIndex(nextRound) : 0;
            return CONFIG.getBossChipCost(routeIndex);
        }
        return CONFIG.getNormalRoundCost(nextRound);
    }

    /** True if current round is a boss round */
    isBossRound() {
        return typeof isBossRound === 'function' && isBossRound(this.round);
    }

    /** Current route index (0-based) */
    getRouteIndex() {
        return typeof getRouteIndex === 'function' ? getRouteIndex(this.round) : 0;
    }

    /** Boss for current round, or null */
    getCurrentBoss() {
        return typeof getBossByRound === 'function' ? getBossByRound(this.round) : null;
    }

    /** True if player has auto-roll common perk */
    hasAutoRollCommon() {
        return !!this.perksPurchased['auto_roll_common'];
    }

    /**
     * Get available rolls for this round
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
        while (this.hasAutoRollCommon() && thing.tier === 'common' && autoRerolls < maxAutoRerolls) {
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
        const baseWeights = typeof getRoundBasedRarityWeights === 'function' ? getRoundBasedRarityWeights(this.round) : {};
        const attrs = this.getAttributes();
        const luck = attrs.luck || 0;
        const badLuck = this._badLuckStreak || 0;
        
        // Luck Mitigation: Boost chances for higher tiers
        // Every 4 bad rolls adds effective luck, plus base luck
        const effectiveLuck = luck + Math.floor(badLuck / 4);
        
        const adjustedWeights = { ...baseWeights };
        
        if (effectiveLuck !== 0) {
            // Boost Tiers based on effective luck
            // We DIVIDE the rarity score to make them MORE common (lower score = higher probability)
            // Tiers: significant, rare, master, surreal, mythic, etc.
            
            const tiers = [
                { id: 'significant', boost: 0.10 },
                { id: 'rare', boost: 0.15 },
                { id: 'master', boost: 0.20 },
                { id: 'surreal', boost: 0.25 },
                { id: 'mythic', boost: 0.30 },
                { id: 'exotic', boost: 0.35 },
                { id: 'exquisite', boost: 0.40 },
                { id: 'transcendent', boost: 0.45 },
                { id: 'enigmatic', boost: 0.50 },
                { id: 'unfathomable', boost: 0.55 },
                { id: 'otherworldly', boost: 0.60 },
                { id: 'imaginary', boost: 0.65 },
                { id: 'zenith', boost: 0.70 }
            ];

            tiers.forEach(({ id, boost }) => {
                if (adjustedWeights[id]) {
                    // Divide rarity score by luck factor to increase probability
                    // Ensure factor doesn't go below 0.1 (10x rarity penalty max)
                    const factor = Math.max(0.1, 1 + effectiveLuck * boost);
                    adjustedWeights[id] /= factor;
                }
            });
        }

        let thing = rollThing(this.round, this.rngStreams.loot, adjustedWeights);
        
        // Update Bad Luck Streak
        // Reset on Rare or better
        if (thing.tier === 'rare' || thing.tier === 'epic' || thing.tier === 'legendary') {
            this._badLuckStreak = 0;
        } else {
            this._badLuckStreak++;
        }

        // Prepare modification options
        const guaranteedMods = attrs.guaranteedMods || [];
        const rarityMultipliers = {};
        
        // Use calculated modifiers from attributes (populated via perk.stats.modify)
        if (attrs.modifiers) {
            Object.assign(rarityMultipliers, attrs.modifiers);
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
            let newThing = rollThing(this.round, this.rngStreams.loot, adjustedWeights);
            newThing = applyModifications(newThing, modOptions);
            
            // Keep the one with higher value
            if (newThing.value > thing.value) {
                thing = newThing;
            }
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
     * Sell inventory and earn chips for this round
     */
    sellInventory() {
        const value = this.getInventoryValue();
        const earnedChips = this.calculateEarnedChipsForValue(value);
        this.currency.addChips(earnedChips);
        return earnedChips;
    }

    /**
     * Complete a round and earn rewards
     * Awards cash and applies interest, including cash bonuses from perks
     * @returns {Object} rewards breakdown
     */
    completeRound() {
        // Calculate Round Time
        const duration = Date.now() - (this.currentRoundStartTime || Date.now());
        if (this.stats.fastestRoundTime === null || duration < this.stats.fastestRoundTime) {
            this.stats.fastestRoundTime = duration;
        }

        const attrs = this.getAttributes();
        
        // Chippy/End Round Bonus (now integrated via attributes)
        let chipsBonus = attrs.chipsEndRound || 0;
        
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
        const rewards = this.currency.completeRound(maxStacks, modifiers);
        
        if (chipsBonus > 0) {
            rewards.chipsBonus = chipsBonus;
        }
        
        return rewards;
    }

    /**
     * Advance to next round (pay chip cost). On boss round completion, sets pendingBossReward instead.
     */
    advanceRound() {
        const cost = this.getRoundEntryCost();
        if (!this.currency.spendChips(cost)) {
            return { success: false, message: `Not enough Ȼ... Need ${cost}Ȼ, have ${this.chips}Ȼ` };
        }
        this.round += 1;
        const nowOnBoss = typeof isBossRound === 'function' && isBossRound(this.round);
        if (nowOnBoss) {
            const boss = typeof getBossByRound === 'function' ? getBossByRound(this.round) : null;
            if (boss) {
                const owned = Object.keys(this.perksPurchased).filter(id => this.perksPurchased[id]);
                const options = typeof getBossPerkOptions === 'function'
                    ? getBossPerkOptions(boss.id, CONFIG.BOSS_PERK_OFFER_COUNT, owned)
                    : [];
                this.pendingBossReward = { bossId: boss.id, boss, perkOptions: options };
                this.startRound();
                return { success: true, message: 'Boss defeated', isBossReward: true };
            }
        }
        this.startRound();
        return { success: true, message: `Advanced to round ${this.round}` };
    }

    /** After confirming 3 boss perks, advance to next round and clear pending */
    confirmBossReward() {
        if (!this.pendingBossReward) return;
        this.pendingBossReward = null;
        this.round += 1;
        this.startRound();
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
        const perk = PERKS[perkId];
        if (!perk) return { success: false, message: 'Perk not found' };

        const props = perk.properties || {};
        const conditions = perk.conditions || [];

        // Check conflicts
        if (props.conflict) {
            const conflicts = Array.isArray(props.conflict) ? props.conflict : [props.conflict];
            for (const conflictId of conflicts) {
                if (this.perksPurchased[conflictId]) {
                    const conflictName = PERKS[conflictId] ? PERKS[conflictId].name : conflictId;
                    return { success: false, message: `Conflicts with ${conflictName}` };
                }
            }
        }

        // Check if already purchased (Stackable check)
        if (this.perksPurchased[perkId]) {
            const stackLimit = props.stack || 1;
            
            // If stackLimit is 1, you can't buy again
            if (stackLimit === 1) {
                return { 
                    success: false, 
                    message: 'You already own this perk' 
                };
            }
            
            // Check limits for stackable perks
            const currentCount = this.perksPurchased[perkId] || 0;
            
            if (currentCount >= stackLimit) {
                return {
                    success: false,
                    message: `Max stacks reached (${stackLimit})`
                };
            }
        }

        // Check Shop Limit (global limit for this run, separate from stack limit logic if needed)
        // Usually stack limit IS the shop limit for self-stacking perks.
        // But shopLimit might be for non-stacking perks that can be bought multiple times?
        // Let's assume shopLimit and stack are similar for now, but respect shopLimit if present.
        if (props.shopLimit) {
             const currentCount = this.perksPurchased[perkId] || 0;
             if (currentCount >= props.shopLimit) {
                 return { success: false, message: `Shop limit reached (${props.shopLimit})` };
             }
        }

        // Check Requirements
        const reqCondition = conditions.find(c => c.type === 'requirePerk');
        if (reqCondition) {
            const requiredId = reqCondition.perkId;
            if (!this.perksPurchased[requiredId]) {
                const requiredName = PERKS[requiredId] ? PERKS[requiredId].name : requiredId;
                return {
                    success: false,
                    message: `Requires ${requiredName}`
                };
            }
        }

        const cost = perk.cost;

        // Perks cost CASH (persistent currency), not chips
        if (this.cash < cost) {
            return {
                success: false,
                message: `Not enough cash... Need ${cost}$, have ${this.cash}$`
            };
        }

        // Handle Overwrites (Mutually Exclusive Perks)
        if (props.overwrite) {
            const overwrites = Array.isArray(props.overwrite) ? props.overwrite : [props.overwrite];
            overwrites.forEach(overwrittenId => {
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

        // Add Perk (Single ownership or increment)
        if (this.perksPurchased[perkId]) {
            // Must be stackable if we reached here
            if (this.perksPurchased[perkId] === true) {
                this.perksPurchased[perkId] = 2; // Convert boolean to number
            } else {
                this.perksPurchased[perkId]++;
            }
        } else {
            // First purchase
            if (props.stack > 1 || perk.type === 'subperk') {
                this.perksPurchased[perkId] = 1;
            } else {
                this.perksPurchased[perkId] = true; // Use true for single-stack for legacy compatibility? 
                // Or should we move to numbers everywhere? 
                // Let's stick to true for single stack to avoid breaking other checks that expect boolean
                // But wait, my getAttributes uses 'count' which defaults to 1.
                // If I use number everywhere, it's cleaner.
                // But legacy checks might use `if (perksPurchased[id])`. 1 is truthy.
                // So using 1 is fine.
                // However, let's keep `true` for consistency with legacy if it matters.
                // Actually, let's use 1 if stackable, true if not.
                if (props.stack > 1) {
                    this.perksPurchased[perkId] = 1;
                } else {
                    this.perksPurchased[perkId] = true;
                }
            }
        }

        // Initialize Chip Eater tracking
        if (perkId === 'chip_eater') {
            this.chipEaterStartValue = this.stats.totalChipsEarned || 0;
        }

        // Add to order for UI (unless hidden or already there)
        if (!props.hidden && !this.perkOrder.includes(perkId)) {
            this.perkOrder.push(perkId);
        }

        this.checkUnlockNotifications();

        const color = perk.nameStyle?.color || perk.color || '#fff';
        return {
            success: true,
            message: `Purchased <span style="color:${color}">[${perk.name}]</span>`
        };
    }

    /**
     * Get formatted attributes for display
     */
    getFormattedAttributes() {
        const attrs = this.getAttributes();
        const luck = typeof attrs.luck === 'number' ? attrs.luck : 0;
        const multiValue = typeof attrs.multiValue === 'number' ? attrs.multiValue : 1;
        const multiChip = typeof attrs.multiChip === 'number' ? attrs.multiChip : 1;
        const multiCash = typeof attrs.multiCash === 'number' ? attrs.multiCash : 1;

        const result = {
            'Rolls/Round': this.getAvailableRolls(),
            'Luck': `${parseFloat(luck.toFixed(2))}`,
            'Value x': `${multiValue.toFixed(2)}x`,
            'Ȼ+': `${parseFloat(multiChip.toFixed(2))}`,
            'Cash x': `${multiCash.toFixed(2)}x`
        };
        if (attrs.modification_chance && attrs.modification_chance > 0) {
            result['Mod Chance'] = `+${Math.round(attrs.modification_chance * 100)}%`;
        }
        return result;
    }

    canForgePerk(perkId) {
        const perk = PERKS[perkId];
        if (!perk) {
            return { canForge: false, reason: 'Perk not found' };
        }
        
        const conditions = perk.conditions || [];
        const forgeCondition = conditions.find(c => c.type === 'forging');
        
        if (!forgeCondition) {
            return { canForge: false, reason: 'Perk cannot be forged' };
        }
        
        if (this.perksPurchased[perkId]) {
            return { canForge: false, reason: 'Already owned' };
        }

        if (forgeCondition.cash && this.cash < forgeCondition.cash) {
            // Allow forging even with insufficient cash (User Request)
            return { canForge: false, reason: 'Missing Recipes' };
        }
        
        const recipe = forgeCondition.recipe;
        if (Array.isArray(recipe)) {
            for (const requiredId of recipe) {
                if (!this.perksPurchased[requiredId]) {
                    return { canForge: false, reason: 'Missing Recipes' };
                }
            }
        }
        
        return { canForge: true, reason: null };
    }

    getForgeableOptions() {
        const options = [];
        for (const [id, perk] of Object.entries(PERKS)) {
            const conditions = perk.conditions || [];
            const forgeCondition = conditions.find(c => c.type === 'forging');
            
            if (forgeCondition) {
                const check = this.canForgePerk(id);
                options.push({
                    id: id,
                    name: perk.name,
                    description: perk.description,
                    rarity: perk.tier,
                    tier: perk.tier,
                    icon: perk.icon,
                    nameStyle: perk.nameStyle,
                    recipe: forgeCondition.recipe,
                    canForge: check.canForge,
                    reason: check.reason
                });
            }
        }
        return options;
    }

    forgePerk(perkId) {
        const perk = PERKS[perkId];
        if (!perk) {
            return { success: false, message: 'Perk not found' };
        }
        
        const check = this.canForgePerk(perkId);
        if (!check.canForge) {
            return { success: false, message: check.reason || 'Cannot forge this perk' };
        }
        
        const conditions = perk.conditions || [];
        const forgeCondition = conditions.find(c => c.type === 'forging');
        
        if (forgeCondition.cash) {
            // Force spend (allow debt)
            this.currency.cash -= forgeCondition.cash;
            if (this.currency.cash < 0) this.currency.cash = 0; // Or allow negative? User said "still be able to forge". Assuming floor at 0 or debt. 
            // Let's assume floor at 0 for now unless they want debt. 
            // Actually, if I floor at 0, it's free if I have 0. That might be what they want.
            // "idh enough money to do it" -> "still be able to forge".
        }

        const recipe = forgeCondition.recipe;
        
        if (Array.isArray(recipe)) {
            for (const requiredId of recipe) {
                // Remove required perk
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
        
        if (!perk.properties?.hidden && !this.perkOrder.includes(perkId)) {
            this.perkOrder.push(perkId);
        }
        if (perkId === 'chip_eater') {
            this.chipEaterStartValue = this.stats.totalChipsEarned || 0;
        }
        
        this.checkUnlockNotifications();

        const color = perk.nameStyle?.color || perk.color || '#fff';
        return {
            success: true,
            message: `Forged <span style="color:${color}">[${perk.name}]</span>`
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
    hasReachedRoundGoal() {
        const value = this.getInventoryValue();
        const earned = this.calculateEarnedChipsForValue(value);
        const cost = this.getRoundEntryCost();
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
     * Reset loot page when starting new round
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
