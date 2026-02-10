/**
 * Inventory Management
 * Handles displaying and managing items
 */

class Inventory {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Get formatted inventory display
     */
    getDisplay() {
        if (this.gameState.inventory.length === 0) {
            return {
                items: [],
                totalValue: 0,
                isEmpty: true
            };
        }

        const items = this.gameState.inventory.map((thing, index) => ({
            id: index,
            templateId: thing.id,
            name: thing.name,
            value: thing.value,
            rarity: thing.tier,
            rarityScore: thing.rarityScore,
            nameStyle: thing.nameStyle,
            attribute: thing.attribute,
            mods: thing.mods,
            baseValue: thing.baseValue,
            priceMultiplier: thing.priceMultiplier
        }));

        const totalValue = this.gameState.getInventoryValue();

        return {
            items: items,
            totalValue: totalValue,
            isEmpty: false,
            count: items.length
        };
    }

    /**
     * Get paginated items
     */
    getPaginatedItems(page, itemsPerPage) {
        const display = this.getDisplay();
        const items = display.items;
        const totalItems = items.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        
        // Ensure current page is valid
        if (page >= totalPages) page = totalPages - 1;
        if (page < 0) page = 0;
        
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedItems = items.slice(start, end);
        
        return {
            items: paginatedItems,
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems,
            hasPrev: page > 0,
            hasNext: page < totalPages - 1
        };
    }

    /**
     * Remove item from inventory by index
     */
    removeItem(index) {
        if (index >= 0 && index < this.gameState.inventory.length) {
            this.gameState.inventory.splice(index, 1);
        }
    }

    /**
     * Get rarity color class
     */
    getRarityClass(rarity) {
        return `rarity-${rarity}`;
    }
}
