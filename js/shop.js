/**
 * Shop Management
 * Handles shop items and purchases
 */

class Shop {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentShopPerks = [];
        this.currentShopConsumables = [];
    }

    /**
     * Get random shop perks for current wave (4 perks, unowned only)
     */
    generateShopPerks() {
        this.currentShopPerks = getRandomShopPerks(
            this.gameState.wave,
            4,
            this.gameState.perksPurchased,
            (this.gameState.rngStreams && this.gameState.rngStreams.perks) ? this.gameState.rngStreams.perks : Math.random
        );
        // Generate 3 random consumables for the shop (can have duplicates)
        this.currentShopConsumables = getRandomShopConsumables(
            3,
            (this.gameState.rngStreams && this.gameState.rngStreams.perks) ? this.gameState.rngStreams.perks : Math.random
        );
        return this.currentShopPerks;
    }

    /**
     * Get all available shop items for purchase (only random perks from current wave)
     */
    getAvailableItems() {
        // If no shop perks generated, generate them
        if (this.currentShopPerks.length === 0) {
            this.generateShopPerks();
        }

        return this.currentShopPerks.map(perk => ({
            id: perk.id,
            name: perk.name,
            description: perk.description,
            cost: perk.cost,
            rarity: perk.rarity,
            special: perk.special,
            owned: !!this.gameState.perksPurchased[perk.id]
        }));
    }

    /**
     * Get current shop consumables
     */
    getShopConsumables() {
        if (this.currentShopConsumables.length === 0) {
            this.generateShopPerks();
        }
        return this.currentShopConsumables;
    }

    /**
     * Purchase a consumable from the shop
     */
    purchaseConsumable(index) {
        const consumables = this.getShopConsumables();
        if (index < 0 || index >= consumables.length) {
            return { success: false, message: 'Invalid consumable' };
        }
        
        const consumable = consumables[index];
        if (this.gameState.cash < consumable.cost) {
            return { success: false, message: `Not enough cash! Need ${consumable.cost}$` };
        }
        
        // Try to add to inventory
        const result = this.gameState.addConsumable(consumable);
        if (!result.success) {
            return result;
        }
        
        // Spend cash
        this.gameState.currency.spendCash(consumable.cost);
        
        // Remove from shop
        this.currentShopConsumables.splice(index, 1);
        
        return { success: true, message: `Purchased ${consumable.name}!` };
    }

    /**
     * Try to purchase a perk
     */
    purchasePerk(perkId) {
        const result = this.gameState.purchasePerk(perkId);
        // Keep purchased perk visible but grayscaled - don't remove it
        return result;
    }

    /**
     * Get current cash (for showing affordability)
     */
    getCash() {
        return this.gameState.cash;
    }

    /**
     * Get current chip count (for wave progress)
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
                let perk = PERKS[Object.keys(PERKS).find(k => PERKS[k].id === perkId)];
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

