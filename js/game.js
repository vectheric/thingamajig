
/**
 * Main Game Controller
 * Orchestrates game flow, state management, and user interactions
 * 
 * Key responsibilities:
 * - Game state management and transitions
 * - User input handling (rolls, purchases, navigation)
 * - UI coordination and updates
 * - Animation and visual effect management
 * - Shop and inventory management
 */
class Game {
    constructor(seed) {
        this.gameState = new GameState(seed);
        this.inventory = new Inventory(this.gameState);
        this.shop = new Shop(this.gameState);
        this.ui = new UI(this.gameState, this.shop, this.inventory);
        this.gameRunning = false;
        this._rollTimeoutId = null;
        this._animationInProgress = false;
        this.selectedShopPerkId = null;
        this.shopRerollCost = 5; // Starting reroll cost
        this.selectedConsumableIndex = -1; // -1 means none selected
    }

    /**
     * Toggle stats modal visibility
     */
    toggleStats() {
        const modal = document.getElementById('stats-modal');
        if (modal) {
            const isHidden = modal.style.display === 'none';
            
            if (isHidden) {
                // Opening
                const updateContent = () => {
                    // Safety check: if modal is no longer in DOM, stop updating
                    if (!document.body.contains(modal)) {
                        if (this._statsInterval) {
                            clearInterval(this._statsInterval);
                            this._statsInterval = null;
                        }
                        return;
                    }

                    const content = modal.querySelector('.stats-content');
                    if (content && this.ui) {
                        const existingAttrs = content.querySelector('.attributes-display');
                        if (existingAttrs) {
                            existingAttrs.outerHTML = this.ui.renderAttributes();
                        }
                    }
                };
                
                updateContent(); // Initial update
                modal.style.display = 'block';
                
                // Clear any existing interval just in case
                if (this._statsInterval) clearInterval(this._statsInterval);
                
                // Start updating every second to keep timer fresh
                this._statsInterval = setInterval(updateContent, 1000);
            } else {
                // Closing
                modal.style.display = 'none';
                if (this._statsInterval) {
                    clearInterval(this._statsInterval);
                    this._statsInterval = null;
                }
            }
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
        this.particles = new BackgroundParticles();
        this.ui.renderStartScreen();
    }

    /**
     * Handle start game transition
     */
    handleStartTransition(btn) {
        if (this._transitioning) return;
        this._transitioning = true;
        
        // Add transition class to start screen
        const startScreen = document.querySelector('.start-screen');
        if (startScreen) {
            startScreen.classList.add('launching');
        }
        
        if (btn) {
            btn.classList.add('active');
        }

        // Wait for animation then start
        setTimeout(() => {
            this.handleStartGame();
            this._transitioning = false;
        }, 800);
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
     * Handle next loot page
     */
    handleNextLootPage() {
        this.gameState.nextLootPage();
        this.refreshLootDisplay();
    }

    /**
     * Handle previous loot page
     */
    handlePrevLootPage() {
        this.gameState.prevLootPage();
        this.refreshLootDisplay();
    }

    /**
     * Refresh loot display after pagination
     */
    refreshLootDisplay() {
        const lootList = document.getElementById('loot-list');
        const paginationContainer = document.querySelector('.loot-pagination');
        const paginated = this.ui.renderPaginatedLootList();
        
        if (lootList) {
            lootList.innerHTML = paginated.html;
        }
        if (paginationContainer) {
            paginationContainer.outerHTML = paginated.pagination || '<div class="loot-pagination" style="display:none;"></div>';
        }
        this.ui.attachSmartTooltips();
        this.attachTiltEffect();
    }

    /**
     * Start a new wave
     */
    handleStartWave() {
        const targetWave = this.gameState.pendingNextWave;
        if (targetWave != null) {
            const entryCost = this.gameState.getWaveEntryCost();
            if (this.gameState.chips < entryCost) {
                this.ui.renderBreakdownScreen({
                    type: 'game_over',
                    reason: `You didn't earn enough chips!<br>` +
                            `Needed ${entryCost} C for wave ${targetWave}<br>` +
                            `Had ${this.gameState.chips} C`
                });
                return;
            }
            this.gameState.wave = targetWave;
            this.gameState.pendingNextWave = null;
        }
        this.gameState.startWave();
        this.gameState.resetLootPage(); // Reset loot pagination when starting new wave
        this.ui.renderGameScreen();
    }

    /**
     * Handle rolling action with animation support
     * 
     * Features:
     * - Animated dice rolling with visual feedback
     * - Space key spamming skips animation for faster gameplay
     * - Automatic wave completion when chip goal is met
     * - Rare item celebration effects for epic/legendary items
     * 
     * @returns {void}
     */
    handleRoll() {
        if (!this.gameRunning) return;
        if (!this.ui || this.ui.currentScreen !== 'game') return;
        if (this.gameState.getRemainingRolls() <= 0) {
            this.ui.showMessage('No rolls remaining!', 'error');
            return;
        }

        // Track stats
        this.gameState.addStat('totalRollsUsed', 1);

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

            // Track stats
            this.gameState.addStat('totalItemsRolled', 1);

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
            
            const wrapClass = thing.rarity === 'legendary' ? 'rolled-thing-name-wrap legendary-particle-wrap' : 'rolled-thing-name-wrap';
            if (lastRolledDiv) {
                lastRolledDiv.innerHTML = `
                    <div class="rolled-thing rolled-thing-holder rarity-${thing.rarity} ${thing.rarity === 'epic' || thing.rarity === 'legendary' ? 'rare-celebration' : ''}">
                        <div class="${wrapClass}">${nameHtml}</div>
                        <div class="rolled-thing-rarity">${thing.rarity.toUpperCase()}</div>
                        ${modBadges ? `<div class="rolled-thing-mods">${modBadges}</div>` : ''}
                        <div class="rolled-thing-value">+${thing.value} C</div>
                    </div>
                `;
            }

            const rollsDiv = document.querySelector('.rolls-remaining');
            if (rollsDiv) rollsDiv.textContent = `Rolls: ${this.gameState.getRemainingRolls()}`;

            const lootList = document.getElementById('loot-list');
            if (lootList) {
                const paginated = this.ui.renderPaginatedLootList();
                lootList.innerHTML = paginated.html;
            }
            
            // Update pagination if it exists
            const paginationContainer = document.querySelector('.loot-pagination');
            if (paginationContainer) {
                const paginated = this.ui.renderPaginatedLootList();
                paginationContainer.outerHTML = paginated.pagination || '<div class="loot-pagination" style="display:none;"></div>';
            }

            const inventory = new Inventory(this.gameState);
            const invDisplay = inventory.getDisplay();
            const totalValue = document.querySelector('.total-value');
            if (totalValue) totalValue.textContent = `${invDisplay.totalValue} C`;

            if (this.gameState.getRemainingRolls() <= 0 && rollBtn) rollBtn.disabled = true;
            else if (rollBtn) rollBtn.disabled = false;

            this.ui.showMessage(`Rolled ${thing.name}!`, 'success');

            // If player already has enough chips for next wave, end the wave immediately
            // so remaining rolls can convert to cash and the shop opens automatically.
            const costNow = this.gameState.getWaveEntryCost();
            const potentialChips = this.gameState.calculateEarnedChipsForValue(this.gameState.getInventoryValue());
            if (potentialChips >= costNow) {
                setTimeout(() => {
                    if (this.gameRunning) this.handleEndWave();
                }, 250);
                return;
            }

            if (this.gameState.getRemainingRolls() <= 0) {
                setTimeout(() => {
                    if (this.gameRunning) this.handleEndWave();
                }, 200);
            }
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
        const rollsRemaining = this.gameState.getRemainingRolls();
        const rollsToCash = Math.max(0, rollsRemaining);

        // Convert remaining rolls to cash before selling/finishing wave.
        if (rollsToCash > 0) this.gameState.currency.addCash(rollsToCash);

        const earnedChips = this.gameState.inventory.length === 0 ? 0 : this.gameState.sellInventory();
        if (this.gameState.inventory.length === 0) {
            this.ui.showMessage('No items to sell.', 'info');
        } else {
            this.ui.showMessage(`Sold items for ${earnedChips} C!`, 'success');
        }

        setTimeout(() => {
            // Complete the wave and earn cash rewards + interest
            const rewards = this.gameState.completeWave();
            
            // Check if can afford next wave
            const nextWave = this.gameState.wave + 1;

            const cost = this.gameState.getWaveEntryCost();
            const canAdvance = this.gameState.chips >= cost;

            const nextCost = cost;
            const isBossNext = typeof isBossWave === 'function' && isBossWave(nextWave);

            // If player cannot advance, it's game over.
            const type = canAdvance ? 'wave_complete' : 'game_over';
            const reason = canAdvance ? '' : 
                `You didn't earn enough chips!<br>` +
                `Needed ${nextCost} C for wave ${this.gameState.wave + 1}<br>` +
                `Had ${this.gameState.chips} C (earned ${earnedChips} C this wave)`;

            this.ui.renderBreakdownScreen({
                type,
                reason,
                wave: this.gameState.wave,
                chipsEarned: earnedChips,
                rollsRemaining,
                rollsToCash,
                baseReward: rewards.baseReward,
                interestReward: rewards.interestReward,
                cashBonus: rewards.cashBonus,
                totalReward: rewards.totalReward + rollsToCash,
                totalCash: this.gameState.cash,
                canAdvance,
                nextCost,
                isBossNext
            });
            
        }, 1200);
    }

    /** Shop: click once to select, click twice to purchase */
    handleShopPerkClick(perkId) {
        if (!perkId) return;
        if (!this.ui || this.ui.currentScreen !== 'shop') return;

        if (this.selectedShopPerkId !== perkId) {
            this.selectedShopPerkId = perkId;
            const grid = document.getElementById('shop-grid');
            if (grid) grid.innerHTML = this.ui.renderShop();
            this.ui.attachPerkTooltips();
            return;
        }

        // Second click confirms purchase
        this.handleBuyPerk(perkId);
    }

    /**
     * Handle purchasing a perk from shop with enhanced animation
     */
    handleBuyPerk(perkId) {
        if (!this.ui || this.ui.currentScreen !== 'shop') return;
        
        try {
            const result = this.gameState.purchasePerk(perkId);
            
            if (result.success) {
                this.ui.showMessage(result.message, 'success');
                this.animatePerkPurchase(perkId);
                this.updateShopDisplays();
                this.selectedShopPerkId = null;
            } else {
                this.ui.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Error purchasing perk:', error);
            this.ui.showMessage('Failed to purchase perk. Please try again.', 'error');
        }
    }

    /**
     * Animate perk purchase with visual effects
     */
    animatePerkPurchase(perkId) {
        const shopGrid = document.getElementById('shop-grid');
        if (!shopGrid) return;
        
        const card = shopGrid.querySelector(`.perk-card[data-perk-id="${perkId}"]`);
        if (card) {
            card.classList.add('perk-purchased-anim');
            this.createPurchaseSparkles(card);
            
            setTimeout(() => {
                shopGrid.innerHTML = this.ui.renderShop();
                this.ui.attachPerkTooltips();
                this.attachTiltEffect();
            }, 500);
        }
    }

    /**
     * Update all shop-related displays after purchase
     */
    updateShopDisplays() {
        // Update stats display
        const stats = document.querySelector('.game-stats');
        if (stats) {
            stats.innerHTML = this.generateStatsHTML();
        }
        
        // Update owned perks topbar
        const topbar = document.querySelector('.topbar-perks');
        if (topbar) {
            topbar.innerHTML = this.ui.renderTopbarPerks();
        }
    }

    /**
     * Generate stats HTML for display updates
     */
    generateStatsHTML() {
        return `
            <div class="stat-item">
                <span class="stat-label">Wave</span>
                <span class="stat-value">${this.gameState.wave}</span>
            </div>
            <div class="stat-item cash-with-tooltip">
                <span class="stat-label">Cash</span>
                <div class="cash-tooltip-wrapper">
                    <span class="stat-value stat-cash">${this.gameState.cash}$</span>
                    <div class="interest-tooltip">
                        <span class="interest-tooltip-text">Interest: ×${this.gameState.interestStacks}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create sparkle effects for purchase animation
     */
    createPurchaseSparkles(element) {
        const rect = element.getBoundingClientRect();
        const colors = ['#fbbf24', '#f59e0b', '#fcd34d', '#fbbf24'];
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'purchase-sparkle';
            sparkle.style.left = `${Math.random() * rect.width}px`;
            sparkle.style.top = `${Math.random() * rect.height}px`;
            sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
            sparkle.style.animationDelay = `${Math.random() * 0.2}s`;
            element.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 600);
        }
    }

    /**
     * Handle rerolling shop perks
     */
    handleRerollShop() {
        if (!this.ui || this.ui.currentScreen !== 'shop') return;
        
        try {
            const cost = this.shopRerollCost;
            if (this.gameState.cash < cost) {
                this.ui.showMessage(`Need ${cost}$ to reroll!`, 'error');
                return;
            }
            
            // Spend cash and reroll
            this.gameState.currency.spendCash(cost);
            this.shopRerollCost += 2; // Increase cost for next time
            
            // Generate new perks
            this.shop.generateShopPerks();
            this.selectedShopPerkId = null;
            
            // Update shop display
            this.refreshShopDisplay();
            this.ui.showMessage('Shop rerolled!', 'success');
            
        } catch (error) {
            console.error('Error rerolling shop:', error);
            this.ui.showMessage('Failed to reroll shop. Please try again.', 'error');
        }
    }

    /**
     * Refresh shop display after reroll or purchase
     */
    refreshShopDisplay() {
        // Re-render shop
        const shopGrid = document.getElementById('shop-grid');
        if (shopGrid) {
            shopGrid.innerHTML = this.ui.renderShop();
            this.ui.attachPerkTooltips();
            this.attachTiltEffect();
        }
        
        // Update cash display
        this.updateCashDisplay();
        
        // Update reroll button
        this.updateRerollButton();
    }

    /**
     * Update cash display in shop
     */
    updateCashDisplay() {
        const stats = document.querySelector('.game-stats');
        if (stats) {
            stats.innerHTML = this.generateStatsHTML();
        }
    }

    /**
     * Update reroll button state
     */
    updateRerollButton() {
        const rerollBtn = document.getElementById('reroll-btn');
        const rerollCost = document.getElementById('reroll-cost');
        if (rerollBtn && rerollCost) {
            rerollBtn.disabled = this.gameState.cash < this.shopRerollCost;
            rerollCost.textContent = `${this.shopRerollCost}$`;
        }
    }

    /**
     * Reset reroll cost when entering new shop
     */
    resetRerollCost() {
        this.shopRerollCost = 5;
    }

    /**
     * Handle continue after wave transition
     */
    handleContinueWave() {
        this.handleStartWave();
    }

    /**
     * Continue from rewards screen to shop, charging next-wave entry cost
     */
    handleContinueFromRewards() {
        this.gameState.pendingNextWave = this.gameState.wave + 1;
        this.ui.renderShopScreen();
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
        this.resetRerollCost();
        this.ui.renderShopScreen();
    }

    /**
     * Attach 3D tilt effect to inventory items, loot items, and perk cards
     */
    attachTiltEffect() {
        const items = document.querySelectorAll('.inventory-item-minimal, .perk-card-shop:not(.perk-purchased):not(.perk-locked)');
        items.forEach(item => {
            item.addEventListener('mousemove', (e) => this.handleTilt(e, item));
            item.addEventListener('mouseleave', () => this.resetTilt(item));
        });
    }

    handleTilt(e, element) {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -15;
        const rotateY = ((x - centerX) / centerX) * 15;
        element.style.transform = `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        element.style.zIndex = '10';
    }

    resetTilt(element) {
        element.style.transform = '';
        element.style.zIndex = '';
    }

    /**
     * Handle buying a consumable from the shop
     */
    handleBuyConsumable(index) {
        if (!this.ui || this.ui.currentScreen !== 'shop') return;
        
        const result = this.shop.purchaseConsumable(index);
        
        if (result.success) {
            this.ui.showMessage(result.message, 'success');
            
            // Update cash display
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
                                <span class="interest-tooltip-text">Interest: ×${this.gameState.interestStacks}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Re-render shop consumables
            const consumablesGrid = document.querySelector('.shop-consumables-grid');
            if (consumablesGrid) {
                consumablesGrid.innerHTML = this.ui.renderShopConsumables();
            }
            
            // Update owned consumables section
            const consumableSection = document.querySelector('.consumable-section');
            if (consumableSection) {
                consumableSection.outerHTML = this.ui.renderConsumablesSection();
            }
        } else {
            this.ui.showMessage(result.message, 'error');
        }
    }

    /**
     * Handle clicking an owned consumable
     */
    handleConsumableClick(index) {
        if (!this.ui) return;
        
        // If already selected, use it (confirm action)
        if (this.selectedConsumableIndex === index) {
            this.handleUseConsumable(index);
            this.selectedConsumableIndex = -1;
        } 
        // Otherwise select it
        else {
            this.selectedConsumableIndex = index;
            // Update UI to show selection
            const consumableSection = document.querySelector('.consumable-section');
            if (consumableSection) {
                consumableSection.outerHTML = this.ui.renderConsumablesSection();
            }
        }
    }

    /**
     * Handle using a consumable item
     */
    handleUseConsumable(index) {
        const result = this.gameState.useConsumable(index);
        if (result.success) {
            this.ui.showMessage(result.message, 'success');
            // Refresh shop screen to show updated consumables
            if (this.ui.currentScreen === 'shop') {
                const shopGrid = document.getElementById('shop-grid');
                if (shopGrid) {
                    shopGrid.innerHTML = this.ui.renderShop();
                    this.ui.attachPerkTooltips();
                    this.attachTiltEffect();
                }
                // Update consumables section
                const consumableSection = document.querySelector('.consumable-section');
                if (consumableSection) {
                    consumableSection.outerHTML = this.ui.renderConsumablesSection();
                }
            }
        } else {
            this.ui.showMessage(result.message, 'error');
        }
        
        // Always reset selection after use attempt
        this.selectedConsumableIndex = -1;
        const consumableSection = document.querySelector('.consumable-section');
        if (consumableSection) {
            consumableSection.outerHTML = this.ui.renderConsumablesSection();
        }
    }

    /**
     * Handle next inventory page
     */
    handleNextInventoryPage() {
        this.gameState.nextInventoryPage();
        this.refreshInventoryDisplay();
    }

    /**
     * Handle previous inventory page
     */
    handlePrevInventoryPage() {
        this.gameState.prevInventoryPage();
        this.refreshInventoryDisplay();
    }

    /**
     * Refresh inventory display after pagination
     */
    refreshInventoryDisplay() {
        const inventoryList = document.getElementById('inventory-list');
        const paginationContainer = document.querySelector('.inventory-pagination');
        const paginated = this.ui.renderPaginatedInventoryList();
        
        if (inventoryList) {
            inventoryList.innerHTML = paginated.html;
        }
        if (paginationContainer) {
            paginationContainer.outerHTML = paginated.pagination || '<div class="inventory-pagination" style="display:none;"></div>';
        }
        this.ui.attachSmartTooltips();
        this.attachTiltEffect();
    }
}

// Create global game instance
var game;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    let seed = Date.now() >>> 0;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        seed = buf[0] >>> 0;
    }
    game = new Game(seed);
    window.game = game;
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
    if (!game.ui || game.ui.currentScreen !== 'game') return;
    // Also prevent rolling during rewards/breakdown screen
    if (game.ui.currentScreen === 'rewards' || game.ui.currentScreen === 'shop' || game.ui.currentScreen === 'boss_reward') return;
    game.handleRoll();
});
