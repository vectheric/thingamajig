/**
 * Shop Management
 * Handles shop items and purchases
 */

class Shop {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentShopPerks = [];
    }

    /**
     * Get random shop perks for current round (starts at 4 perks, unowned only)
     */
    generateShopPerks() {
        const attrs = this.gameState.getAttributes();
        const luck = attrs.luck || 0;
        
        const targetRound = this.gameState.pendingNextRound || this.gameState.round;

        // Calculate shop size based on round
        let shopSize = 4;
        

        const rng = (this.gameState.rngStreams && typeof this.gameState.rngStreams.perks === 'function') 
            ? this.gameState.rngStreams.perks 
            : Math.random;

        this.currentShopPerks = getRandomShopPerks(
            targetRound,
            shopSize,
            this.gameState.perksPurchased,
            rng,
            luck,
            this.gameState
        );

        return this.currentShopPerks;
    }

    /**
     * Get all available shop items for purchase (only random perks from current round)
     */
    getAvailableItems() {
        // If no shop perks generated, generate them
        if (this.currentShopPerks.length === 0) {
            this.generateShopPerks();
        }

        const worldEffects = (this.gameState.worldSystem && this.gameState.worldSystem.getEffectiveWorldEffects) 
            ? this.gameState.worldSystem.getEffectiveWorldEffects() 
            : null;

        return this.currentShopPerks.map(perk => {
            const ownedCount = this.gameState.perksPurchased[perk.id] || 0;
            const maxStack = (perk.properties && perk.properties.stack) || 1;
            const isMaxed = ownedCount >= maxStack;

            // Check for conflicts
            let isConflicted = false;
            let conflictReason = null;
            if (perk.properties && perk.properties.conflict) {
                const conflicts = Array.isArray(perk.properties.conflict) ? perk.properties.conflict : [perk.properties.conflict];
                for (const conflictId of conflicts) {
                    if (this.gameState.perksPurchased[conflictId]) {
                        isConflicted = true;
                        // Try to find name of conflicting perk
                        const conflictPerk = typeof getPerkById === 'function' ? getPerkById(conflictId) : null;
                        conflictReason = conflictPerk ? conflictPerk.name : conflictId;
                        break;
                    }
                }
            }

            // Apply Price Effects
            let finalCost = perk.cost;
            if (worldEffects && worldEffects.perkPrice) {
                worldEffects.perkPrice.forEach(effect => {
                    if (effect.type === 'set') finalCost = effect.value;
                    else if (effect.type === 'add') finalCost += effect.value;
                    else if (effect.type === 'multi') finalCost *= effect.value;
                    else if (effect.type === 'div' && effect.value !== 0) finalCost /= effect.value;
                });
                finalCost = Math.max(0, Math.round(finalCost));
            }

            return {
                id: perk.id,
                name: perk.name,
                description: perk.description,
                cost: finalCost,
                rarity: perk.rarity || perk.tier, // Fallback to tier if rarity is missing
                type: perk.type,
                icon: perk.icon,
                special: perk.special,
                nameStyle: perk.nameStyle,
                owned: isMaxed, // Only show as owned (disabled) if maxed out
                conflicted: isConflicted,
                conflictReason: conflictReason,
                count: ownedCount, // Pass current count for UI if needed
                maxStack: maxStack
            };
        });
    }



    /**
     * Try to purchase a perk
     */
    purchasePerk(perkId, instanceId = null) {
        const result = this.gameState.purchasePerk(perkId);
        
        // If success and it's a subperk/special, remove from shop to prevent multiple purchases in one go
        // (It will reappear next time it's generated)
        if (result.success) {
            let index = -1;
            
            // If instanceId is provided, look for exact match
            if (instanceId) {
                index = this.currentShopPerks.findIndex(p => p.instanceId === instanceId);
            } 
            // Fallback to finding first matching ID (legacy behavior)
            if (index === -1) {
                index = this.currentShopPerks.findIndex(p => p.id === perkId);
            }

            if (index !== -1) {
                // Remove purchased perk from shop (single stock per card)
                this.currentShopPerks.splice(index, 1);
            }
        }

        return result;
    }

    /**
     * Get current cash (for showing affordability)
     */
    getCash() {
        return this.gameState.cash;
    }

    /**
     * Get current chip count (for round progress)
     */
    getChips() {
        return this.gameState.chips;
    }

    /**
     * Get list of owned perks
     */
    getOwnedPerks() {
        const order = this.gameState.perkOrder || [];
        const entries = Object.entries(this.gameState.perksPurchased)
            .filter(([_, owned]) => owned)
            .map(([perkId, _]) => {
                let perk = typeof getPerkById === 'function' ? getPerkById(perkId) : null;
                if (!perk && typeof getBossPerkById === 'function') perk = getBossPerkById(perkId);
                return perk ? { id: perkId, name: perk.name } : null;
            })
            .filter(p => p !== null);
        if (order.length) {
            entries.sort((a, b) => {
                const ai = order.indexOf(a.id);
                const bi = order.indexOf(b.id);
                if (ai === -1 && bi === -1) return 0;
                if (ai === -1) return 1;
                if (bi === -1) return -1;
                return ai - bi;
            });
        }
        return entries;
    }
}

