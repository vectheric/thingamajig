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
            name: thing.name,
            value: thing.value,
            rarity: thing.rarity,
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
