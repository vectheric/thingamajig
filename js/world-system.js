/**
 * World System
 * Handles Biomes and Random Events
 * Affected by PRNG and Luck
 */

const BIOMES = {
    'plains': {
        name: 'Grassy Plains',
        description: 'A peaceful meadow. Standard luck.',
        color: '#90EE90', // LightGreen
        modifiers: { luck: 1.0, eventRate: 1.0 },
        rarity: 10
    },
    'forest': {
        name: 'Mystic Forest',
        description: 'Dense trees obscure secrets. Slightly higher event rate.',
        color: '#228B22', // ForestGreen
        modifiers: { luck: 1.1, eventRate: 1.2 },
        rarity: 15
    },
    'desert': {
        name: 'Scorched Desert',
        description: 'Harsh conditions. Lower event rate, but better loot.',
        color: '#F4A460', // SandyBrown
        modifiers: { luck: 1.2, eventRate: 0.8 },
        rarity: 25
    },
    'tundra': {
        name: 'Frozen Tundra',
        description: 'Bitter cold. Slows down time (events last longer).',
        color: '#E0FFFF', // LightCyan
        modifiers: { luck: 1.0, eventRate: 1.0, durationMod: 1.5 },
        rarity: 25
    },
    'volcano': {
        name: 'Volcanic Wastes',
        description: 'Dangerous and rich. High risk, high reward.',
        color: '#CD5C5C', // IndianRed
        modifiers: { luck: 1.5, eventRate: 1.5 },
        rarity: 50
    }
};

const EVENTS = {
    'gold_rush': {
        name: 'Gold Rush',
        description: 'Gold prices skyrocket.',
        flavorText: 'GOLD FEVER!',
        duration: 120, // 2 minutes (game time)
        rarity: 20, // 5% base chance (1/20)
        color: '#FFD700', // Gold
        textStroke: '1px #000000',
        eventEffect: {
            item: {
                specific: {
                    gold_nugget: { type: 'set', value: 5 } // Make gold common
                }
            }
        }
    },
    'eclipse': {
        name: 'Eclipse',
        description: 'The sun vanishes. Shadows lengthen.',
        flavorText: 'TOTAL DARKNESS',
        duration: 999999, // Long duration, handled by round count
        durationRounds: 2,
        rarity: 33, // ~3% base chance (1/33)
        color: '#4B0082', // Indigo
        textStroke: '1px #000000',
        eventEffect: {
            itemValue: {
                tags: {
                    dark: { type: 'multi', value: 3.0 },
                    light: { type: 'multi', value: 0.5 }
                }
            }
        }
    }
};

class WorldSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.rng = null; // Will be initialized with seeded RNG
        
        // Initialize state if not present
        if (!this.gameState.world) {
            this.gameState.world = {
                currentBiomeId: 'plains',
                activeEvents: [], // Array of { id, startTime, endTime }
                minutesSinceLastEvent: 0 // For luck mitigation
            };
        } else if (typeof this.gameState.world.minutesSinceLastEvent === 'undefined') {
            this.gameState.world.minutesSinceLastEvent = 0;
        }
    }

    init() {
        // Initialize PRNG stream dedicated to world generation
        if (typeof createSeededRng === 'function') {
            // Derive a seed specifically for world gen from the main seed
            this.rng = createSeededRng(this.gameState._deriveSeed('world'));
            // Separate streams for biomes and events to ensure biome sequence is deterministic
            // regardless of event tick frequency
            this.biomeRng = createSeededRng(this.gameState._deriveSeed('world-biome'));
            this.eventRng = createSeededRng(this.gameState._deriveSeed('world-events'));
        } else {
            this.rng = Math.random;
            this.biomeRng = Math.random;
            this.eventRng = Math.random;
        }
    }

    /**
     * Get effective world effects from Biome and Active Events
     * Merges effects for augmentPrice, modifiers, items, etc.
     */
    getEffectiveWorldEffects() {
        const effects = {
            augmentPrice: [], // Array of { type, value }
            modifier: {
                universal: [], // Array of { type, value }
                specific: {}   // Map of modId -> { guaranteed, type, value }
            },
            item: {
                guaranteed: null, // Single guaranteed item ID (first one found wins)
                specific: {}      // Map of itemId -> { type, value }
            }
        };

        const sources = [];
        
        // Add Biome Effects (if any)
        const biome = this.getCurrentBiome();
        if (biome && biome.effects) {
            sources.push(biome.effects);
        }

        // Add Active Event Effects
        const activeEvents = this.getActiveEvents();
        activeEvents.forEach(event => {
            const eventDef = (typeof EVENTS !== 'undefined') ? EVENTS[event.id] : null;
            if (eventDef && eventDef.eventEffect) {
                sources.push(eventDef.eventEffect);
            }
        });

        // Merge Effects
        sources.forEach(source => {
            // Augment Price
            if (source.augmentPrice) {
                effects.augmentPrice.push(source.augmentPrice);
            }

            // Modifiers
            if (source.modifier) {
                Object.entries(source.modifier).forEach(([key, effect]) => {
                    if (key === 'universal') {
                        effects.modifier.universal.push(effect);
                    } else {
                        // Merge specific modifier effects
                        if (!effects.modifier.specific[key]) effects.modifier.specific[key] = {};
                        Object.assign(effects.modifier.specific[key], effect);
                    }
                });
            }

            // Items
            if (source.item) {
                Object.entries(source.item).forEach(([key, effect]) => {
                    if (effect.guaranteed) {
                        effects.item.guaranteed = key;
                    }
                    if (effect.type) {
                        if (!effects.item.specific[key]) effects.item.specific[key] = {};
                        Object.assign(effects.item.specific[key], effect);
                    }
                });
            }

            // Item Values (e.g. Eclipse)
            if (source.itemValue) {
                if (!effects.itemValue) effects.itemValue = { tags: {} };
                if (source.itemValue.tags) {
                    Object.entries(source.itemValue.tags).forEach(([tag, effect]) => {
                        effects.itemValue.tags[tag] = effect;
                    });
                }
            }
        });

        return effects;
    }

    /**
     * Manually set the current biome
     * Useful for testing or gameplay overrides without affecting the PRNG stream
     * @param {string} biomeId - The ID or Key of the biome (e.g., 'plains', 'forest')
     */
    setBiome(biomeId) {
        // Normalize input to find the correct biome
        const key = String(biomeId).toLowerCase();
        const selectedBiome = BIOMES[key];

        if (selectedBiome) {
            this.gameState.world.currentBiomeId = key;

            if (typeof game !== 'undefined' && game.ui) {
                game.ui.showMessage(`Biome changed to [${selectedBiome.name}]`, 'system');
            }
            return true;
        } else {
            console.warn(`Biome '${biomeId}' not found.`);
            return false;
        }
    }

    /**
     * Change Biome based on Route (Round)
     * Called when advancing to next round
     * Affected by PRNG, Augments, and Luck
     */
    generateBiome() {
        const biomeKeys = Object.keys(BIOMES);
        
        // Calculate Total Weight
        let totalWeight = 0;
        const weights = [];
        
        // Player stats/augments can influence weights
        const attrs = this.gameState.getAttributes ? this.gameState.getAttributes() : { luck: 0 };
        const playerLuck = attrs.luck || 0;
        const hasCompass = this.gameState.augmentsPurchased['explorers_compass'];

        // Initialize Bad Luck Streak if missing
        if (typeof this.gameState.world.biomeBadLuckStreak === 'undefined') {
            this.gameState.world.biomeBadLuckStreak = 0;
        }

        // Calculate Effective Luck for Biomes
        // Base Player Luck + Bad Luck Streak (e.g. +1 effective luck for every 5 rounds dry)
        const badLuckBonus = Math.floor(this.gameState.world.biomeBadLuckStreak / 5);
        const effectiveLuck = playerLuck + badLuckBonus;

        for (const key of biomeKeys) {
            const biome = BIOMES[key];
            // Inverse Weighting: Higher Rarity = Lower Weight (1000 / rarity)
            // Plains (10) -> 100, Volcano (50) -> 20
            let weight = 1000 / (biome.rarity || 10);
            
            // Luck Modifier: Rare biomes (higher rarity) get a boost from luck
            // Logic: If rarity >= 25 (Desert, Tundra, Volcano), Luck increases it
            if ((biome.rarity || 10) >= 25) {
                // Boost factor: 10% per luck point
                // For Very Rare (Volcano, rarity >= 50): 20% boost
                const boost = ((biome.rarity || 10) >= 50) ? 0.2 : 0.1;
                
                if (effectiveLuck > 0) {
                    weight *= (1 + effectiveLuck * boost);
                }
            }
            
            // Augment Modifier
            if (hasCompass && (key === 'cyber_city' || key === 'volcano')) {
                weight *= 2.0; // Double chance for rare biomes with Compass
            }
            
            weights.push({ key, weight });
            totalWeight += weight;
        }
        
        // Weighted Random Selection using Seeded PRNG
        const roll = this.biomeRng() * totalWeight;
        let cumulative = 0;
        let selectedBiomeKey = 'plains';
        
        for (const item of weights) {
            cumulative += item.weight;
            if (roll < cumulative) {
                selectedBiomeKey = item.key;
                break;
            }
        }
        
        // Store the KEY (e.g. 'plains') so we can look it up in BIOMES later
        this.gameState.world.currentBiomeId = selectedBiomeKey;
        
        const selectedBiome = BIOMES[selectedBiomeKey];

        // Update Bad Luck Streak
        // If we got a Rare biome (rarity >= 25), reset streak
        // Otherwise increment
        if ((selectedBiome.rarity || 10) >= 25) {
             this.gameState.world.biomeBadLuckStreak = 0;
        } else {
             this.gameState.world.biomeBadLuckStreak++;
        }

        if (typeof game !== 'undefined' && game.ui) {
            game.ui.showMessage(`Entering [${selectedBiome.name}]`, 'system');
        }
        
        return selectedBiome;
    }

    getCurrentBiome() {
        // Handle both Key (plains) and ID (plains) just in case, but prefer Key lookup
        const id = this.gameState.world.currentBiomeId;
        if (BIOMES[id]) return BIOMES[id];
        return BIOMES['plains'];
    }

    /**
     * Attempt to trigger random events
     * Called every game minute
     */
    tickEvents() {
        const biome = this.getCurrentBiome();
        let eventRateMod = biome.modifiers.eventRate || 1.0;
        
        // Apply Augment Modifiers
        if (this.gameState.augmentsPurchased['explorers_compass']) {
            eventRateMod *= 1.2;
        }

        // Check for event expiration
        const currentTime = this.gameState.time.totalMinutes;
        const currentRound = this.gameState.round;
        this.gameState.world.activeEvents = this.gameState.world.activeEvents.filter(evt => {
            let expired = false;
            if (evt.endRound) {
                // Expire if current round >= end round
                if (currentRound >= evt.endRound) expired = true;
            } else {
                if (currentTime >= evt.endTime) expired = true;
            }

            if (expired) {
                if (typeof game !== 'undefined' && game.ui) {
                    game.ui.showMessage(`Event Ended: ${EVENTS[evt.id].name}`, 'system');
                }
                return false;
            }
            return true;
        });

        // Try to trigger new event
        // Base chance modified by biome and augments
        // Limit to 1 active event for now to keep it simple
        if (this.gameState.world.activeEvents.length === 0) {
            this.gameState.world.minutesSinceLastEvent++;
            
            // Luck Mitigation: Increase chance as time passes
            // Base pity chance increases by 0.1% per minute dry streak
            const pityBonus = this.gameState.world.minutesSinceLastEvent * 0.001;
            
            // Also scale with player Luck stat
            // Assuming 1 Luck = +10% relative chance? Or flat? 
            // Let's make Luck a multiplier: (1 + Luck * 0.1)
            const playerLuck = (this.gameState.stats && this.gameState.stats.luck) || 0;
            const luckMult = 1 + (playerLuck * 0.05);

            for (const eventId in EVENTS) {
                const event = EVENTS[eventId];
                // Calculate Base Chance from Rarity (1 / rarity)
                // Rarity 20 -> 0.05 (5%)
                const baseChance = 1 / (event.rarity || 20);
                
                // Final Chance = (Base + Pity) * BiomeMod * AugmentMod * Luck
                const chance = (baseChance + pityBonus) * eventRateMod * luckMult;
                
                if (this.eventRng() < chance) {
                    this.triggerEvent(eventId);
                    this.gameState.world.minutesSinceLastEvent = 0; // Reset pity
                    break; // Only one event per tick
                }
            }
        }
    }

    triggerEvent(eventId) {
        const event = EVENTS[String(eventId).toLowerCase()];
        const currentTime = this.gameState.time.totalMinutes;
        
        const activeEvent = {
            id: eventId,
            startTime: currentTime
        };

        if (event.durationRounds) {
            const currentRound = this.gameState.round || 1;
            activeEvent.startRound = currentRound;
            activeEvent.endRound = currentRound + event.durationRounds;
            activeEvent.endTime = currentTime + 9999999; // Fallback
        } else {
            const duration = event.duration * (this.getCurrentBiome().modifiers.durationMod || 1.0);
            activeEvent.endTime = currentTime + duration;
        }
        
        this.gameState.world.activeEvents.push(activeEvent);
        
        if (typeof game !== 'undefined' && game.ui) {
        // Trigger UI update to show flavor text in header
            if (game.ui.updateTimeDisplay) game.ui.updateTimeDisplay();
        }
    }

    getActiveEvents() {
        return this.gameState.world.activeEvents.map(evt => {
            const def = EVENTS[evt.id];
            // Return merged object: definition + runtime properties (id, startTime, endTime)
            return Object.assign({}, def, evt);
        });
    }
}
