/**
 * Main Game Controller
 * Orchestrates game flow and state management
 */

class Game {
    constructor() {
        this.gameState = new GameState();
        this.ui = new UI(this.gameState);
        this.gameRunning = false;
        this._rollTimeoutId = null;
    }

    /**
     * Toggle stats modal visibility
     */
    toggleStats() {
        const modal = document.getElementById('stats-modal');
        if (modal) {
            modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Toggle Index / Knowledge modal
     */
    toggleIndex() {
        const modal = document.getElementById('index-modal');
        if (!modal) return;
        const isHidden = modal.style.display === 'none';
        modal.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            modal.querySelectorAll('.index-tab').forEach(b => b.classList.remove('active'));
            modal.querySelectorAll('.index-panel').forEach(p => { p.style.display = 'none'; });
            const first = modal.querySelector('.index-tab');
            const firstPanel = document.getElementById('index-panel-items');
            if (first) first.classList.add('active');
            if (firstPanel) firstPanel.style.display = 'block';
        }
    }

    /**
     * Initialize the game and show start screen
     */
    init() {
        this.ui.renderStartScreen();
    }

    /**
     * Handle start game button
     */
    handleStartGame() {
        this.gameState.resetGame();
        this.gameRunning = true;
        this.handleStartWave();
    }

    /**
     * Start a new wave
     */
    handleStartWave() {
        this.gameState.startWave();
        this.ui.renderGameScreen();
    }

    /**
     * Handle rolling action (with animation; Space spamming skips animation)
     */
    handleRoll() {
        if (this.gameState.getRemainingRolls() <= 0) {
            this.ui.showMessage('No rolls remaining!', 'error');
            return;
        }

        const rollBtn = document.querySelector('.roll-button');
        const lastRolledDiv = document.getElementById('last-rolled');
        if (rollBtn) rollBtn.disabled = true;

        const duration = (typeof CONFIG !== 'undefined' && CONFIG.ROLL_ANIMATION_MS) || 800;
        if (lastRolledDiv) {
            lastRolledDiv.innerHTML = '<div class="roll-animation-in-progress"><span class="roll-dice">🎲</span><span class="roll-text">Rolling...</span></div>';
            lastRolledDiv.classList.add('is-rolling');
        }

        const applyRollResult = () => {
            if (this._rollTimeoutId) {
                clearTimeout(this._rollTimeoutId);
                this._rollTimeoutId = null;
            }
            const thing = this.gameState.rollThing();
            if (lastRolledDiv) lastRolledDiv.classList.remove('is-rolling');

            if (thing === null) {
                if (lastRolledDiv) lastRolledDiv.innerHTML = '<span class="last-roll-placeholder">—</span>';
                if (rollBtn) rollBtn.disabled = false;
                this.ui.showMessage('No rolls remaining!', 'error');
                return;
            }

            const streak = this.gameState.updateRareStreak(thing.rarity);
            const streakMessage = this.gameState.getRareStreakMessage();
            if (thing.rarity === 'epic' || thing.rarity === 'legendary') {
                this.celebrateRareItem(thing);
                if (streakMessage) this.ui.showMessage(streakMessage, 'epic');
            }

            const displayName = typeof getModifiedItemName === 'function' ? getModifiedItemName(thing) : thing.name;
            const allMods = typeof getAllModifications === 'function' ? getAllModifications(thing) : [];
            const modBadges = allMods.length > 0
                ? allMods.map(m => `<span class="mod-badge" title="${m.description || ''}">${m.emoji || ''} ${m.name}</span>`).join('')
                : '';
            const nameStyle = typeof getItemNameStyle === 'function' ? getItemNameStyle(thing) : {};
            const nameCss = typeof nameStyleToCss === 'function' ? nameStyleToCss(nameStyle) : '';
            const safeName = typeof escapeHtml === 'function' ? escapeHtml(displayName) : displayName;
            const nameHtml = `<span class="rolled-thing-name"${nameCss}>${safeName}</span>`;
            if (lastRolledDiv) {
                const wrapClass = thing.rarity === 'legendary' ? 'rolled-thing-name-wrap legendary-particle-wrap' : 'rolled-thing-name-wrap';
                lastRolledDiv.innerHTML = `
                    <div class="rolled-thing rolled-thing-holder rarity-${thing.rarity} ${thing.rarity === 'epic' || thing.rarity === 'legendary' ? 'rare-celebration' : ''}">
                        <div class="${wrapClass}">${nameHtml}</div>
                        <div class="rolled-thing-rarity">${thing.rarity.toUpperCase()}</div>
                        ${modBadges ? `<div class="rolled-thing-mods">${modBadges}</div>` : ''}
                        <div class="rolled-thing-value">+${thing.value} 💰</div>
                    </div>
                `;
            }

            const rollsDiv = document.querySelector('.rolls-remaining');
            if (rollsDiv) rollsDiv.textContent = `Rolls: ${this.gameState.getRemainingRolls()}`;

            const inventory = new Inventory(this.gameState);
            const invDisplay = inventory.getDisplay();
            const inventoryList = document.getElementById('inventory-list');
            if (inventoryList) inventoryList.innerHTML = this.ui.renderInventoryList(invDisplay);

            const totalValue = document.querySelector('.total-value');
            if (totalValue) totalValue.textContent = `${invDisplay.totalValue} 💰`;

            if (this.gameState.getRemainingRolls() <= 0 && rollBtn) rollBtn.disabled = true;
            else if (rollBtn) rollBtn.disabled = false;

            this.ui.showMessage(`Rolled ${thing.name}!`, 'success');
        };

        this._rollTimeoutId = setTimeout(() => {
            this._rollTimeoutId = null;
            applyRollResult();
        }, duration);
        this._rollResolve = applyRollResult;
    }

    /** Skip roll animation (e.g. Space spam) - runs the pending roll result immediately */
    skipRollAnimation() {
        if (!this._rollTimeoutId || !this._rollResolve) return;
        clearTimeout(this._rollTimeoutId);
        this._rollTimeoutId = null;
        const fn = this._rollResolve;
        this._rollResolve = null;
        fn();
    }

    /**
     * Celebrate rare item roll with visual effects
     * Creates dopamine reward for epic/legendary items
     */
    celebrateRareItem(thing) {
        const rarity = thing.rarity;
        let message = '';
        let emoji = '';
        
        if (rarity === 'legendary') {
            message = `🌟 LEGENDARY! ${thing.name}! 🌟`;
            emoji = '✨';
        } else if (rarity === 'epic') {
            message = `⭐ EPIC! ${thing.name}!`;
            emoji = '⭐';
        }

        // Show prominent message
        if (message) {
            this.ui.showMessage(message, 'epic');
            
            // Add floating effect
            const celebration = document.createElement('div');
            celebration.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 4em;
                z-index: 10000;
                animation: float-up 2s ease-out forwards;
                pointer-events: none;
            `;
            celebration.textContent = emoji;
            document.body.appendChild(celebration);
            
            setTimeout(() => celebration.remove(), 2000);
        }
    }
    /**
     * Handle end of wave - sell inventory, earn rewards, advance
     */
    handleEndWave() {
        if (this.gameState.inventory.length === 0) {
            this.ui.showMessage('You have nothing to sell!', 'error');
            return;
        }

        // Sell inventory to get chips for this wave
        const earnedChips = this.gameState.sellInventory();
        this.ui.showMessage(`Sold items for ${earnedChips} 💰!`, 'success');

        setTimeout(() => {
            // Complete the wave and earn cash rewards + interest
            const rewards = this.gameState.completeWave();
            
            // Check if can afford next wave
            const cost = this.gameState.getWaveEntryCost();
            const canAdvance = this.gameState.chips >= cost;

            if (canAdvance) {
                const result = this.gameState.advanceWave();
                if (result.success) {
                    if (result.isBossReward) {
                        this.ui.renderBossRewardScreen();
                    } else {
                        this.ui.renderShopScreen();
                    }
                } else {
                    this.ui.renderGameOver(result.message);
                }
            } else {
                // Game over - insufficient chips
                this.ui.renderGameOver(
                    `You didn't earn enough chips!<br>` +
                    `Needed ${cost} 💰 for wave ${this.gameState.wave + 1}<br>` +
                    `Earned ${earnedChips} 💰 (spent all)`
                );
            }
        }, 500);
    }

    /**
     * Handle purchasing a perk from shop
     */
    handleBuyPerk(perkId) {
        const result = this.gameState.purchasePerk(perkId);
        
        if (result.success) {
            this.ui.showMessage(result.message, 'success');
            
            // Find and animate the purchased perk card with flip
            const shopGrid = document.getElementById('shop-grid');
            if (shopGrid) {
                const card = shopGrid.querySelector(`.perk-card[data-perk-id="${perkId}"]`);
                if (card) {
                    card.classList.add('flip-purchase');
                    setTimeout(() => {
                        shopGrid.innerHTML = this.ui.renderShop();
                    }, 600);
                }
            }
            
            // Update stats display (wave, cash, interest, chips)
            const stats = document.querySelector('.game-stats');
            if (stats) {
                stats.innerHTML = `
                    <div class="stat-item">
                        <span class="stat-label">Wave</span>
                        <span class="stat-value">${this.gameState.wave}</span>
                    </div>
                    <div class="stat-item cash-with-tooltip">
                        <span class="stat-label">Cash</span>
                        <div class="cash-tooltip-wrapper">
                            <span class="stat-value stat-cash">${this.gameState.cash}$</span>
                            <div class="interest-tooltip">
                                <span class="interest-tooltip-text">Interest: 💰×${this.gameState.interestStacks}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Update owned perks topbar
            const topbar = document.querySelector('.topbar-perks');
            if (topbar) {
                topbar.innerHTML = this.ui.renderTopbarPerks();
            }
        } else {
            this.ui.showMessage(result.message, 'error');
        }
    }

    /**
     * Handle continue after wave transition
     */
    handleContinueWave() {
        this.handleStartWave();
    }

    /**
     * Handle game restart
     */
    handleRestart() {
        this.gameRunning = false;
        this.gameState.resetGame();
        this.ui.renderStartScreen();
    }

    /** Boss reward: select a perk (call when clicking a perk card) */
    handleBossPerkSelect(perkId) {
        const result = this.gameState.chooseBossPerk(perkId);
        if (result) {
            this.ui.showMessage('Perk acquired!', 'success');
            this.ui.updateBossRewardScreen();
        }
    }

    /** Boss reward: confirm after picking 3 perks */
    handleConfirmBossReward() {
        if (this.gameState.getBossPerksPickedCount() < CONFIG.BOSS_PERK_PICK_COUNT) {
            this.ui.showMessage(`Pick ${CONFIG.BOSS_PERK_PICK_COUNT} perks first!`, 'error');
            return;
        }
        this.gameState.confirmBossReward();
        this.ui.renderShopScreen();
    }
}

// Create global game instance
let game;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
    game.init();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!game) return;
    if (e.code !== 'Space') return;
    e.preventDefault();
    // Spam Space to skip roll animation
    if (game._rollTimeoutId) {
        game.skipRollAnimation();
        return;
    }
    if (!game.gameRunning) return;
    game.handleRoll();
});
