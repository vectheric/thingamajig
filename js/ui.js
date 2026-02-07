/**
 * UI Renderer
 * Handles all screen rendering and DOM updates
 */
function escapeAttr(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

class UI {
    constructor(gameState, containerSelector = '#game-ui') {
        this.gameState = gameState;
        this.container = document.querySelector(containerSelector);
        this.inventory = new Inventory(gameState);
        this.shop = new Shop(gameState);
        this.messageQueue = [];
        this.currentScreen = null;
    }

    /**
     * Render the main game screen
     */
    renderGameScreen() {
        this.currentScreen = 'game';
        const invDisplay = this.inventory.getDisplay();
        
        let html = `
            <div class="perk-topbar">
                <div class="topbar-title">Perks Owned:</div>
                <div class="topbar-perks" id="topbar-perks">
                    ${this.renderTopbarPerks()}
                </div>
                <button class="stats-button" onclick="game.toggleStats()">📊 Stats</button>
                <button class="index-button" onclick="game.toggleIndex()">📖 Index</button>
            </div>

            <div id="stats-modal" class="stats-modal" style="display: none;">
                <div class="stats-content">
                    <button class="stats-close" onclick="game.toggleStats()">✕</button>
                    <div class="stats-title">Your Stats & Attributes</div>
                    ${this.renderAttributes()}
                </div>
            </div>
            <div id="index-modal" class="index-modal" style="display: none;">
                <div class="index-content">
                    <button class="index-close" onclick="game.toggleIndex()">✕</button>
                    <div class="index-title">📖 Knowledge Index</div>
                    ${this.renderIndex()}
                </div>
            </div>

            <div class="game-header">
                <div class="game-title">Thingamajig <span class="route-badge">Route ${this.gameState.getRouteIndex() + 1}</span></div>
                <div class="game-stats">
                    <div class="stat-item">
                        <span class="stat-label">Wave</span>
                        <span class="stat-value">${this.gameState.wave}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">${typeof isBossWave === 'function' && isBossWave(this.gameState.wave + 1) ? 'Boss (chips)' : 'Need (chips)'}</span>
                        <span class="stat-value stat-chips">${this.gameState.getWaveEntryCost()} 💰</span>
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
                </div>
            </div>

            <div class="game-content">
                <div class="section roll-section">
                    <div class="section-title">Rolling</div>
                    <button class="roll-button" onclick="game.handleRoll()" ${this.gameState.getRemainingRolls() <= 0 ? 'disabled' : ''}>
                        ROLL (SPACE)
                    </button>
                    <div class="rolls-remaining">
                        Rolls: ${this.gameState.getRemainingRolls()}
                    </div>
                    <div class="last-roll-holder">
                        <div class="last-roll-label">Last roll</div>
                        <div id="last-rolled" class="last-item-box" aria-live="polite"><span class="last-roll-placeholder">—</span></div>
                    </div>
                </div>

                <div class="section inventory-section">
                    <div class="section-title">Inventory</div>
                    <div class="inventory-list" id="inventory-list">
                        ${this.renderInventoryList(invDisplay)}
                    </div>
                    <div class="inventory-total">
                        <span>Total Value:</span>
                        <span class="total-value">${invDisplay.totalValue} 💰</span>
                    </div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn btn-primary" onclick="game.handleEndWave()">
                    ${typeof isBossWave === 'function' && isBossWave(this.gameState.wave + 1) ? 'Defeat Boss' : 'Complete Wave & Sell'} (${this.gameState.getWaveEntryCost()} chips)
                </button>
                <button class="btn btn-danger" onclick="game.handleRestart()">
                    Give Up & Restart
                </button>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachSmartTooltips();
        this.attachInterestTooltip();
        this.attachPerkTooltips();
        this.attachInventoryDrag();
        this.attachTopbarPerkDrag();
        this.attachIndexTabs();
    }

    /**
     * Floating tooltip: position smartly so it stays on screen
     */
    getOrCreateFloatingTooltip() {
        let el = document.getElementById('floating-item-tooltip');
        if (!el) {
            el = document.createElement('div');
            el.id = 'floating-item-tooltip';
            el.className = 'floating-tooltip';
            el.setAttribute('role', 'tooltip');
            document.body.appendChild(el);
        }
        return el;
    }

    positionFloatingTooltip(tooltipEl, anchorRect, padding = 12) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const tw = tooltipEl.offsetWidth;
        const th = tooltipEl.offsetHeight;
        const preferTop = anchorRect.bottom + th + padding > vh && anchorRect.top > th + padding;
        const preferLeft = anchorRect.right + tw + padding > vw && anchorRect.left > tw + padding;
        let x = anchorRect.left + (anchorRect.width / 2) - (tw / 2);
        let y = preferTop ? anchorRect.top - th - padding : anchorRect.bottom + padding;
        if (x < padding) x = padding;
        if (x + tw > vw - padding) x = vw - tw - padding;
        if (y < padding) y = padding;
        if (y + th > vh - padding) y = vh - th - padding;
        tooltipEl.style.left = `${x}px`;
        tooltipEl.style.top = `${y}px`;
    }

    attachSmartTooltips() {
        const list = document.getElementById('inventory-list');
        if (!list) return;
        const tooltipEl = this.getOrCreateFloatingTooltip();
        list.addEventListener('mouseenter', (e) => {
            const card = e.target.closest('.inventory-item-hover');
            if (!card) return;
            const inner = card.querySelector('.inventory-item-tooltip');
            if (!inner) return;
            tooltipEl.innerHTML = inner.innerHTML;
            tooltipEl.classList.add('visible');
            this.positionFloatingTooltip(tooltipEl, card.getBoundingClientRect());
        }, true);
        list.addEventListener('mousemove', (e) => {
            const card = e.target.closest('.inventory-item-hover');
            if (!card || !tooltipEl.classList.contains('visible')) return;
            this.positionFloatingTooltip(tooltipEl, card.getBoundingClientRect());
        }, true);
        list.addEventListener('mouseleave', (e) => {
            if (!e.relatedTarget || !e.relatedTarget.closest('#floating-item-tooltip')) {
                tooltipEl.classList.remove('visible');
            }
        }, true);
        tooltipEl.addEventListener('mouseleave', () => tooltipEl.classList.remove('visible'));
    }

    attachPerkTooltips() {
        let perkTooltip = document.getElementById('floating-perk-tooltip');
        if (!perkTooltip) {
            perkTooltip = document.createElement('div');
            perkTooltip.id = 'floating-perk-tooltip';
            perkTooltip.className = 'floating-tooltip perk-tooltip';
            document.body.appendChild(perkTooltip);
        }
        this.container.addEventListener('mouseenter', (e) => {
            const anchor = e.target.closest('.perk-tooltip-anchor');
            if (!anchor) return;
            const name = anchor.getAttribute('data-perk-name') || '';
            const rarity = anchor.getAttribute('data-perk-rarity') || '';
            const desc = anchor.getAttribute('data-perk-desc') || '';
            const special = anchor.getAttribute('data-perk-special') || '';
            const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s || '') : (s || ''));
            perkTooltip.innerHTML = `<span class="pt-name">${esc(name)}</span><span class="pt-rarity">${esc(rarity.toUpperCase())}</span><span class="pt-desc">${esc(desc)}</span>${special ? `<span class="pt-special">✨ ${esc(special)}</span>` : ''}`;
            perkTooltip.classList.add('visible');
            requestAnimationFrame(() => this.positionFloatingTooltip(perkTooltip, anchor.getBoundingClientRect()));
        }, true);
        this.container.addEventListener('mousemove', (e) => {
            const anchor = e.target.closest('.perk-tooltip-anchor');
            if (anchor && perkTooltip.classList.contains('visible')) this.positionFloatingTooltip(perkTooltip, anchor.getBoundingClientRect());
        }, true);
        this.container.addEventListener('mouseleave', (e) => {
            if (!e.relatedTarget || !e.relatedTarget.closest('#floating-perk-tooltip')) perkTooltip.classList.remove('visible');
        }, true);
        perkTooltip.addEventListener('mouseleave', () => perkTooltip.classList.remove('visible'));
    }

    attachInventoryDrag() {
        const list = document.getElementById('inventory-list');
        if (!list) return;
        list.addEventListener('dragstart', (e) => {
            const item = e.target.closest('[data-item-index]');
            if (!item) return;
            e.dataTransfer.setData('text/plain', item.getAttribute('data-item-index'));
            e.dataTransfer.effectAllowed = 'move';
            item.classList.add('dragging');
        });
        list.addEventListener('dragend', (e) => {
            e.target.closest('[data-item-index]')?.classList.remove('dragging');
        });
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const over = e.target.closest('[data-item-index]');
            if (over) over.classList.add('drag-over');
        });
        list.addEventListener('dragleave', (e) => {
            e.target.closest('[data-item-index]')?.classList.remove('drag-over');
        });
        list.addEventListener('drop', (e) => {
            e.preventDefault();
            list.querySelectorAll('[data-item-index]').forEach(el => el.classList.remove('drag-over'));
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const toEl = e.target.closest('[data-item-index]');
            if (toEl == null || isNaN(fromIdx)) return;
            const toIdx = parseInt(toEl.getAttribute('data-item-index'), 10);
            if (fromIdx === toIdx) return;
            if (typeof game !== 'undefined' && game.gameState.reorderInventory) game.gameState.reorderInventory(fromIdx, toIdx);
            const inv = new Inventory(game.gameState);
            list.innerHTML = game.ui.renderInventoryList(inv.getDisplay());
            game.ui.attachSmartTooltips();
            game.ui.attachInventoryDrag();
        });
    }

    attachTopbarPerkDrag() {
        const topbar = document.getElementById('topbar-perks');
        if (!topbar) return;
        topbar.addEventListener('dragstart', (e) => {
            const badge = e.target.closest('.topbar-perk-badge');
            if (!badge) return;
            e.dataTransfer.setData('text/plain', badge.getAttribute('data-perk-id'));
            e.dataTransfer.effectAllowed = 'move';
        });
        topbar.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        topbar.addEventListener('drop', (e) => {
            e.preventDefault();
            const perkId = e.dataTransfer.getData('text/plain');
            if (!perkId || !game.gameState.perkOrder) return;
            const order = game.gameState.perkOrder;
            const idx = order.indexOf(perkId);
            if (idx === -1) return;
            const target = e.target.closest('.topbar-perk-badge');
            if (!target) return;
            const targetId = target.getAttribute('data-perk-id');
            const toIdx = order.indexOf(targetId);
            if (toIdx === -1 || idx === toIdx) return;
            order.splice(toIdx, 0, order.splice(idx, 1)[0]);
            topbar.innerHTML = game.ui.renderTopbarPerks();
            game.ui.attachPerkTooltips();
            game.ui.attachTopbarPerkDrag();
        });
    }

    attachInterestTooltip() {
        const wrapper = this.container.querySelector('.cash-tooltip-wrapper');
        if (!wrapper) return;
        const pop = this.container.querySelector('.interest-tooltip');
        if (!pop) return;
        wrapper.addEventListener('mouseenter', () => {
            pop.classList.add('visible');
            requestAnimationFrame(() => {
                const rect = wrapper.getBoundingClientRect();
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const pw = pop.offsetWidth || 180;
                const ph = pop.offsetHeight || 40;
                let x = rect.left + (rect.width / 2) - (pw / 2);
                let y = rect.top - ph - 8;
                if (x < 12) x = 12;
                if (x + pw > vw - 12) x = vw - pw - 12;
                if (y < 12) y = rect.bottom + 8;
                pop.style.left = `${x}px`;
                pop.style.top = `${y}px`;
            });
        });
        wrapper.addEventListener('mouseleave', () => pop.classList.remove('visible'));
    }

    /**
     * Render perks in topbar (with tooltip data; hold to see desc/special/rarity)
     */
    renderTopbarPerks() {
        const ownedPerks = this.shop.getOwnedPerks();
        if (ownedPerks.length === 0) {
            return '<span class="no-perks">None yet</span>';
        }
        return ownedPerks.map((perk) => {
            const full = typeof getBossPerkById === 'function' ? getBossPerkById(perk.id) : null;
            const p = full || (PERKS[Object.keys(PERKS).find(k => PERKS[k].id === perk.id)]);
            const desc = (p && p.description) || '';
            const special = (p && p.special) ? p.special.replace(/_/g, ' ') : '';
            const rarity = (p && p.rarity) || 'common';
            const nameStyle = typeof getPerkNameStyle === 'function' ? getPerkNameStyle(p) : {};
            const nameCss = typeof nameStyleToCss === 'function' ? nameStyleToCss(nameStyle) : '';
            const safeName = typeof escapeHtml === 'function' ? escapeHtml(perk.name) : perk.name;
            return `<span class="topbar-perk-badge perk-tooltip-anchor" draggable="true" data-perk-id="${perk.id}" data-perk-name="${escapeAttr(perk.name)}" data-perk-rarity="${escapeAttr(rarity)}" data-perk-desc="${escapeAttr(desc)}" data-perk-special="${escapeAttr(special)}"><span class="topbar-perk-name"${nameCss}>${safeName}</span></span>`;
        }).join('');
    }

    /**
     * Render inventory list items
     */
    renderInventoryList(invDisplay) {
        if (invDisplay.isEmpty) {
            return '<div class="inventory-empty-msg">Roll items to see them here</div>';
        }

        return invDisplay.items.map((item, index) => {
            const allMods = getAllModifications(item);
            const modBadges = allMods.map(mod => `<span class="mod-badge" title="${mod.description || ''}">${mod.emoji || ''} ${mod.name}</span>`).join('');
            const displayName = getModifiedItemName(item);
            const nameStyle = typeof getItemNameStyle === 'function' ? getItemNameStyle(item) : {};
            const nameCss = typeof nameStyleToCss === 'function' ? nameStyleToCss(nameStyle) : '';
            const safeName = typeof escapeHtml === 'function' ? escapeHtml(displayName) : displayName;
            const legendWrap = item.rarity === 'legendary' ? ' inventory-item-name legendary-particle-wrap' : '';

            return `
                <div class="inventory-item inventory-item-minimal ${this.inventory.getRarityClass(item.rarity)} inventory-item-hover" title="${displayName}" data-item-index="${index}" draggable="true">
                    <div class="inventory-item-name${legendWrap}"${nameCss}>${safeName}</div>
                    <div class="inventory-item-tooltip" aria-hidden="true">
                        <div class="tooltip-name"${nameCss}>${safeName}</div>
                        <div class="tooltip-rarity">${item.rarity.toUpperCase()}</div>
                        ${allMods.length > 0 ? `<div class="tooltip-mods">${modBadges}</div>` : ''}
                        <div class="tooltip-value">Value: ${item.value} 💰</div>
                        ${item.baseValue != null && item.baseValue !== item.value && item.priceMultiplier != null ? `<div class="tooltip-base">Base: ${item.baseValue} (×${item.priceMultiplier.toFixed(2)})</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render shop items (cards; hold to see description & special)
     */
    renderShop() {
        const shopItems = this.shop.getAvailableItems();
        const cash = this.shop.getCash();

        return shopItems.map(item => {
            const canAfford = cash >= item.cost;
            const isOwned = item.owned;
            const nameStyle = typeof getPerkNameStyle === 'function' ? getPerkNameStyle(item) : {};
            const nameCss = typeof nameStyleToCss === 'function' ? nameStyleToCss(nameStyle) : '';
            const safeName = typeof escapeHtml === 'function' ? escapeHtml(item.name) : item.name;
            const safeDesc = typeof escapeAttr === 'function' ? escapeAttr(item.description) : item.description;
            const safeSpecial = item.special ? (typeof escapeAttr === 'function' ? escapeAttr(item.special.replace(/_/g, ' ')) : item.special) : '';

            return `
                <div class="perk-card perk-card-shop perk-tooltip-anchor rarity-${item.rarity} ${isOwned ? 'perk-purchased' : ''}" data-perk-id="${item.id}" data-perk-name="${escapeAttr(item.name)}" data-perk-rarity="${escapeAttr(item.rarity)}" data-perk-desc="${safeDesc}" data-perk-special="${safeSpecial}" data-perk-cost="${item.cost}">
                    ${isOwned ? '<div class="perk-purchased-overlay">PURCHASED ✓</div>' : ''}
                    <div class="perk-card-header">
                        <div class="perk-card-name"${nameCss}>${safeName}</div>
                        <div class="perk-rarity-badge">${item.rarity.toUpperCase()}</div>
                    </div>
                    <div class="perk-card-footer">
                        <div class="perk-card-cost">${item.cost}$</div>
                        <button class="perk-buy-btn" 
                            onclick="game.handleBuyPerk('${item.id}')"
                            ${isOwned ? 'disabled' : (!canAfford ? 'disabled' : '')}>
                            ${isOwned ? '✓ OWNED' : (canAfford ? 'BUY' : 'AFFORD?')}
                        </button>
                    </div>
                    <div class="perk-card-tooltip"><span class="pt-desc">${item.description}</span>${item.special ? `<span class="pt-special">✨ ${item.special.replace(/_/g, ' ')}</span>` : ''}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render Knowledge Index (items, perks, bosses)
     */
    renderIndex() {
        const tabs = [
            { id: 'items', label: 'Items' },
            { id: 'perks', label: 'Perks' },
            { id: 'bosses', label: 'Bosses' },
        ];
        const itemsHtml = typeof THING_TEMPLATES !== 'undefined'
            ? Object.values(THING_TEMPLATES).map(t => `<div class="index-entry"><span class="index-entry-name">${t.name}</span><span class="index-entry-meta">Base value: ${t.baseValue}</span></div>`).join('')
            : '';
        const perksList = typeof getShopPerks === 'function' ? getShopPerks() : [];
        const bossPerks = (typeof BOSS_EXCLUSIVE_PERKS !== 'undefined' && BOSS_EXCLUSIVE_PERKS) ? Object.values(BOSS_EXCLUSIVE_PERKS) : [];
        const perksHtml = [...perksList, ...bossPerks].map(p => `<div class="index-entry"><span class="index-entry-name">${(p && p.name) || ''}</span><span class="index-entry-meta">${(p && p.rarity) || ''} — ${(p && p.description) || ''}</span></div>`).join('');
        const bossesHtml = typeof BOSSES !== 'undefined' && Array.isArray(BOSSES)
            ? BOSSES.map(b => `<div class="index-entry index-boss"><span class="index-entry-name">${b.name}</span><span class="index-entry-meta">Wave ${b.wave} — ${b.description || ''}</span></div>`).join('')
            : '';

        return `
            <div class="index-tabs">
                ${tabs.map((t, i) => `<button type="button" class="index-tab ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
            </div>
            <div class="index-panel" id="index-panel-items">${itemsHtml || '<p class="index-empty">No items data.</p>'}</div>
            <div class="index-panel" id="index-panel-perks" style="display:none">${perksHtml || '<p class="index-empty">No perks data.</p>'}</div>
            <div class="index-panel" id="index-panel-bosses" style="display:none">${bossesHtml || '<p class="index-empty">No bosses data.</p>'}</div>
        `;
    }

    attachIndexTabs() {
        const modal = document.getElementById('index-modal');
        if (!modal) return;
        modal.querySelectorAll('.index-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                modal.querySelectorAll('.index-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                modal.querySelectorAll('.index-panel').forEach(p => { p.style.display = 'none'; });
                const panel = document.getElementById(`index-panel-${tab}`);
                if (panel) panel.style.display = 'block';
            });
        });
    }

    /**
     * Render current attributes
     */
    renderAttributes() {
        const attrs = this.gameState.getFormattedAttributes();
        return `
            <div class="attributes-display">
                <div style="text-align: left; margin-bottom: 10px;">
                    <strong>Your Attributes:</strong>
                </div>
                <div class="attributes-grid">
                    ${Object.entries(attrs).map(([name, value]) => `
                        <div class="attribute-card">
                            <div class="attribute-name">${name}</div>
                            <div class="attribute-value">${value}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Show game over screen
     */
    renderGameOver(reason) {
        this.currentScreen = 'gameover';
        const html = `
            <div class="screen">
                <div class="screen-title">Wave ${this.gameState.wave - 1}</div>
                <div class="screen-subtitle">${reason}</div>
                <div class="screen-content">
                    <p>Max Chips Earned: <strong>${this.gameState.chips}</strong></p>
                    <p>Max Wave Reached: <strong>${this.gameState.wave - 1}</strong></p>
                </div>
                <button class="btn btn-primary" onclick="game.handleRestart()">
                    Play Again
                </button>
            </div>
        `;
        this.container.innerHTML = html;
    }

    /**
     * Show wave transition screen
     */
    renderWaveTransition(nextWave) {
        this.currentScreen = 'transition';
        const html = `
            <div class="screen">
                <div class="screen-title">Wave ${nextWave}</div>
                <div class="screen-subtitle">New Challenges Await!</div>
                <div class="screen-content">
                    <p>You successfully advanced to the next wave.</p>
                    <p>Your attributes are ready to help you!</p>
                </div>
                <button class="btn btn-primary" onclick="game.handleContinueWave()">
                    Begin Wave ${nextWave}
                </button>
            </div>
        `;
        this.container.innerHTML = html;
    }

    /**
     * Show shop between waves
     */
    renderShopScreen() {
        this.currentScreen = 'shop';
        // Generate new random shop perks for this wave
        this.shop.generateShopPerks();
        
        const html = `
            <div style="padding: 20px;">
                <div class="game-header">
                    <div class="game-title">Perks Shop - Wave ${this.gameState.wave}</div>
                    <div class="game-stats">
                        <div class="stat-item cash-with-tooltip">
                            <span class="stat-label">Cash</span>
                            <div class="cash-tooltip-wrapper">
                                <span class="stat-value stat-cash">${this.gameState.cash}$</span>
                                <div class="interest-tooltip">
                                    <span class="interest-tooltip-text">Interest: 💰×${this.gameState.interestStacks}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin: 30px 0;">
                    <p style="font-size: 1.2em; color: #666; margin-bottom: 20px;">
                        Buy perks with your Cash to improve your attributes!
                    </p>
                </div>

                <div id="shop-grid" class="perk-card-grid">
                    ${this.renderShop()}
                </div>

                <div class="action-buttons" style="margin-top: 40px;">
                    <button class="btn btn-primary" onclick="game.handleStartWave()">
                        Continue to Wave ${this.gameState.wave}
                    </button>
                </div>

                ${this.renderAttributes()}
            </div>
        `;
        this.container.innerHTML = html;
    }

    /**
     * Boss defeated: choose 3 exclusive perks
     */
    renderBossRewardScreen() {
        this.currentScreen = 'boss_reward';
        const { pendingBossReward } = this.gameState;
        if (!pendingBossReward) return this.renderShopScreen();
        const { boss, perkOptions } = pendingBossReward;
        const picked = this.gameState.getBossPerksPickedCount();
        const need = typeof CONFIG !== 'undefined' ? CONFIG.BOSS_PERK_PICK_COUNT : 3;

        const perksHtml = perkOptions.map(perk => {
            const owned = !!this.gameState.perksPurchased[perk.id];
            const selected = owned ? 'boss-perk-selected' : '';
            return `
                <div class="perk-card boss-perk-card rarity-${perk.rarity} ${selected}" data-perk-id="${perk.id}" onclick="game.handleBossPerkSelect('${perk.id}')">
                    ${owned ? '<div class="boss-perk-check">✓</div>' : ''}
                    <div class="perk-card-header">
                        <div class="perk-card-name">${perk.name}</div>
                        <div class="perk-rarity-badge">${perk.rarity.toUpperCase()}</div>
                    </div>
                    <div class="perk-card-description">${perk.description}</div>
                </div>
            `;
        }).join('');

        const html = `
            <div class="screen boss-reward-screen">
                <div class="boss-reward-title">🏆 ${boss.name} Defeated!</div>
                <div class="boss-reward-subtitle">Choose ${need} exclusive perks</div>
                <div class="boss-reward-picked">Picked: ${picked} / ${need}</div>
                <div id="boss-reward-grid" class="perk-card-grid boss-perk-grid">
                    ${perksHtml}
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="game.handleConfirmBossReward()">
                        Confirm (${picked}/${need}) & Continue
                    </button>
                </div>
            </div>
        `;
        this.container.innerHTML = html;
    }

    updateBossRewardScreen() {
        if (this.currentScreen !== 'boss_reward') return;
        this.renderBossRewardScreen();
    }

    /**
     * Show initial welcome screen
     */
    renderStartScreen() {
        this.currentScreen = 'start';
        const html = `
            <div class="screen">
                <div class="screen-title">Thingamajig</div>
                <div class="screen-subtitle">A Roguelike Gambling Adventure</div>
                <div class="screen-content">
                    <p>Roll items—each can have size and mods—then sell for chips. Every 5th wave is a <strong>Boss</strong>: meet the chip goal to defeat it and choose 3 exclusive perks!</p>
                    <p>Spend cash in the shop on perks. Auto-roll common, extra rolls, luck, and more. Reach the chip goal each wave to advance.</p>
                    <p>Fail to earn enough chips and it's game over.</p>
                </div>
                <button class="btn btn-primary" onclick="game.handleStartGame()">
                    Start Game
                </button>
            </div>
        `;
        this.container.innerHTML = html;
    }

    /**
     * Update a specific section (for quick updates)
     */
    updateSection(sectionId, html) {
        const element = document.getElementById(sectionId);
        if (element) {
            element.innerHTML = html;
        }
    }

    /**
     * Show a notification (smaller, thinner). Dedupe: same message+type shows "(x n)" and extends duration.
     */
    showMessage(message, type = 'info') {
        const key = `${type}:${message}`;
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }
        const existing = container.querySelector(`[data-msg-key="${escapeAttr(key)}"]`);
        if (existing) {
            let count = parseInt(existing.getAttribute('data-msg-count') || '1', 10) + 1;
            existing.setAttribute('data-msg-count', String(count));
            existing.innerHTML = `${message} <span class="notification-count">(×${count})</span>`;
            const oldT = existing.getAttribute('data-timeout');
            if (oldT) clearTimeout(parseInt(oldT, 10));
        }
        const div = existing || document.createElement('div');
        if (!existing) {
            div.className = `notification notification-${type}`;
            div.setAttribute('data-msg-key', key);
            div.setAttribute('data-msg-count', '1');
            div.innerHTML = message;
            container.appendChild(div);
        }
        const duration = type === 'epic' ? 6000 : 4000;
        const t = setTimeout(() => {
            div.remove();
        }, duration);
        div.setAttribute('data-timeout', String(t));
    }
}
