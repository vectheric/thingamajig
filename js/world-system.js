/**
 * World System
 * Handles Biomes and Random Events
 * Affected by PRNG and Luck
 */

const BIOMES = {
    PLAINS: {
        id: 'plains',
        name: 'Grassy Plains',
        description: 'A peaceful meadow. Standard luck.',
        color: '#90EE90', // LightGreen
        modifiers: { luck: 1.0, eventRate: 1.0 },
        weight: 10
    },
    FOREST: {
        id: 'forest',
        name: 'Mystic Forest',
        description: 'Dense trees obscure secrets. Slightly higher event rate.',
        color: '#228B22', // ForestGreen
        modifiers: { luck: 1.1, eventRate: 1.2 },
        weight: 8
    },
    DESERT: {
        id: 'desert',
        name: 'Scorched Desert',
        description: 'Harsh conditions. Lower event rate, but better loot.',
        color: '#F4A460', // SandyBrown
        modifiers: { luck: 1.2, eventRate: 0.8 },
        weight: 6
    },
    TUNDRA: {
        id: 'tundra',
        name: 'Frozen Tundra',
        description: 'Bitter cold. Slows down time (events last longer).',
        color: '#E0FFFF', // LightCyan
        modifiers: { luck: 1.0, eventRate: 1.0, durationMod: 1.5 },
        weight: 6
    },
    VOLCANO: {
        id: 'volcano',
        name: 'Volcanic Wastes',
        description: 'Dangerous and rich. High risk, high reward.',
        color: '#CD5C5C', // IndianRed
        modifiers: { luck: 1.5, eventRate: 1.5 },
        weight: 3
    }
};

