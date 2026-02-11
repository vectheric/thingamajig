
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
        this.timeSystem = new TimeSystem(this.gameState);
        this.worldSystem = new WorldSystem(this.gameState);
        this.inventory = new Inventory(this.gameState);
        this.shop = new Shop(this.gameState);
        this.ui = new UI(this.gameState, this.shop, this.inventory);
        this.gameRunning = false;
        this._rollTimeoutId = null;
        this._animationInProgress = false;
        this.selectedShopPerkId = null;
        this.shopRerollCost = 5; // Starting reroll cost
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
        this.worldSystem.init(); // Initialize world PRNG
        this.particles = new BackgroundParticles();
        this.ui.renderStartScreen();
        
        // Start Time Loop
        this._lastTime = Date.now();
        this._timeLoop = setInterval(() => {
            if (this.gameRunning) {
                const now = Date.now();
                const delta = (now - this._lastTime) / 1000;
                this._lastTime = now;
                
                this.timeSystem.update(delta);
                this.worldSystem.tickEvents();
                this.ui.updateTimeDisplay(); // We need to add this method to UI
            } else {
                this._lastTime = Date.now(); // Keep updating last time so we don't jump when unpaused
            }
        }, 1000); // Check every second (which is 1 game minute)
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
        const seedInput = document.getElementById('seed-input');
        let seedString;
        
        if (seedInput && seedInput.value.trim()) {
            seedString = seedInput.value.trim();
        } else {
            // Generate complex random seed if not provided
            seedString = Math.generateRandomSeed ? Math.generateRandomSeed() : String(Date.now());
        }
        
        const seedHash = Math.seed(seedString);
        
        if (this.gameState.setSeed) {
            this.gameState.setSeed(seedHash, seedString);
        } else {
            this.gameState.resetGame();
        }

        this.gameRunning = true;
        this.handleStartRound();
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
     * Start a new round
     */
    handleStartRound() {
        try {
            const targetRound = this.gameState.pendingNextRound;
            if (targetRound != null) {
                const entryCost = this.gameState.getRoundEntryCost();
                if (this.gameState.chips < entryCost) {
                    this.ui.showMessage('Game Over: Insufficient Chips!', 'error');
                    this.ui.renderBreakdownScreen({
                        type: 'game_over',
                        reason: `You didn't earn enough Ȼ!<br>` +
                                `Needed ${entryCost}Ȼ for round ${targetRound}<br>`
                    });
                    return;
                }
                this.gameState.round = targetRound;
                this.gameState.pendingNextRound = null;
            }
            this.gameState.startRound();
            
            // Only generate new biome at start of a Route (every 5 rounds)
            // Round 1, 6, 11, etc.
            if ((this.gameState.round - 1) % 5 === 0) {
                this.worldSystem.generateBiome(); 
            }
            
            this.gameState.resetLootPage(); // Reset loot pagination when starting new round
            this.ui.renderGameScreen();

            // Check if goal is already met (e.g. via perks or carry-over)
            if (this.gameState.hasReachedRoundGoal()) {
                this.triggerRoundCompletion();
            }
        } catch (error) {
            console.error('Error in handleStartRound:', error);
            if (this.ui) this.ui.showMessage('Error starting round: ' + error.message, 'error');
        }
    }

    /**
     * Trigger round completion sequence with countdown
     */
    triggerRoundCompletion() {
        // Prevent multiple countdowns
        if (document.getElementById('goal-countdown-notification')) return;

        const rollBtn = document.querySelector('.roll-button');
        if (rollBtn) rollBtn.disabled = true;

        // Create countdown notification
        let secondsLeft = 2;
        
        // Use existing notification container
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }
        
        const notif = document.createElement('div');
        notif.id = 'goal-countdown-notification';
        notif.className = 'notification notification-success';
        
        container.appendChild(notif);

        const updateMessage = () => {
            const textSpan = notif.querySelector('.goal-text');
            if (textSpan) {
                textSpan.textContent = `Finished the goal return to the reward screen in ${secondsLeft}s`;
            }
        };
        
        notif.innerHTML = `<span class="goal-text">Finished the goal return to the reward screen in ${secondsLeft}s</span><div class="notification-progress" style="animation-duration: 2000ms"></div>`;

        const intervalId = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                clearInterval(intervalId);
                if (notif && notif.parentNode) notif.remove();
                if (this.gameRunning) this.handleEndRound();
            } else {
                updateMessage();
            }
        }, 1000);
    }

    /**
     * Handle rolling action with animation support
     * 
     * Features:
     * - Animated dice rolling with visual feedback
     * - Space key spamming skips animation for faster gameplay
     * - Automatic round completion when chip goal is met
     * - Rare item celebration effects for epic/legendary items
     * 
     * @returns {void}
     */
    handleRoll() {
        if (!this.gameRunning) return;
        if (!this.ui || this.ui.currentScreen !== 'game') return;
        
        // Fix: Cooldown to prevent freeze when spamming Space
        if (this._nextRollTime && Date.now() < this._nextRollTime) return;
        
        // Lock if goal reached
        if (this.gameState.hasReachedRoundGoal()) {
            return;
        }

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
            lastRolledDiv.innerHTML = `
                <div class="roll-animation-in-progress" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                    <div class="roll-dice" style="font-size: 2rem;">🎲</div>
                    <div class="roll-text" style="font-size: 0.9rem; opacity: 0.8;">Rolling...</div>
                    <div class="roll-iterating-name" style="margin-top: 4px; font-size: 1.2rem; font-weight: 700; min-height: 1.4em;"></div>
                </div>
            `;
            lastRolledDiv.classList.add('is-rolling');

            // Start iterating item names
            const nameEl = lastRolledDiv.querySelector('.roll-iterating-name');
            
            this._rollIntervalId = setInterval(() => {
                if (nameEl) {
                    try {
                        // Pick a random item from ITEMS for visual flair without consuming RNG
                        let tempThing = { name: '...', rarity: 'common' };
                        if (typeof ITEMS !== 'undefined') {
                            const keys = Object.keys(ITEMS);
                            if (keys.length > 0) {
                                const k = keys[Math.floor(Math.random() * keys.length)];
                                tempThing = ITEMS[k];
                            }
                        }
                        
                        nameEl.textContent = tempThing.name;
                        
                        // Apply color based on rarity
                        let color = '#9ca3af';
                        if (typeof TIER_NAME_STYLES !== 'undefined' && TIER_NAME_STYLES[tempThing.tier]) {
                            color = TIER_NAME_STYLES[tempThing.tier].color;
                        }
                        
                        nameEl.style.color = color;
                        nameEl.style.textShadow = `0 0 10px ${color}60`; // Add glow
                        
                    } catch (e) {
                        nameEl.textContent = '...';
                        nameEl.style.color = '#ffffff';
                    }
                }
            }, 60);
        }

        const applyRollResult = () => {
            if (this._rollTimeoutId) {
                clearTimeout(this._rollTimeoutId);
                this._rollTimeoutId = null;
            }
            if (this._rollIntervalId) {
                clearInterval(this._rollIntervalId);
                this._rollIntervalId = null;
            }
            
            const thing = this.gameState.rollThing();
            if (lastRolledDiv) lastRolledDiv.classList.remove('is-rolling');

            if (thing === null) {
                if (lastRolledDiv) lastRolledDiv.innerHTML = '<span class="last-roll-placeholder">—</span>';
                if (rollBtn) rollBtn.disabled = false;
                this.ui.showMessage('No rolls remaining', 'error');
                return;
            }

            let goalReached = false;
            try {
                this.gameState.addStat('totalItemsRolled', 1);
                const streak = this.gameState.updateRareStreak(thing.tier);
                const streakMessage = this.gameState.getRareStreakMessage();
                if (thing.tier === 'epic' || thing.tier === 'legendary') {
                    this.celebrateRareItem(thing);
                }
                if (streakMessage) this.ui.showMessage(streakMessage, 'epic');
                const allMods = typeof getAllModifications === 'function' ? getAllModifications(thing) : [];
                const modBadges = allMods.length > 0
                    ? allMods.map(m => typeof getModBadgeHtml === 'function' ? getModBadgeHtml(m) : `<span class="mod-badge" title="${m.description || ''}">${m.name}</span>`).join('')
                    : '';
                const nameStyle = typeof getItemNameStyle === 'function' ? getItemNameStyle(thing) : {};
                const nameCss = typeof nameStyleToCss === 'function' ? nameStyleToCss(nameStyle) : '';
                let safeName;
                if (typeof getModifiedItemNameHtml === 'function') {
                    safeName = getModifiedItemNameHtml(thing);
                } else {
                    const displayName = typeof getModifiedItemName === 'function' ? getModifiedItemName(thing) : thing.name;
                    safeName = typeof escapeHtml === 'function' ? escapeHtml(displayName) : displayName;
                }
                const nameHtml = `<span class="rolled-thing-name"${nameCss}>${safeName}</span>`;
                const wrapClass = thing.tier === 'legendary' ? 'rolled-thing-name-wrap legendary-particle-wrap' : 'rolled-thing-name-wrap';
                if (lastRolledDiv) {
                    lastRolledDiv.innerHTML = `
                        <div class="rolled-thing rolled-thing-holder rarity-${thing.tier} ${thing.tier === 'epic' || thing.tier === 'legendary' ? 'rare-celebration' : ''}">
                            <div class="${wrapClass}">${nameHtml}</div>
                            <div class="rolled-thing-rarity">${(thing.tier || 'common').toString().toUpperCase()} </div>
                            ${modBadges ? `<div class="rolled-thing-mods">${modBadges}</div>` : ''}
                            <div class="rolled-thing-value"><span style="color: #60a5fa">${thing.value}Ȼ</span></div>
                            <div class="rolled-thing-rarity"><span style="color: #fafafaff; font-size: 12px;">1/${thing.rarityScore || '?'} </div>

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
                const paginationContainer = document.querySelector('.loot-pagination');
                if (paginationContainer) {
                    const paginated = this.ui.renderPaginatedLootList();
                    paginationContainer.outerHTML = paginated.pagination || '<div class="loot-pagination" style="display:none;"></div>';
                }
                const inventory = new Inventory(this.gameState);
                const invDisplay = inventory.getDisplay();
                const totalValue = document.querySelector('.total-value');
                if (totalValue) totalValue.textContent = `${invDisplay.totalValue}Ȼ`;
                goalReached = this.gameState.hasReachedRoundGoal();
                if ((this.gameState.getRemainingRolls() <= 0 || goalReached) && rollBtn) {
                    rollBtn.disabled = true;
                } else if (rollBtn) {
                    rollBtn.disabled = false;
                }
                this.ui.showMessage(`Rolled [${thing.name}]`, 'success');
            } catch (e) {
                console.error('Error in roll result:', e);
                if (lastRolledDiv) lastRolledDiv.innerHTML = `<div class="rolled-thing"><div class="rolled-thing-name-wrap"><span class="rolled-thing-name">${(thing && thing.name) || 'Item'}</span></div></div>`;
                const rollsDiv = document.querySelector('.rolls-remaining');
                if (rollsDiv) rollsDiv.textContent = `Rolls: ${this.gameState.getRemainingRolls()}`;
                if (rollBtn) rollBtn.disabled = this.gameState.getRemainingRolls() <= 0;
                this.ui.showMessage('Rolled an extremely rare item', 'success');
            }

            // If player already has enough chips for next round, end the round immediately
            // so remaining rolls can convert to cash and the shop opens automatically.
            if (goalReached) {
                this.triggerRoundCompletion();
                return;
            }

            if (this.gameState.getRemainingRolls() <= 0) {
                setTimeout(() => {
                    if (this.gameRunning) this.handleEndRound();
                }, 200);
            }
            
            // Set cooldown for next roll
            this._nextRollTime = Date.now() + 100;
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
        
        if (this._rollIntervalId) {
            clearInterval(this._rollIntervalId);
            this._rollIntervalId = null;
        }

        const fn = this._rollResolve;
        this._rollResolve = null;
        fn();
    }

    /**
     * Celebrate rare item roll with visual effects
     * Creates dopamine reward for epic/legendary items
     */
    celebrateRareItem(thing) {
        const rarity = thing.tier;

        // Spawn Message Logic (Legendary+)
        // Overrides the event header temporarily
        const headerEventText = document.querySelector('.header-event-text');
        if (headerEventText && ( rarity === 'exquisite' || rarity === 'exotic'  || rarity === 'zenith' || rarity === 'unfathomable' || rarity === 'otherworldly' || rarity === 'transcendent' || rarity === 'enigmatic')) {
            const originalText = headerEventText.textContent;
            const originalStyle = headerEventText.getAttribute('style');
            
            // Set spawn message
            headerEventText.textContent = `Spawned ${thing.name}!`;
            
            // Italic and specific color
            let color = '#ffd700'; 
            if (thing.color) color = thing.color;
            
            headerEventText.style.fontStyle = 'italic';
            headerEventText.style.color = color;
            // Clear text stroke if any from previous event
            headerEventText.style.webkitTextStroke = '0';
            
            // Restart animation (12s, dynamic steps + 10)
            headerEventText.style.animation = 'none';
            headerEventText.offsetHeight; /* trigger reflow */
            const steps = headerEventText.textContent.length + 100000;
            headerEventText.style.animation = `type-writer 12s steps(${steps}) 1 normal both`;

            // Revert after 12 seconds
            setTimeout(() => {
                // Only revert if it hasn't been changed by another event/spawn
                if (headerEventText.textContent.includes(thing.name)) {
                    headerEventText.textContent = originalText;
                    if (originalStyle) {
                        headerEventText.setAttribute('style', originalStyle);
                    } else {
                        headerEventText.removeAttribute('style');
                    }
                }
            }, 12000);
        }

        let message = '';
        let emoji = '';
        
        if (rarity === 'ultimate') {
        message = `🌌 ULTIMATE ${thing.name} 🌌`;
        emoji = '🌌';
    } else if (rarity === 'godlike') {
        message = `⚡ GODLIKE ${thing.name} ⚡`;
        emoji = '⚡';
    } else if (rarity === 'legendary') {
            message = `🌟 LEGENDARY ${thing.name} 🌟`;
            emoji = '✨';
        } else if (rarity === 'epic') {
            message = `⭐ EPIC ${thing.name}`;
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
     * Handle end of round - sell inventory, earn rewards, advance
     */
    handleEndRound() {
        const rollsRemaining = this.gameState.getRemainingRolls();
        const rollsToCash = Math.max(0, rollsRemaining);

        // Convert remaining rolls to cash before selling/finishing round.
        if (rollsToCash > 0) this.gameState.currency.addCash(rollsToCash);

        const earnedChips = this.gameState.inventory.length === 0 ? 0 : this.gameState.sellInventory();
        if (this.gameState.inventory.length === 0) {
            this.ui.showMessage('No items to sell.', 'info');
        } else {
            this.ui.showMessage(`Sold items for ${earnedChips}Ȼ`, 'sold');
        }

        setTimeout(() => {
            try {
                // Complete the round and earn cash rewards + interest
                const rewards = this.gameState.completeRound();
                
                // Check if can afford next round
                const nextRound = this.gameState.round + 1;

                const cost = this.gameState.getRoundEntryCost();
                const canAdvance = this.gameState.chips >= cost;

                const nextCost = cost;
                const isBossNext = typeof isBossRound === 'function' && isBossRound(nextRound);

                // If player cannot advance, it's game over.
                const type = canAdvance ? 'round_complete' : 'game_over';
                const reason = canAdvance ? '' : 
                    `You didn't earn enough Ȼ!<br>` +
                    `Needed ${nextCost}Ȼ for round ${this.gameState.round + 1}<br>` +
                    `Had ${this.gameState.chips}Ȼ (earned ${earnedChips}Ȼ this round)`;

                this.ui.renderBreakdownScreen({
                    type,
                    reason,
                    round: this.gameState.round,
                    chipsEarned: earnedChips,
                    rollsRemaining,
                    rollsToCash,
                    baseReward: rewards.baseReward,
                    interestReward: rewards.interestReward,
                    cashBonus: rewards.cashBonus,
                    chipsBonus: rewards.chipsBonus, // Pass chips bonus
                    totalReward: rewards.totalReward + rollsToCash,
                    totalCash: this.gameState.cash,
                    canAdvance,
                    nextCost,
                    isBossNext
                });
            } catch (error) {
                console.error('Error in handleEndRound timeout:', error);
                if (this.ui && this.ui.showMessage) {
                    this.ui.showMessage('Error ending round: ' + error.message, 'error');
                }
                // Attempt to show error screen if UI is available
                if (this.ui && this.ui.container) {
                    this.ui.container.innerHTML = `
                        <div class="screen error-screen">
                            <h2>Game Error</h2>
                            <p>${error.message}</p>
                            <button class="btn btn-primary" onclick="location.reload()">Reload Game</button>
                        </div>
                    `;
                }
            }
        }, 1200);
    }

    /** Shop: click once to select, click twice to purchase */
    handleShopPerkClick(perkId, instanceId) {
        if (!perkId) return;
        if (!this.ui || this.ui.currentScreen !== 'shop') return;

        const targetId = instanceId || perkId;

        if (this.selectedShopPerkId !== targetId) {
            this.selectedShopPerkId = targetId;
            const grid = document.getElementById('shop-grid');
            if (grid) grid.innerHTML = this.ui.renderShop();
            this.ui.attachPerkTooltips();
            return;
        }

        // Second click confirms purchase
        this.handleBuyPerk(perkId, instanceId);
    }

    /**
     * Handle purchasing a perk from shop with enhanced animation
     */
    handleBuyPerk(perkId, instanceId) {
        if (!this.ui || this.ui.currentScreen !== 'shop') return;
        
        try {
            // Check if it's a subperk before purchase to handle animation correctly
            const shopGrid = document.getElementById('shop-grid');
            let selector = `.perk-card[data-perk-id="${perkId}"]`;
            if (instanceId) {
                selector = `.perk-card[data-perk-instance-id="${instanceId}"]`;
            }
            const card = shopGrid ? shopGrid.querySelector(selector) : null;
            const isSubperk = card && (card.querySelector('.rarity-special') || card.querySelector('.rarity-subperk') || perkId === 'virus');

            // Use shop.purchasePerk to ensure it gets removed from the shop list if it's a subperk
            const result = this.shop.purchasePerk(perkId, instanceId);
            
            if (result.success) {
                this.ui.showMessage(result.message, 'success');
                
                if (isSubperk) {
                    this.animateSubperkPurchase(perkId, instanceId);
                } else {
                    this.animatePerkPurchase(perkId);
                }
                
                this.updateShopDisplays();
                this.selectedShopPerkId = null;
            } else {
                this.ui.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Error purchasing perk:', error);
            this.ui.showMessage('Failed to purchase perk. Please try again', 'error');
        }
    }

    createSubperkParticles(card) {
        const rect = card.getBoundingClientRect();
        const count = 10;
        
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.classList.add('subperk-particle');
            
            // Random start position within card
            const x = Math.random() * rect.width;
            const y = Math.random() * rect.height;
            
            p.style.left = `${rect.left + x}px`;
            p.style.top = `${rect.top + y}px`;
            
            // Random direction (float up and spread)
            const tx = (Math.random() - 0.5) * 100; // Spread X
            const ty = -Math.random() * 80 - 40; // Float up
            
            p.style.setProperty('--tx', `${tx}px`);
            p.style.setProperty('--ty', `${ty}px`);
            
            document.body.appendChild(p);
            
            // Cleanup
            setTimeout(() => {
                if (p.parentNode) p.parentNode.removeChild(p);
            }, 2000);
        }
    }

    animateSubperkPurchase(perkId, instanceId) {
        const shopGrid = document.getElementById('shop-grid');
        if (!shopGrid) return;
        
        let selector = `.perk-card[data-perk-id="${perkId}"]`;
        if (instanceId) {
            selector = `.perk-card[data-perk-instance-id="${instanceId}"]`;
        }
        const card = shopGrid.querySelector(selector);
        if (card) {
            // Add disappearing animation
            card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.transform = 'scale(0) rotate(10deg)';
            card.style.opacity = '0';
            
9            // Create particles
            this.createSquareBurst(card, 25);
            

            // Remove after animation
            setTimeout(() => {
                // Re-render shop to reflect removal from array
                shopGrid.innerHTML = this.ui.renderShop();
                this.ui.attachPerkTooltips();
                this.attachTiltEffect();
            }, 500);
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
            // Enhanced Animation: Expand then Fade
            // 1. Remove tilt effect to prevent interference
            card.style.transform = 'none';
            card.classList.remove('tilt-effect');
            
            // 2. Initial state setup for smooth transition
            card.style.transition = 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)';
            card.style.zIndex = '100'; // Bring to front
            card.style.position = 'relative'; // Ensure z-index works

            // 3. Trigger expansion
            requestAnimationFrame(() => {
                const rarity = card.dataset.perkRarity || 'common';
                
                card.style.transform = 'scale(1.2)'; // Expand
                // Glow color based on rarity would be nice here too, but gold is fine for "purchase" event
                card.style.boxShadow = '0 0 30px rgba(251, 191, 36, 0.6)'; // Gold glow
                card.style.borderRadius = '16px'; // More rounded
                
                // 4. Fade out after expansion starts
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(1.4)'; // Continue expanding while fading
                }, 200);
            });

            this.createSquareBurst(card);
            
            setTimeout(() => {
                shopGrid.innerHTML = this.ui.renderShop();
                this.ui.attachPerkTooltips();
                this.attachTiltEffect();
            }, 600); // Increased delay slightly to allow animation to finish
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

    handleOpenForging() {
        if (!this.ui) return;
        this.ui.renderForgingScreen();
    }

    handleReturnToShop() {
        if (!this.ui) return;
        this.ui.renderShopScreen();
    }

    handleForgeSelect(perkId) {
        if (!this.ui || this.ui.currentScreen !== 'forging') return;
        this.ui.renderForgingScreen(perkId);
    }

    handleForgePerk(perkId) {
        if (!this.ui) return;
        if (!perkId) return;
        try {
            const result = this.gameState.forgePerk(perkId);
            if (result.success) {
                this.ui.showMessage(result.message, 'success');
                const stats = document.querySelector('.game-stats');
                if (stats) {
                    stats.innerHTML = this.generateStatsHTML();
                }
                const topbar = document.querySelector('.topbar-perks');
                if (topbar) {
                    topbar.innerHTML = this.ui.renderTopbarPerks();
                }
                this.ui.renderForgingScreen();
            } else {
                this.ui.showMessage(result.message, 'error');
                this.ui.renderForgingScreen();
            }
        } catch (error) {
            console.error('Error forging perk:', error);
            this.ui.showMessage('Failed to forge perk. Please try again', 'error');
        }
    }

    /**
     * Generate stats HTML for display updates
     */
    generateStatsHTML() {
        return `
            <div class="stat-item">
                <span class="stat-label">Round</span>
                <span class="stat-value">${this.gameState.round}</span>
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
    createSquareBurst(element, particleCount = 20) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Get rarity color
        const rarity = element.dataset.perkRarity ? element.dataset.perkRarity.toLowerCase() : 'common';
        const colors = {
            'common': '#71717a',
            'uncommon': '#22c55e',
            'rare': '#3b82f6',
            'epic': '#a78bfa',
            'legendary': '#f59e0b',
            'mythical': '#d946ef',
            'godlike': '#ef4444',
            'special': '#fbbf24',
            'subperk': '#210041ff' // Treat subperk as special/gold
        };
        const color = colors[rarity] || colors['common'];

        // 1. Circle Pulse
        const circle = document.createElement('div');
        circle.className = 'purchase-particle-circle';
        circle.style.left = `${centerX}px`;
        circle.style.top = `${centerY}px`;
        circle.style.borderColor = color;
        circle.style.boxShadow = `0 0 15px ${color}`;
        document.body.appendChild(circle);
        setTimeout(() => circle.remove(), 600);

        // 2. Square Spread
        for (let i = 0; i < particleCount; i++) {
            const square = document.createElement('div');
            square.className = 'purchase-particle-square';
            square.style.left = `${centerX}px`;
            square.style.top = `${centerY}px`;
            square.style.background = color; // Filled square
            square.style.border = `1px solid ${color}`;
            square.style.boxShadow = `0 0 5px ${color}`;
            
            // Random direction and distance
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 100;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            // Random rotation
            const rotStart = Math.random() * 360;
            const rotEnd = rotStart + (Math.random() * 180 - 90); // Spin between -90 and +90 degrees relative to start

            square.style.setProperty('--tx', `${tx}px`);
            square.style.setProperty('--ty', `${ty}px`);
            square.style.setProperty('--rot-start', `${rotStart}deg`);
            square.style.setProperty('--rot-end', `${rotEnd}deg`);
            square.style.animation = `square-spread 0.6s ease-out forwards`;
            
            // Random delay for a bit of variation
            square.style.animationDelay = `${Math.random() * 0.1}s`;
            
            document.body.appendChild(square);
            setTimeout(() => square.remove(), 700);
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
                this.ui.showMessage(`Need ${cost}$ to reroll`, 'error');
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
            
            // Trigger text rolling for subperks
            this.ui.startTextRollingAnimation();
            
            this.ui.showMessage('Shop rerolled', 'success');
            
        } catch (error) {
            console.error('Error rerolling shop:', error);
            this.ui.showMessage('Failed to reroll shop. Please try again', 'error');
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
            rerollCost.textContent = this.shopRerollCost;
        } else if (rerollBtn) {
            rerollBtn.disabled = this.gameState.cash < this.shopRerollCost;
            rerollBtn.innerHTML = `Reroll (<span id="reroll-cost">${this.shopRerollCost}</span>$)`;
        }
    }

    /**
     * Reset reroll cost when entering new shop
     */
    resetRerollCost() {
        if (this.gameState && this.gameState.perksPurchased && this.gameState.perksPurchased['vip_card']) {
            this.shopRerollCost = 0;
        } else {
            this.shopRerollCost = 5;
        }
    }

    /**
     * Handle continue after round transition
     */
    handleContinueRound() {
        this.handleStartRound();
    }

    /**
     * Continue from rewards screen to shop, charging next-round entry cost
     */
    handleContinueFromRewards() {
        try {
            this.gameState.pendingNextRound = this.gameState.round + 1;
            this.resetRerollCost();
            this.shop.generateShopPerks();
            this.ui.renderShopScreen();
            // Trigger text rolling for subperks
            this.ui.startTextRollingAnimation();
        } catch (error) {
            console.error('Error in handleContinueFromRewards:', error);
            if (this.ui) this.ui.showMessage('Error continuing: ' + error.message, 'error');
        }
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
            this.ui.showMessage('Perk acquired', 'success');
            this.ui.updateBossRewardScreen();
        }
    }

    /** Boss reward: confirm after picking 3 perks */
    handleConfirmBossReward() {
        if (this.gameState.getBossPerksPickedCount() < CONFIG.BOSS_PERK_PICK_COUNT) {
            this.ui.showMessage(`Pick ${CONFIG.BOSS_PERK_PICK_COUNT} perks first`, 'error');
            return;
        }
        this.gameState.confirmBossReward();
        this.resetRerollCost();
        this.shop.generateShopPerks();
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
    
    // Check for 'Ancient Tablet' perk for space skip
    const canSkip = game.gameState && game.gameState.perksPurchased && game.gameState.perksPurchased['ancient_tablet'];

    // Spam Space to skip roll animation
    if (game._rollTimeoutId) {
        if (canSkip) {
            game.skipRollAnimation();
        }
        return;
    }
    if (!game.gameRunning) return;
    if (!game.ui || game.ui.currentScreen !== 'game') return;
    // Also prevent rolling during rewards/breakdown screen
    if (game.ui.currentScreen === 'rewards' || game.ui.currentScreen === 'shop' || game.ui.currentScreen === 'boss_reward') return;
    game.handleRoll();
});
