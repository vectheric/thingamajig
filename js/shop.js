/**
 * Shop Management
 * Handles shop items and purchases
 */

class Shop {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentShopAugments = [];
    }

    /**
     * Get random shop augments for current round (starts at 4 augments, unowned only)
     */
    generateShopAugments() {
        const attrs = this.gameState.getAttributes();
        const luck = attrs.luck || 0;
        
        const targetRound = this.gameState.pendingNextRound || this.gameState.round;

        // Calculate shop size based on round
        let shopSize = 4;
        

        const rng = (this.gameState.rngStreams && typeof this.gameState.rngStreams.augments === 'function') 
            ? this.gameState.rngStreams.augments 
            : Math.random;

        this.currentShopAugments = getRandomShopAugments(
            targetRound,
            shopSize,
            this.gameState.augmentsPurchased,
            rng,
            luck,
            this.gameState
        );

        return this.currentShopAugments;
    }

    /**
     * Get all available shop items for purchase (only random augments from current round)
     */
    getAvailableItems() {
        // If no shop augments generated, generate them
        if (this.currentShopAugments.length === 0) {
            this.generateShopAugments();
        }

        const worldEffects = (this.gameState.worldSystem && this.gameState.worldSystem.getEffectiveWorldEffects) 
            ? this.gameState.worldSystem.getEffectiveWorldEffects() 
            : null;

        return this.currentShopAugments.map(augment => {
            const ownedCount = this.gameState.augmentsPurchased[augment.id] || 0;
            const maxStack = (augment.properties && augment.properties.stack) || 1;
            const isMaxed = ownedCount >= maxStack;

            // Check for conflicts
            let isConflicted = false;
            let conflictReason = null;
            if (augment.properties && augment.properties.conflict) {
                const conflicts = Array.isArray(augment.properties.conflict) ? augment.properties.conflict : [augment.properties.conflict];
                for (const conflictId of conflicts) {
                    if (this.gameState.augmentsPurchased[conflictId]) {
                        isConflicted = true;
                        // Try to find name of conflicting augment
                        const conflictAugment = typeof getAugmentById === 'function' ? getAugmentById(conflictId) : null;
                        conflictReason = conflictAugment ? conflictAugment.name : conflictId;
                        break;
                    }
                }
            }

            // Apply Price Effects
            let finalCost = augment.cost;
            if (worldEffects && worldEffects.augmentPrice) {
                worldEffects.augmentPrice.forEach(effect => {
                    if (effect.type === 'set') finalCost = effect.value;
                    else if (effect.type === 'add') finalCost += effect.value;
                    else if (effect.type === 'multi') finalCost *= effect.value;
                    else if (effect.type === 'div' && effect.value !== 0) finalCost /= effect.value;
                });
                finalCost = Math.max(0, Math.round(finalCost));
            }

            return {
                id: augment.id,
                name: augment.name,
                description: augment.description,
                cost: finalCost,
                rarity: augment.rarity || augment.tier, // Fallback to tier if rarity is missing
                type: augment.type,
                icon: augment.icon,
                special: augment.special,
                nameStyle: augment.nameStyle,
                owned: isMaxed, // Only show as owned (disabled) if maxed out
                conflicted: isConflicted,
                conflictReason: conflictReason,
                count: ownedCount, // Pass current count for UI if needed
                maxStack: maxStack
            };
        });
    }



    /**
     * Try to purchase a augment
     */
    purchaseAugment(augmentId, instanceId = null) {
        const result = this.gameState.purchaseAugment(augmentId);
        
        // If success and it's a subaugment/special, remove from shop to prevent multiple purchases in one go
        // (It will reappear next time it's generated)
        if (result.success) {
            let index = -1;
            
            // If instanceId is provided, look for exact match
            if (instanceId) {
                index = this.currentShopAugments.findIndex(p => p.instanceId === instanceId);
            } 
            // Fallback to finding first matching ID (legacy behavior)
            if (index === -1) {
                index = this.currentShopAugments.findIndex(p => p.id === augmentId);
            }

            if (index !== -1) {
                // Remove purchased augment from shop (single stock per card)
                this.currentShopAugments.splice(index, 1);
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
     * Get list of owned augments
     */
    getOwnedAugments() {
        const order = this.gameState.augmentOrder || [];
        const entries = Object.entries(this.gameState.augmentsPurchased)
            .filter(([_, owned]) => owned)
            .map(([augmentId, _]) => {
                let augment = typeof getAugmentById === 'function' ? getAugmentById(augmentId) : null;
                if (!augment && typeof getBossAugmentById === 'function') augment = getBossAugmentById(augmentId);
                return augment ? { id: augmentId, name: augment.name } : null;
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