const EVENTS = {
    GOLD_RUSH: {
        id: 'gold_rush',
        name: 'Gold Rush',
        description: 'Cash earnings doubled for a short time!',
        flavorText: 'The rivers shimmer with gold dust...',
        textStroke: '1px #FFD700', // Gold stroke
        color: '#FFF', // White text
        duration: 60, // minutes (seconds)
        chance: 0.05, // 5% check per minute
        effect: (gameState) => { /* Logic handled in hooks */ }
    },
    LUCKY_STREAK: {
        id: 'lucky_streak',
        name: 'Lucky Streak',
        description: 'Luck increased significantly!',
        flavorText: 'You feel the skibidi sigma boosting the fortune 69 around you btw gang haha 6 7 LOL i FEEL so schzizophrenia i use arch btw gang, lol skibidi dynamo of fate is a cool ore but shit joke get used to the new w0 ores dude i hate it but LOREM IPSUM bro i vibecoded this game but with a brain lol do you get the joke ? gang why is there a "..." in the end...',
        textStroke: '1px #00FF00', // Green stroke
        color: '#FFD700', // Gold Text
        duration: 45,
        chance: 0.03,
        effect: (gameState) => { /* Logic handled in hooks */ }
    },
    MARKET_CRASH: {
        id: 'market_crash',
        name: 'Market Crash',
        description: 'Shop prices dropped by 50%!',
        flavorText: 'Panic in the market! Prices are plummeting...',
        textStroke: null, // Red stroke
        color: '#ff0a0aff', // Black text
        duration: 30,  
        chance: 0.02,
        effect: (gameState) => { /* Logic handled in hooks */ }
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
     * Merges effects for perkPrice, modifiers, items, etc.
     */
    getEffectiveWorldEffects() {
        const effects = {
            perkPrice: [], // Array of { type, value }
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
            const eventDef = (typeof EVENTS !== 'undefined') 
                ? Object.values(EVENTS).find(e => e.id === event.id) 
                : null;
            if (eventDef && eventDef.eventEffect) {
                sources.push(eventDef.eventEffect);
            }
        });

        // Merge Effects
        sources.forEach(source => {
            // Perk Price
            if (source.perkPrice) {
                effects.perkPrice.push(source.perkPrice);
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
        });

        return effects;
    }

    /**
     * Change Biome based on Route (Round)
     * Called when advancing to next round
     * Affected by PRNG, Perks, and Luck
     */
    generateBiome() {
        const biomeKeys = Object.keys(BIOMES);
        
        // Calculate Total Weight
        let totalWeight = 0;
        const weights = [];
        
        // Player stats/perks can influence weights
        const attrs = this.gameState.getAttributes ? this.gameState.getAttributes() : { luck: 0 };
        const playerLuck = attrs.luck || 0;
        const hasCompass = this.gameState.perksPurchased['explorers_compass'];

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
            let weight = biome.weight || 10;
            
            // Luck Modifier: Rare biomes (lower base weight) get a boost from luck
            // Logic: If weight <= 6 (Desert, Tundra, Volcano), Luck increases it
            if (weight <= 6) {
                // Boost factor: 10% per luck point
                // For Very Rare (Volcano, weight <= 3): 20% boost
                const boost = (weight <= 3) ? 0.2 : 0.1;
                
                if (effectiveLuck > 0) {
                    weight *= (1 + effectiveLuck * boost);
                }
            }
            
            // Perk Modifier
            if (hasCompass && (key === 'CYBER_CITY' || key === 'VOLCANO')) {
                weight *= 2.0; // Double chance for rare biomes with Compass
            }
            
            weights.push({ key, weight });
            totalWeight += weight;
        }
        
        // Weighted Random Selection using Seeded PRNG
        const roll = this.biomeRng() * totalWeight;
        let cumulative = 0;
        let selectedBiomeKey = 'PLAINS';
        
        for (const item of weights) {
            cumulative += item.weight;
            if (roll < cumulative) {
                selectedBiomeKey = item.key;
                break;
            }
        }
        
        // Store the KEY (e.g. 'PLAINS') so we can look it up in BIOMES later
        this.gameState.world.currentBiomeId = selectedBiomeKey;
        
        const selectedBiome = BIOMES[selectedBiomeKey];

        // Update Bad Luck Streak
        // If we got a Rare biome (base weight <= 6), reset streak
        // Otherwise increment
        if ((selectedBiome.weight || 10) <= 6) {
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
        // Handle both Key (PLAINS) and ID (plains) just in case, but prefer Key lookup
        const id = this.gameState.world.currentBiomeId;
        if (BIOMES[id]) return BIOMES[id];
        
        // Fallback: search by id property (slow but safe)
        const found = Object.values(BIOMES).find(b => b.id === id);
        return found || BIOMES.PLAINS;
    }

    /**
     * Attempt to trigger random events
     * Called every game minute
     */
    tickEvents() {
        const biome = this.getCurrentBiome();
        let eventRateMod = biome.modifiers.eventRate || 1.0;
        
        // Apply Perk Modifiers
        if (this.gameState.perksPurchased['explorers_compass']) {
            eventRateMod *= 1.2;
        }

        // Check for event expiration
        const currentTime = this.gameState.time.totalMinutes;
        this.gameState.world.activeEvents = this.gameState.world.activeEvents.filter(evt => {
            if (currentTime >= evt.endTime) {
                if (typeof game !== 'undefined' && game.ui) {
                    game.ui.showMessage(`Event Ended: ${EVENTS[evt.id].name}`, 'system');
                }
                return false;
            }
            return true;
        });

        // Try to trigger new event
        // Base chance modified by biome and perks
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
                // Final Chance = (Base + Pity) * BiomeMod * PerkMod * Luck
                const chance = (event.chance + pityBonus) * eventRateMod * luckMult;
                
                if (this.eventRng() < chance) {
                    this.triggerEvent(eventId);
                    this.gameState.world.minutesSinceLastEvent = 0; // Reset pity
                    break; // Only one event per tick
                }
            }
        }
    }

    triggerEvent(eventId) {
        const event = EVENTS[eventId];
        const currentTime = this.gameState.time.totalMinutes;
        const duration = event.duration * (this.getCurrentBiome().modifiers.durationMod || 1.0);
        
        this.gameState.world.activeEvents.push({
            id: eventId,
            startTime: currentTime,
            endTime: currentTime + duration
        });
        
        if (typeof game !== 'undefined' && game.ui) {
        // Trigger UI update to show flavor text in header
            if (game.ui.updateTimeDisplay) game.ui.updateTimeDisplay();
        }
    }

    getActiveEvents() {
        return this.gameState.world.activeEvents.map(evt => EVENTS[evt.id]);
    }
}
