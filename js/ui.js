 /**
 * UI Renderer
 * Handles all screen rendering and DOM updates
 * 
 * Key features:
 * - Responsive screen rendering (game, shop, rewards, etc.)
 * - Smart tooltip positioning and management
 * - Drag & drop support for inventory items
 * - Accessibility features (ARIA labels, keyboard navigation)
 * - Performance optimizations (event delegation, throttling)
 * 
 * @class UI
 */
function escapeAttr(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

class UI {
    /**
     * Create a new UI instance
     * 
     * @param {GameState} gameState - The game state object
     * @param {string} containerSelector - CSS selector for the main container
     */
    constructor(gameState, shop, inventory, containerSelector = '#game-ui') {
        this.gameState = gameState;
        this.container = document.querySelector(containerSelector);
        this.shop = shop || new Shop(gameState);
        this.inventory = inventory || new Inventory(gameState);
        this.messageQueue = [];
        this.currentScreen = null;
        
        // Performance optimization: cache frequently accessed elements
        this._cachedElements = new Map();
    }

    renderChipIcon() {
        return '<span class="chip-icon">Ȼ</span>';
    }

    /**
     * Get cached element or query and cache it
     * Performance optimization to reduce DOM queries
     * 
     * @param {string} selector - CSS selector
     * @param {boolean} useCache - Whether to use caching (default: true)
     * @returns {Element|null} The found element
     */
    getElement(selector, useCache = true) {
        if (useCache && this._cachedElements.has(selector)) {
            return this._cachedElements.get(selector);
        }
        
        const element = document.querySelector(selector);
        if (useCache && element) {
            this._cachedElements.set(selector, element);
        }
        
        return element;
    }

    /**
     * Clear element cache for specific selector or all
     * 
     * @param {string} selector - CSS selector to clear (optional, clears all if omitted)
     */
    clearElementCache(selector) {
        if (selector) {
            this._cachedElements.delete(selector);
        } else {
            this._cachedElements.clear();
        }
    }

    renderHeaderWorldInfo() {
        if (typeof game === 'undefined' || !game.timeSystem || !game.worldSystem) return '';
        
        const timeStr = game.timeSystem.getDisplayTime();
        const dayStr = game.timeSystem.getDisplayDay();
        const biome = game.worldSystem.getCurrentBiome();
        const events = game.worldSystem.getActiveEvents();
        
        let eventHtml = '';
        let eventClass = '';
        if (events.length > 0) {
            const event = events[0];
            // Find event definition by ID
            const eventDef = (typeof EVENTS !== 'undefined') 
                ? Object.values(EVENTS).find(e => e.id === event.id) 
                : null;

            // Use flavor text if available, otherwise name
            const flavor = (eventDef && eventDef.flavorText) 
                ? eventDef.flavorText 
                : `Event: ${event.name}`;
            
            // Apply custom styles if available
            let style = '';
            if (eventDef) {
                if (eventDef.textStroke) style += `-webkit-text-stroke: ${eventDef.textStroke}; `;
                if (eventDef.color) style += `color: ${eventDef.color}; `;
            }
            // Dynamic animation steps based on character count
            // Added extra steps (+10) for smoother finish
            style += `animation: type-writer 12s steps(${flavor.length + 1000}) 1 normal both;`;

            eventHtml = `<div class="header-event-text" style="${style}">${flavor}</div>`;
            eventClass = 'has-event';
        }

        return `
            <div class="header-world-info ${eventClass}">
                <div class="header-meta">
                    <span id="header-day">${dayStr}</span>
                    <span class="separator">•</span>
                    <span id="header-time">${timeStr}</span>
                </div>
                <div class="header-biome-title" style="color: ${biome.color}" id="header-biome">
                    ${biome.name}
                </div>
                ${eventHtml}
            </div>
        `;
    }

    /**
     * Update time display dynamically
     */
    updateTimeDisplay() {
        if (typeof game === 'undefined' || !game.timeSystem || !game.worldSystem) return;
        
        const timeEl = document.getElementById('header-time');
        const dayEl = document.getElementById('header-day');
        const biomeEl = document.getElementById('header-biome');
        const container = document.querySelector('.header-world-info');
        
        if (timeEl) timeEl.textContent = game.timeSystem.getDisplayTime();
        if (dayEl) dayEl.textContent = game.timeSystem.getDisplayDay();
        
        // Check for biome/event changes
        const biome = game.worldSystem.getCurrentBiome();
        const events = game.worldSystem.getActiveEvents();
        
        if (biomeEl) {
            if (biomeEl.textContent.trim() !== biome.name) {
                biomeEl.textContent = biome.name;
                biomeEl.style.color = biome.color;
            }
        }
        
        // Handle Event Message Updates
        // If event state changed (added/removed), we might need to re-render the whole info block
        // or just inject the message.
        // Simplest approach: Check if container has 'has-event' class vs current state
        const hasEventClass = container ? container.classList.contains('has-event') : false;
        const hasActiveEvent = events.length > 0;
        
        if (hasEventClass !== hasActiveEvent) {
            // State changed, easier to re-render the whole header info if possible
            // But we don't have a direct reference to the parent to set innerHTML easily without an ID.
            // Let's assume we can update the container's HTML.
            if (container) {
                container.outerHTML = this.renderHeaderWorldInfo();
            }
        }
    }

    /**
     * Render the main game screen
     */
    renderGameScreen() {
        this.currentScreen = 'game';
        const loot = this.inventory.getDisplay();
        const isNextRoundBoss = typeof isBossRound === 'function' && isBossRound(this.gameState.round + 1);
        
        const html = `
                <div class="perk-topbar">
                    
                    <div class="topbar-perks" id="topbar-perks">
                        ${this.renderTopbarPerks()}
                    </div>
                    <button class="stats-button" onclick="game.toggleStats()">Stats</button>
                    <button class="index-button" onclick="game.toggleIndex()">Index</button>
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
                        <div class="index-title">Knowledge Index</div>
                        ${this.renderIndex()}
                    </div>
                </div>

                <div class="game-header">
                    <div class="game-title">Thingamajig <span class="route-badge">Route ${this.gameState.getRouteIndex() + 1}</span></div>
                    ${this.renderHeaderWorldInfo()}
                    <div class="game-stats">
                    <div class="stat-item">
                        <span class="stat-label">Round</span>
                        <span class="stat-value">${this.gameState.round}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">${isNextRoundBoss ? 'Boss (Ȼ)' : 'CHIPS NEEDED'}</span>
                        <span class="stat-value stat-chips">${this.gameState.getRoundEntryCost()}${this.renderChipIcon()}</span>
                    </div>
                    <div class="stat-item cash-with-tooltip">
                        <span class="stat-label">Cash</span>
                        <div class="cash-tooltip-wrapper">
                            <span class="stat-value stat-cash">$${this.gameState.cash}</span>
                            <div class="interest-tooltip">
                                <span class="interest-tooltip-text">Interest: ${this.gameState.interestStacks}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="game-content">

                <div class="section roll-section">
                    <div class="section-title">Rolling</div>
                    <button class="roll-button" onclick="game.handleRoll()" ${(this.gameState.getRemainingRolls() <= 0 || this.gameState.hasReachedRoundGoal()) ? 'disabled' : ''}>
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

                <!-- Loot - Right Side -->
                <div class="section loot-section">
                    <div class="section-title">Loot</div>
                    <div class="loot-list" id="loot-list">
                        ${this.renderPaginatedLootList().html}
                    </div>
                    ${this.renderPaginatedLootList().pagination}
                    <div class="loot-total">
                        <span>Total Value:</span>
                        <span class="total-value">${loot.totalValue}${this.renderChipIcon()}</span>
                    </div>
                </div>
                <div class="seed-display" style="position: fixed; bottom: 5px; right: 5px; opacity: 0.3; font-size: 0.7rem; font-family: monospace; pointer-events: none; z-index: 1000;">
                    Seed: ${this.gameState.seedString || this.gameState.seed}
                </div>
            </div>
        `;
        if (this.renderWithTransition) {
            this.renderWithTransition(html);
        } else {
            this.container.innerHTML = html;
        }
        this.container.innerHTML = html;
        this.attachEventListeners();
        setTimeout(() => {
            if (typeof game !== 'undefined' && game.attachTiltEffect) {
                game.attachTiltEffect();
            }
        }, 100);
    }

    /**
     * Attach all event listeners in a single method for better organization
     */
    attachEventListeners() {
        this.attachSmartTooltips();
        this.attachHoldToSeeTooltips();
        this.attachLootHoverTooltips();
        this.attachInterestTooltip();
        this.attachPerkTooltips();
        this.attachInventoryDrag();
        this.attachTopbarPerkDrag();
        this.attachIndexTabs();
        this.attachIndexInteractions();
    }

    attachIndexInteractions() {
        const modal = document.getElementById('index-modal');
        if (!modal) return;

        const input = document.getElementById('index-search');
        const applyFilter = () => {
            const q = (input?.value || '').trim().toLowerCase();
            modal.querySelectorAll('.index-entry').forEach(el => {
                const name = (el.getAttribute('data-name') || '').toLowerCase();
                const text = (el.getAttribute('data-search') || '').toLowerCase();
                const ok = !q || name.includes(q) || text.includes(q);
                el.style.display = ok ? '' : 'none';
            });
        };

        if (input) {
            input.addEventListener('input', applyFilter);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    input.value = '';
                    applyFilter();
                }
            });
        }

        modal.querySelectorAll('.index-entry-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-target');
                const details = id ? document.getElementById(id) : null;
                if (!details) return;
                const isHidden = details.style.display === 'none' || details.style.display === '';
                details.style.display = isHidden ? 'block' : 'none';
            });
        });

        applyFilter();
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
    
    // Removed transition helper to simplify rendering and avoid conflicts

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
    
    positionTooltipNearMouse(tooltipEl, e, padding = 12) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const tw = tooltipEl.offsetWidth;
        const th = tooltipEl.offsetHeight;
        let x = e.clientX + 12;
        let y = e.clientY + 12;
        if (x + tw > vw - padding) x = vw - tw - padding;
        if (y + th > vh - padding) y = vh - th - padding;
        if (x < padding) x = padding;
        if (y < padding) y = padding;
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

    /**
     * Attach hold-to-see tooltip functionality for loot items
     */
    attachHoldToSeeTooltips() {
        const lootList = document.getElementById('loot-list');
        if (!lootList) return;
        let holdTimer = null;
        let currentItem = null;
        const tooltipEl = this.getOrCreateFloatingTooltip();
        const HOLD_DURATION = 400;
        const startHold = (item, e) => {
            if (holdTimer) clearTimeout(holdTimer);
            currentItem = item;
            holdTimer = setTimeout(() => {
                if (currentItem === item) {
                    const inner = item.querySelector('.loot-item-tooltip');
                    if (inner) {
                        tooltipEl.innerHTML = inner.innerHTML;
                        tooltipEl.classList.add('visible');
                        this.positionTooltipNearMouse(tooltipEl, e);
                    }
                }
            }, HOLD_DURATION);
        };
        const endHold = () => {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            currentItem = null;
            tooltipEl.classList.remove('visible');
        };
        lootList.addEventListener('mousedown', (e) => {
            const item = e.target.closest('.loot-item-minimal');
            if (!item) return;
            startHold(item, e);
        }, true);
        lootList.addEventListener('mousemove', (e) => {
            if (!tooltipEl.classList.contains('visible')) return;
            this.positionTooltipNearMouse(tooltipEl, e);
        }, true);
        lootList.addEventListener('mouseup', () => endHold(), true);
        lootList.addEventListener('mouseleave', () => endHold(), true);
        lootList.addEventListener('touchstart', (e) => {
            const item = e.target.closest('.loot-item-minimal');
            if (!item) return;
            startHold(item, e.touches && e.touches[0] ? e.touches[0] : e);
        }, { passive: true });
        lootList.addEventListener('touchmove', (e) => {
            if (!tooltipEl.classList.contains('visible')) return;
            const t = e.touches && e.touches[0] ? e.touches[0] : e;
            this.positionTooltipNearMouse(tooltipEl, t);
        }, { passive: true });
        lootList.addEventListener('touchend', () => endHold(), { passive: true });
        lootList.addEventListener('touchcancel', () => endHold(), { passive: true });
    }
    
    attachLootHoverTooltips() {
        const lootList = document.getElementById('loot-list');
        if (!lootList) return;
        const tooltipEl = this.getOrCreateFloatingTooltip();
        lootList.addEventListener('mouseenter', (e) => {
            const card = e.target.closest('.loot-item-minimal');
            if (!card) return;
            const inner = card.querySelector('.loot-item-tooltip');
            if (!inner) return;
            tooltipEl.innerHTML = inner.innerHTML;
            tooltipEl.classList.add('visible');
            this.positionTooltipNearMouse(tooltipEl, e);
        }, true);
        lootList.addEventListener('mousemove', (e) => {
            if (!tooltipEl.classList.contains('visible')) return;
            this.positionTooltipNearMouse(tooltipEl, e);
        }, true);
        lootList.addEventListener('mouseleave', () => {
            tooltipEl.classList.remove('visible');
        }, true);
    }

    getDynamicTooltipText(perkId) {
        const perkDef = typeof getPerkById === 'function' ? getPerkById(perkId) : null;
        if (!perkDef) return null;
        
        const dynamicType = perkDef.properties ? perkDef.properties.dynamictooltips : perkDef.dynamicTooltip;
        if (!dynamicType) return null;

        switch (dynamicType) {
            case 'chip_count':
                const chips = typeof this.gameState.getInventoryValue === 'function' ? this.gameState.getInventoryValue() : 0;
                return `<br><span style="color:var(--success)">Current Ȼ: ${chips}</span>`;
            case 'virus_count':
                let virus = this.gameState.perksPurchased['VIRUS'] || 0;
                if (virus === true) virus = 1;
                return `<br><span style="color:var(--warning)">VIRUS: ${virus}</span>`;
            case 'set_collection':
                const set = perkDef.properties ? perkDef.properties.set : perkDef.set;
                if (!set) return null;
                const setPerks = Object.values(PERKS).filter(p => (p.properties && p.properties.set === set) || p.set === set);
                if (setPerks.length === 0) return null;
                
                let html = '<div style="margin-top:8px; border-top:1px solid #444; padding-top:4px;">';
                html += '<div style="font-weight:bold; color:#a855f7; margin-bottom:4px;">Set Collection:</div>';
                html += '<div style="display:flex; flex-wrap:wrap; gap:4px; justify-content:center;">';
                
                setPerks.forEach(p => {
                    const owned = this.gameState.perksPurchased[p.id];
                    const opacity = owned ? '1' : '0.3';
                    const border = owned ? '1px solid #a855f7' : '1px solid #444';
                    const bg = owned ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.3)';
                    html += `<div style="padding:2px 4px; font-size:1.2em; border-radius:4px; background:${bg}; border:${border}; opacity:${opacity}; width:30px; height:30px; display:flex; align-items:center; justify-content:center;" title="${p.name}">${p.icon || '?'}</div>`;
                });
                
                html += '</div>';
                
                // Show active bonus
                const ownedCount = setPerks.filter(p => this.gameState.perksPurchased[p.id]).length;
                const bonusPerk = setPerks.find(p => p.properties && p.properties.setBonuses) || setPerks.find(p => p.setBonuses);
                
                if (bonusPerk) {
                     const bonuses = (bonusPerk.properties && bonusPerk.properties.setBonuses) || bonusPerk.setBonuses;
                     if (bonuses) {
                         let currentBonus = null;
                         let nextBonus = null;
                         let nextCount = 0;
                         
                         const sortedCounts = Object.keys(bonuses).map(Number).sort((a,b) => a-b);
                         
                         for (const c of sortedCounts) {
                             if (ownedCount >= c) {
                                 currentBonus = bonuses[c];
                             } else {
                                 nextBonus = bonuses[c];
                                 nextCount = c;
                                 break;
                             }
                         }
                         
                         if (currentBonus) {
                             let bonusText = '';
                             for (const [k, v] of Object.entries(currentBonus)) {
                                 if (k === 'luck' && v.type === 'add') bonusText += `+${v.value} Luck `;
                                 else if (k === 'rolls' && v.type === 'add') bonusText += `+${v.value} Rolls `;
                                 else if (k === 'valueBonus' && v.type === 'add') bonusText += `+${v.value * 100}% Value `;
                                 else bonusText += `${k} `;
                             }
                             html += `<div style="font-size:0.8em; color:#4ade80; margin-top:4px;">Active: ${bonusText}</div>`;
                         }
                         
                         if (nextBonus) {
                             html += `<div style="font-size:0.8em; color:#888; margin-top:2px;">Next (${ownedCount}/${nextCount}): ???</div>`;
                         }
                     }
                }
                html += '</div>';
                return html;
            default:    
                return null;
        }
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
            // Chip Vision Perk Logic (Legacy - Topbar Title)
            const topbar = e.target.closest('.perk-topbar');
            if (topbar && this.gameState.perksPurchased['chip_vision']) {
                const chips = typeof this.gameState.getInventoryValue === 'function' ? this.gameState.getInventoryValue() : 0;
                topbar.title = `Ȼ: ${chips}`;
            }

            const anchor = e.target.closest('.perk-tooltip-anchor');
            if (!anchor) return;
            const perkId = anchor.getAttribute('data-perk-id');
            const name = anchor.getAttribute('data-perk-name') || '';
            const rarity = anchor.getAttribute('data-perk-rarity') || '';
            const desc = anchor.getAttribute('data-perk-desc') || '';
            const special = anchor.getAttribute('data-perk-special') || '';
            const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s || '') : (s || ''));

            let descHtml = esc(desc);
            const dynamicText = this.getDynamicTooltipText(perkId);
            if (dynamicText) {
                descHtml += dynamicText;
            }

            perkTooltip.innerHTML = `<span class="pt-name">${esc(name)}</span><span class="pt-rarity">${esc(rarity.toUpperCase())}</span><span class="pt-desc">${descHtml}</span>${special ? `<span class="pt-special">✨ ${esc(special)}</span>` : ''}`;
            perkTooltip.classList.add('visible');
            this.positionTooltipNearMouse(perkTooltip, e);
        }, true);
        this.container.addEventListener('mousemove', (e) => {
            const anchor = e.target.closest('.perk-tooltip-anchor');
            if (anchor && perkTooltip.classList.contains('visible')) this.positionTooltipNearMouse(perkTooltip, e);
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
            return '<span class="no-perks">no perks found</span>';
        }
        return ownedPerks.map((perk) => {
            const full = typeof getBossPerkById === 'function' ? getBossPerkById(perk.id) : null;
            const p = full || (typeof getPerkById === 'function' ? getPerkById(perk.id) : null);
            const desc = (p && p.description) || '';
            let specialText = '';
            if (p && p.special) {
                if (typeof p.special === 'string') {
                    specialText = p.special;
                } else if (typeof p.special === 'object') {
                    specialText = Object.keys(p.special).join(', ');
                }
            }
            const special = specialText ? specialText.replace(/_/g, ' ') : '';
            let rarity = (p && (p.rarity || p.tier)) || 'common';
            // Safety check for non-string rarity
            if (typeof rarity !== 'string') {
                rarity = String(rarity);
            }
            const nameStyle = typeof getPerkNameStyle === 'function' ? getPerkNameStyle(p) : {};
            const nameCss = typeof nameStyleToCss === 'function' ? nameStyleToCss(nameStyle) : '';
            
            let displayName = perk.name;
            let count = this.gameState.perksPurchased[perk.id] || 0;
            if (count === true) count = 1;
            
            // Check stackability
            let maxStack = 1;
            if (p) {
                if (p.properties && p.properties.stack) maxStack = p.properties.stack;
                else if (p.maxStacks) maxStack = p.maxStacks;
            }
            
            if (maxStack > 1 && count > 0) {
                 displayName += ` x${count}`;
            } else if (p && p.type === 'subperk' && count > 0) {
                 // Keep subperk logic just in case
                 if (p.maxStacks) {
                     displayName += ` (${count}/${p.maxStacks})`;
                 } else {
                     displayName += ` x${count}`;
                 }
            }
            
            const safeName = typeof escapeHtml === 'function' ? escapeHtml(displayName) : displayName;
            return `<span class="topbar-perk-badge perk-tooltip-anchor rarity-${rarity.toLowerCase()}" draggable="true" data-perk-id="${perk.id}" data-perk-name="${escapeAttr(perk.name)}" data-perk-rarity="${escapeAttr(rarity)}" data-perk-desc="${escapeAttr(desc)}" data-perk-special="${escapeAttr(special)}"><span class="topbar-perk-name"${nameCss}>${safeName}</span></span>`;
        }).join('');
    }



    /**
     * Render paginated loot list (formerly inventory)
     */
    renderPaginatedLootList() {
        const paginated = this.gameState.getPaginatedLoot ? this.gameState.getPaginatedLoot() : { items: [], totalItems: 0, currentPage: 0, totalPages: 0, hasNext: false, hasPrev: false };
        
        if (paginated.items.length === 0) {
            return {
                html: '<div class="loot-empty-msg">Roll items to see them here</div>',
                pagination: ''
            };
        }

        const itemsHtml = paginated.items.map((item, index) => {
            const actualIndex = (paginated.currentPage * this.gameState.itemsPerPage) + index;
            const allMods = typeof getAllModifications === 'function' ? getAllModifications(item) : [];
            
            // Generate HTML for modifiers and attributes (Attributes as text, Mods as badges)
            // Filter out attributes from the name prefix
            // For loot card view: User requested to remove Mod names, only show Attribute (handled in fullNameHtml)
            const prefixHtml = '';

            const nameStyle = typeof getItemNameStyle === 'function' ? getItemNameStyle(item) : {};
            const nameCss = typeof nameStyleToCss === 'function' ? nameStyleToCss(nameStyle) : '';
            
            // Build the full name HTML: [Attribute Name] [Base Name]
            let fullNameHtml = '';
            
            // Base Name Part (Colored Text)
            // Attributes are now handled inside getModifiedItemNameHtml
            if (typeof getModifiedItemNameHtml === 'function') {
                fullNameHtml += getModifiedItemNameHtml(item);
            } else {
                const displayName = typeof getModifiedItemName === 'function' ? getModifiedItemName(item) : item.name;
                const safeName = typeof escapeHtml === 'function' ? escapeHtml(displayName) : displayName;
                fullNameHtml += safeName;
            }
            
            // Particle wrappers for high tiers
            let legendWrap = '';
            if (['transcendent', 'enigmatic', 'unfathomable', 'otherworldly', 'imaginary', 'zenith'].includes(item.tier)) {
                legendWrap = ' loot-item-name particle-wrap';
                // Add specific particle containers if needed, currently just CSS class on wrapper
            } else if (item.tier === 'legendary' || item.tier === 'surreal' || item.tier === 'mythic' || item.tier === 'exotic' || item.tier === 'exquisite') {
                legendWrap = ' loot-item-name high-tier-wrap';
            }

            return `
                <div class="loot-item loot-item-minimal ${this.inventory.getRarityClass(item.tier)}" data-item-index="${actualIndex}">
                    <div class="loot-item-name${legendWrap}"${nameCss}>
                        ${prefixHtml}
                        ${fullNameHtml}
                        ${item.tier === 'zenith' ? '<div class="zenith-question-mark">?</div>' : ''}
                        ${['transcendent', 'enigmatic', 'unfathomable', 'otherworldly', 'imaginary', 'zenith'].includes(item.tier) ? '<div class="particle-container"></div>' : ''}
                    </div>
                    <div class="loot-item-tooltip" aria-hidden="true">
                        <div class="tooltip-name"${nameCss}>${fullNameHtml}</div>
                        <div class="tooltip-rarity rarity-color rarity-${item.tier}">${item.tier.toUpperCase()}</div>
                        
                        ${allMods.length > 0 ? `
                            <div class="tooltip-mods-list" style="margin-top:4px; font-size:0.85em; text-align:left;">
                                ${allMods.map(m => 
                                    typeof getModBadgeHtml === 'function' ? getModBadgeHtml(m) : `<span class="mod-badge" style="color:${m.color || '#fff'}; border: 1px solid ${m.color || '#fff'}; padding: 3px 8px; border-radius: 12px; margin-right: 4px; margin-bottom: 2px; font-size: 0.85em; font-weight: bold; display: inline-block;">${m.name}</span>`
                                ).join(' ')}
                            </div>
                        ` : ''}
                        
                        <div class="tooltip-value" style="margin-top:8px;">
                            <span style="color: #60a5fa">${item.value}Ȼ</span>
                            <div style="font-size: 0.85em; color: var(--text-muted); margin-top: 2px;">1/${item.rarityScore || '?'}</div>
                        </div>
                        ${item.baseValue != null && item.baseValue !== item.value && item.priceMultiplier != null ? `<div class="tooltip-base">Base: ${item.baseValue} (×${item.priceMultiplier.toFixed(2)})</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        /* Pagination removed as requested
        let paginationHtml = '';
        if (paginated.totalItems > this.gameState.itemsPerPage) {
            paginationHtml = `
                <div class="loot-pagination">
                    <button onclick="game.handlePrevLootPage()" ${!paginated.hasPrev ? 'disabled' : ''}>← Previous</button>
                    <span class="page-info">Page ${paginated.currentPage + 1} / ${paginated.totalPages}</span>
                    <button onclick="game.handleNextLootPage()" ${!paginated.hasNext ? 'disabled' : ''}>Next →</button>
                </div>
            `;
        }
        */
        const paginationHtml = ''; // Disabled

        return { html: itemsHtml, pagination: paginationHtml };
    }


    getPerkIcon(perk) {
        if (perk.icon) return perk.icon;
        
        // Fallback: Try to look up in global PERKS definitions if available
        if (typeof PERKS !== 'undefined') {
            const perkDef = Object.values(PERKS).find(p => p.id === perk.id);
            if (perkDef && perkDef.icon) return perkDef.icon;
        }
        
        return '📦';
    }

    /**
     * Render shop items (Balatro-style vertical cards with art area and animations)
     */
    renderShop() {
        if (!this.shop) return '';
        const shopItems = this.shop.getAvailableItems();
        const cash = this.shop.getCash();
        const selectedId = (typeof game !== 'undefined' && game.selectedShopPerkId) ? game.selectedShopPerkId : null;

        return shopItems.map((item, index) => {
            const canAfford = cash >= item.cost;
            const isOwned = item.owned;
            const nameStyle = typeof getPerkNameStyle === 'function' ? getPerkNameStyle(item) : {};
            const nameCss = typeof nameStyleToCss === 'function' ? nameStyleToCss(nameStyle) : '';
            
            // Subperk Name Logic
            let displayName = item.name;
            if (item.type === 'subperk') {
                 let count = this.gameState.perksPurchased[item.id] || 0;
                 if (count === true) count = 1;
                 displayName += ` (${count + 1})`;
            }
            const safeName = typeof escapeHtml === 'function' ? escapeHtml(displayName) : displayName;
            
            // Dynamic description for Heliosol's Spear
            let descText = item.description;
           
            const safeDesc = typeof escapeHtml === 'function' ? escapeHtml(descText) : descText;

            const isSelected = selectedId && (item.instanceId ? selectedId === item.instanceId : selectedId === item.id);
            const locked = !canAfford; // Allow purchase of duplicates/stackables if in shop
            const icon = this.getPerkIcon(item);
            const isLegendary = item.rarity === 'legendary';
            const isMythical = item.rarity === 'mythical';
            const isGodlike = item.rarity === 'godlike';
            const isUltimate = item.rarity === 'ultimate';
            const isNullification = item.id === 'nullificati0n';

            // Check Requirement
            let reqHtml = '';
            let reqLocked = false;
            let reqPerk = null;
            const perkDef = typeof getPerkById === 'function' ? getPerkById(item.id) : null;
            
            if (perkDef && perkDef.conditions) {
                const reqCond = perkDef.conditions.find(c => c.type === 'requirePerk');
                if (reqCond) {
                    const reqIds = Array.isArray(reqCond.perkId) ? reqCond.perkId : [reqCond.perkId];
                    const missingId = reqIds.find(id => !this.gameState.perksPurchased[id]);
                    
                    if (missingId) {
                        reqLocked = true;
                        const reqP = typeof getPerkById === 'function' ? getPerkById(missingId) : null;
                        reqPerk = reqP ? reqP.name : missingId;
                        reqHtml = `<div class="perk-req-warning">Requires: ${reqPerk}</div>`;
                    }
                }
            }

            // Check Nullification Lock
            // If we own Nullification, everything else is locked
            let nullificationLocked = false;
            if (this.gameState.perksPurchased['nullificati0n'] && !isOwned && item.id !== 'nullificati0n') {
                nullificationLocked = true;
            }

            // Check Overwrite Warning - Deprecated/Removed in new system (handled by Conflict Lock)
            let overwriteHtml = '';

            const conflicted = item.conflicted;
            const conflictReason = item.conflictReason;

            const lockedOverlay = (locked && !isOwned) || reqLocked || nullificationLocked || conflicted
                ? `<div class="perk-locked-overlay">${nullificationLocked ? '⛔ NULLIFIED' : (conflicted ? (conflictReason ? '⛔ ' + conflictReason.toUpperCase() : '⛔ CONFLICT') : (reqLocked ? '🔒 LOCKED' : '🔒 LOCKED'))}</div>`
                : '';
                
            let showPurchased = false;
            let overlayText = '';
            
            if (isOwned && item.type !== 'subperk') {
                // Always show purchased since stacking is removed (except for subperks)
                showPurchased = true;
                overlayText = '✓ PURCHASED';
            }

            const purchasedOverlay = showPurchased
                ? `<div class="perk-purchased-overlay">${overlayText}</div>` 
                : '';

            // Add animation classes for subperks
            const rollingClass = item.type === 'subperk' ? ' rolling-text' : '';
            const rollingAttr = item.type === 'subperk' ? ` data-final-text="${safeName}"` : '';

            let specialText = '';
            if (item.special) {
                if (typeof item.special === 'string') {
                    specialText = item.special;
                } else if (typeof item.special === 'object') {
                    specialText = Object.keys(item.special).join(', ');
                }
            }

            return `
                <div class="perk-card perk-card-shop perk-tooltip-anchor rarity-${item.rarity} ${showPurchased ? 'perk-purchased' : ''} ${isSelected ? 'perk-selected' : ''} ${locked || reqLocked || nullificationLocked || conflicted ? 'perk-locked' : ''} ${isNullification ? 'perk-glitch' : ''}" data-perk-id="${item.id}" data-perk-instance-id="${item.instanceId || ''}" data-perk-name="${escapeAttr(item.name)}" data-perk-rarity="${escapeAttr(item.rarity)}" data-perk-desc="${escapeAttr(safeDesc)}" data-perk-special="${escapeAttr(specialText)}" data-perk-cost="${item.cost}" onclick="game.handleShopPerkClick('${item.id}', '${item.instanceId || ''}')" style="animation-delay: ${index * 0.1}s">
                    ${purchasedOverlay}
            ${lockedOverlay}
            ${isLegendary || isMythical || isGodlike || isUltimate ? `
                <div class="perk-card-particles">
                    <span></span><span></span><span></span>
                </div>
            ` : ''}
                    <div class="perk-rarity-badge">${item.rarity}</div>
                    <div class="perk-card-art">
                        <div class="perk-card-icon">${icon}</div>
                    </div>
                    <div class="perk-card-info">
                        <div class="perk-card-name${rollingClass}"${nameCss}${rollingAttr}>${item.type === 'subperk' ? this.scrambleText(safeName) : safeName}</div>
                        ${reqHtml}
                        ${overwriteHtml}
                        <div class="perk-card-footer">
                            <div class="perk-card-cost">${item.cost}$</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    scrambleText(text) {
        // Initial random scramble
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        return text.split('').map(c => {
            if (c === ' ' || c === '(' || c === ')') return c;
            return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
    }

    startTextRollingAnimation() {
        const elements = document.querySelectorAll('.rolling-text');
        if (elements.length === 0) return;

        elements.forEach(el => {
            const finalText = el.getAttribute('data-final-text');
            if (!finalText) return;

            let iterations = 0;
            const maxIterations = 20; // How many scrambles before solving
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            
            const interval = setInterval(() => {
                el.innerText = finalText
                    .split('')
                    .map((letter, index) => {
                        if (index < iterations / 2) { // Reveal gradually
                            return letter;
                        }
                        if (letter === ' ' || letter === '(' || letter === ')') return letter;
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join('');
                
                iterations++;
                
                if (iterations >= maxIterations + finalText.length * 2) {
                    clearInterval(interval);
                    el.innerText = finalText; // Ensure final state
                }
            }, 50); // Speed of scramble
        });
    }


    /**
     * Toggle seed display state: Hidden -> Visible -> Copied
     */
    toggleSeedDisplay(btn, seedString) {
        const state = btn.dataset.state || 'hidden';
        const valueSpan = btn.querySelector('.stat-value');
        
        if (state === 'hidden') {
            // Unhide
            btn.dataset.state = 'visible';
            valueSpan.textContent = seedString;
            valueSpan.style.fontFamily = 'monospace';
            btn.style.background = 'rgba(255, 255, 255, 0.08)'; // Slightly lighter to show it's active
        } else {
            // Copy
            const copyToClipboard = (text) => {
                if (navigator.clipboard && window.isSecureContext) {
                    return navigator.clipboard.writeText(text);
                } else {
                    // Fallback for non-secure contexts (e.g. HTTP)
                    let textArea = document.createElement("textarea");
                    textArea.value = text;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    return new Promise((resolve, reject) => {
                        document.execCommand('copy') ? resolve() : reject();
                        textArea.remove();
                    });
                }
            };

            copyToClipboard(seedString).then(() => {
                const originalText = valueSpan.textContent;
                valueSpan.textContent = 'Copied!';
                btn.style.borderColor = 'var(--success)';
                
                setTimeout(() => {
                    valueSpan.textContent = seedString;
                    btn.style.borderColor = 'var(--border)';
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy: ', err);
                valueSpan.textContent = 'Error Copying';
                setTimeout(() => valueSpan.textContent = seedString, 1500);
            });
        }
    }

    renderBreakdownScreen(payload) {
        try {
            console.log('renderBreakdownScreen called', payload);
            this.currentScreen = payload.type === 'game_over' ? 'gameover' : 'rewards';
        
        const QUOTES = [
            "99% gamblers quit before they win big.",
            "Luck is what happens when preparation meets opportunity.",
            "You win some, you lose some.",
            "The rule is 80/20, 80% luck & 20% skill.",
            "A dollar won is twice as sweet as a dollar earned.",
            "Fortune favors the bold.",
            "I hate League of Legends."
        ];
        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

        const {
            type,
            round,
            chipsEarned,
            rollsRemaining,
            rollsToCash,
            baseReward,
            interestReward,
            cashBonus,
            chipsBonus, // Add chipsBonus
            totalReward,
            totalCash,
            canAdvance,
            nextCost,
            isBossNext,
            reason
        } = payload;

        let contentHtml = '';
        let title = '';
        let subtitle = '';
        let footerHtml = '';
        let clickHandler = '';
        let screenStyle = '';

        if (type === 'round_complete') {
            title = `Round ${round} Complete`;
            subtitle = 'Rewards Summary';
            // clickHandler is now handled by event listener
            clickHandler = canAdvance ? 'onclick="game.handleContinueFromRewards()"' : '';
            screenStyle = canAdvance ? 'cursor: pointer;' : 'cursor: default;';
            
            const greenStyle = 'style="color: var(--uncommon)"'; // Green color for money
            contentHtml = `
                <div class="reward-grid">
                    <div class="reward-card">
                        <div class="reward-label">Ȼ Earned</div>
                        <div class="reward-value"><span style="color: var(--chip-blue)">${chipsEarned}</span>${this.renderChipIcon()}</div>
                    </div>
                    ${chipsBonus ? `
                    <div class="reward-card">
                        <div class="reward-label">Perk Ȼ</div>
                        <div class="reward-value">+${chipsBonus}${this.renderChipIcon()}</div>
                    </div>
                    ` : ''}
                    <div class="reward-card">
                        <div class="reward-label">Left Rolls</div>
                        <div class="reward-value">${rollsRemaining}</div>
                    </div>
                    <div class="reward-card">
                        <div class="reward-label">${rollsRemaining} Roll → Cash</div>
                        <div class="reward-value" ${greenStyle}>$${rollsToCash}</div>
                    </div>
                    <div class="reward-card">
                        <div class="reward-label">Round Cash</div>
                        <div class="reward-value" ${greenStyle}>$${baseReward}</div>
                    </div>
                    <div class="reward-card">
                        <div class="reward-label">Interest</div>
                        <div class="reward-value" ${greenStyle}>$${interestReward}</div>
                    </div>
                    <div class="reward-card">
                        <div class="reward-label">Bonus</div>
                        <div class="reward-value" ${greenStyle}>$${cashBonus}</div>
                    </div>
                </div>
                <div class="reward-total">
                    <div class="reward-total-label">Total Cash Gained</div>
                    <div class="reward-total-value" ${greenStyle}>+$${totalReward}</div>
                    <div class="reward-total-sub">Your Cash: <span class="reward-cash" ${greenStyle}>$${totalCash}</span></div>
                </div>
            `;

            footerHtml = `
                <div class="reward-next">
                    ${canAdvance
                        ? `<div class="reward-click-hint">Click anywhere to continue</div>`
                        : `<div class="reward-next-bad">CHIPS NEEDED: <strong>${nextCost}${this.renderChipIcon()}</strong></div>`}
                </div>
            
            `;
        } else {
            // Game Over / End of Run
            title = 'RUN ENDED';
            subtitle = reason || 'You ran out of luck.';
            clickHandler = ''; // No click anywhere for game over
            
            // Get stats from gameState
            const stats = this.gameState.stats || {};
            const timePlayed = this.gameState.getGameTime();
            const history = Array.isArray(this.gameState.itemHistory) ? this.gameState.itemHistory : [];
            
            // Generate Loot Items HTML (Loot Section Style)
            const lootItemsHtml = history.map((item, index) => {
                const rarityClass = (this.inventory && typeof this.inventory.getRarityClass === 'function') 
                    ? this.inventory.getRarityClass(item.tier) 
                    : `rarity-${item.tier}`;

                const allMods = typeof getAllModifications === 'function' ? getAllModifications(item) : [];
                const prefixHtml = ''; 
                
                const nameStyle = typeof getItemNameStyle === 'function' ? getItemNameStyle(item) : {};
                const nameCss = typeof nameStyleToCss === 'function' ? nameStyleToCss(nameStyle) : '';
                
                let fullNameHtml = '';
                if (typeof getModifiedItemNameHtml === 'function') {
                    fullNameHtml += getModifiedItemNameHtml(item);
                } else {
                    const displayName = typeof getModifiedItemName === 'function' ? getModifiedItemName(item) : item.name;
                    const safeName = typeof escapeHtml === 'function' ? escapeHtml(displayName) : displayName;
                    fullNameHtml += safeName;
                }
                
                let legendWrap = '';
                if (['transcendent', 'enigmatic', 'unfathomable', 'otherworldly', 'imaginary', 'zenith'].includes(item.tier)) {
                    legendWrap = ' loot-item-name particle-wrap';
                } else if (['legendary', 'surreal', 'mythic', 'exotic', 'exquisite'].includes(item.tier)) {
                    legendWrap = ' loot-item-name high-tier-wrap';
                }

                // Render Item Card
                return `
                    <div class="loot-item loot-item-minimal ${rarityClass}" data-item-index="${index}">
                        <div class="loot-item-name${legendWrap}"${nameCss}>
                            ${prefixHtml}
                            ${fullNameHtml}
                            ${item.tier === 'zenith' ? '<div class="zenith-question-mark">?</div>' : ''}
                            ${['transcendent', 'enigmatic', 'unfathomable', 'otherworldly', 'imaginary', 'zenith'].includes(item.tier) ? '<div class="particle-container"></div>' : ''}
                        </div>
                        <div class="loot-item-tooltip" aria-hidden="true">
                            <div class="tooltip-name"${nameCss}>${fullNameHtml}</div>
                            <div class="tooltip-rarity rarity-color rarity-${item.tier}">${item.tier ? item.tier.toUpperCase() : 'UNKNOWN'} (1 in ${item.rarityScore || '?'})</div>
                            
                            ${allMods.length > 0 ? `
                                <div class="tooltip-mods-list" style="margin-top:4px; font-size:0.85em; text-align:left;">
                                    ${allMods.map(m => 
                                        typeof getModBadgeHtml === 'function' ? getModBadgeHtml(m) : `<span class="mod-badge" style="color:${m.color || '#fff'}; border: 1px solid ${m.color || '#fff'}; padding: 3px 8px; border-radius: 12px; margin-right: 4px; margin-bottom: 2px; font-size: 0.85em; font-weight: bold; display: inline-block;">${m.name}</span>`
                                    ).join(' ')}
                                </div>
                            ` : ''}
                            
                            <div class="tooltip-value" style="margin-top:8px;"><span style="color: #60a5fa">${item.value}Ȼ</span></div>
                            ${item.baseValue != null && item.baseValue !== item.value && item.priceMultiplier != null ? `<div class="tooltip-base">Base: ${item.baseValue} (×${item.priceMultiplier.toFixed(2)})</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // Container for loot items
            const lootListContainer = `
                <div class="rolled-items-container" style="margin-top: 24px; width: 100%;">
                    <div class="rolled-items-title" style="font-weight: 700; margin-bottom: 12px; text-align: center; font-size: 1.1rem; color: var(--text-muted);">Items Collected (${history.length})</div>
                    <div class="loot-list" id="loot-list">
                        ${lootItemsHtml || '<div class="loot-empty-msg">No items collected</div>'}
                    </div>
                </div>
            `;

            // Perks Section (New)
            const ownedPerks = this.shop.getOwnedPerks();
            const perksHtml = ownedPerks.map(p => {
                const full = typeof getBossPerkById === 'function' ? getBossPerkById(p.id) : null;
                const perk = full || (typeof getPerkById === 'function' ? getPerkById(p.id) : null);
                if (!perk) return '';
                
                const rarity = perk.rarity || 'common';
                const rarityClass = `rarity-${rarity}`;
                const nameStyle = typeof getPerkNameStyle === 'function' ? getPerkNameStyle(perk) : {};
                const nameCss = typeof nameStyleToCss === 'function' ? nameStyleToCss(nameStyle) : '';
                const icon = perk.icon || '📦';
                
                let count = this.gameState.perksPurchased[perk.id];
                if (count === true) count = 1;
                const countBadge = count > 1 ? `<div class="item-count-badge" style="position:absolute; bottom:4px; right:4px; background:rgba(0,0,0,0.8); padding:2px 6px; border-radius:10px; font-size:0.7em; color:#fff;">x${count}</div>` : '';

                return `
                    <div class="loot-item loot-item-minimal ${rarityClass}">
                        <div class="loot-item-name"${nameCss}>
                            ${icon} ${perk.name}
                        </div>
                        ${countBadge}
                        <div class="loot-item-tooltip">
                            <div class="tooltip-name"${nameCss}>${perk.name}</div>
                            <div class="tooltip-rarity rarity-color rarity-${rarity}">${rarity.toUpperCase()}</div>
                            <div class="tooltip-desc">${perk.description || ''}</div>
                            ${perk.special ? `<div class="tooltip-special" style="margin-top:4px; color:#fbbf24; font-size:0.85em;">✨ ${typeof perk.special === 'string' ? perk.special : Object.keys(perk.special).join(', ')}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            const perksListContainer = `
                <div class="rolled-items-container" style="margin-top: 24px; width: 100%;">
                    <div class="rolled-items-title" style="font-weight: 700; margin-bottom: 12px; text-align: center; font-size: 1.1rem; color: var(--text-muted);">Perks Collected (${ownedPerks.length})</div>
                    <div class="loot-list" id="perks-list">
                        ${perksHtml || '<div class="loot-empty-msg">No perks collected</div>'}
                    </div>
                </div>
            `;

            contentHtml = `
                <div class="game-over-quote">"${randomQuote}"</div>
                
                <div class="stats-grid">
                    <div class="stat-row">
                        <span class="stat-label">Total Ȼ Earned</span>
                        <span class="stat-value">${stats.totalChipsEarned || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Total Money Earned</span>
                        <span class="stat-value">$${stats.totalCashEarned || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Items Rolled</span>
                        <span class="stat-value">${stats.totalItemsRolled || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Rolls Used</span>
                        <span class="stat-value">${stats.totalRollsUsed || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Time Played</span>
                        <span class="stat-value">${timePlayed}</span>
                    </div>
                    <div class="stat-row highlight">
                        <span class="stat-label">Max Round</span>
                        <span class="stat-value">${this.gameState.round}</span>
                    </div>
                    <button class="stat-row seed-button" 
                        onclick="game.ui.toggleSeedDisplay(this, '${this.gameState.seedString || this.gameState.seed}')"
                        data-state="hidden"
                        style="grid-column: 1 / -1; width: 100%; cursor: pointer; text-align: left; font-family: inherit; font-size: inherit; justify-content: space-between; align-items: center; display: flex;">
                        <span class="stat-label">Seed</span>
                        <span class="stat-value">Click to Reveal</span>
                    </button>
                </div>
            `;

            // Footer: Button FIRST, then Loot List, then Perks List
            footerHtml = `
                <button class="btn btn-primary btn-restart" onclick="game.handleRestart()">
                    TRY AGAIN
                </button>
                ${lootListContainer}
                ${perksListContainer}
            `;
        }

        const html = `
            <div class="screen reward-screen breakdown-screen ${type}" ${clickHandler} style="${screenStyle}">
                <div class="screen-title">${title}</div>
                <div class="screen-subtitle">${subtitle}</div>
                ${contentHtml}
                ${footerHtml}
            </div>
        `;
        this.container.innerHTML = html;

        if (type === 'game_over') {
            this.attachLootHoverTooltips();
            this.attachHoldToSeeTooltips();
        }

        // Add keyboard and click navigation
        if (type === 'round_complete' && canAdvance) {
            // Remove any existing listeners first to prevent duplicates
            if (this._rewardActionHandler) {
                document.removeEventListener('keydown', this._rewardActionHandler);
                document.removeEventListener('click', this._rewardActionHandler);
                this._rewardActionHandler = null;
            }

            // Define the handler
            this._rewardActionHandler = (e) => {
                // If screen changed, remove listener
                if (this.currentScreen !== 'rewards') {
                    if (this._rewardActionHandler) {
                        document.removeEventListener('keydown', this._rewardActionHandler);
                        document.removeEventListener('click', this._rewardActionHandler);
                        this._rewardActionHandler = null;
                    }
                    return;
                }
                
                // Allow specific keys/interactions
                if (e.type === 'keydown') {
                    // Allow F12, F5 etc
                    if (e.key.startsWith('F') || e.ctrlKey || e.altKey) return;
                }
                
                e.preventDefault();
                if (document.activeElement) document.activeElement.blur();

                // Remove listeners
                if (this._rewardActionHandler) {
                    document.removeEventListener('keydown', this._rewardActionHandler);
                    document.removeEventListener('click', this._rewardActionHandler);
                    this._rewardActionHandler = null;
                }
                
                // Proceed
                if (typeof game !== 'undefined' && game.handleContinueFromRewards) {
                    game.handleContinueFromRewards();
                } else {
                    console.error('Game object or handleContinueFromRewards not found');
                    // Fallback attempt
                    if (window.game && window.game.handleContinueFromRewards) {
                         window.game.handleContinueFromRewards();
                    }
                }
            };
            
            // Small delay to prevent accidental skips if holding keys or double clicking
            setTimeout(() => {
                if (this.currentScreen === 'rewards' && this._rewardActionHandler) {
                    document.addEventListener('keydown', this._rewardActionHandler);
                    document.addEventListener('click', this._rewardActionHandler);
                    
                    // Add direct click handler to container as fallback/primary
                    const screen = this.container.querySelector('.reward-screen');
                    if (screen) {
                         screen.onclick = this._rewardActionHandler;
                    }
                }
            }, 300);
        }
        } catch (error) {
            console.error('Error rendering breakdown screen:', error);
            if (this.container) {
                this.container.innerHTML = `
                    <div class="screen error-screen">
                        <h2>Display Error</h2>
                        <p>${error.message}</p>
                        <button class="btn btn-primary" onclick="game.handleRestart()">Restart</button>
                    </div>
                `;
            }
        }
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
            ? Object.values(THING_TEMPLATES).map((t, i) => {
                const id = `idx-item-${i}`;
                const rarity = t.tier || t.rarity || '';
                const css = t.color ? ` style="color:${escapeAttr(t.color)}"` : '';
                return `
                    <div class="index-entry" data-name="${escapeAttr(t.name)}" data-search="${escapeAttr(`${t.baseValue} ${rarity}`)}">
                        <button type="button" class="index-entry-toggle" data-target="${id}">
                            <span class="index-entry-name"${css}>${t.name}</span>
                            <span class="index-entry-meta">${rarity ? rarity : ''}</span>
                        </button>
                        <div class="index-entry-details" id="${id}" style="display:none">
                            <div class="index-entry-meta">Base value: ${t.baseValue}</div>
                        </div>
                    </div>
                `;
            }).join('')
            : '';
        const perksList = typeof getShopPerks === 'function' ? getShopPerks() : [];
        const bossPerks = (typeof BOSS_EXCLUSIVE_PERKS !== 'undefined' && BOSS_EXCLUSIVE_PERKS) ? Object.values(BOSS_EXCLUSIVE_PERKS) : [];
        const perksHtml = [...perksList, ...bossPerks].map((p, i) => {
            const id = `idx-perk-${i}`;
            const name = (p && p.name) || '';
            const rarity = (p && p.rarity) || '';
            const desc = (p && p.description) || '';
            let specialText = '';
            if (p && p.special) {
                if (typeof p.special === 'string') {
                    specialText = p.special;
                } else if (typeof p.special === 'object') {
                    specialText = Object.keys(p.special).join(', ');
                }
            }
            const special = specialText ? specialText.replace(/_/g, ' ') : '';
            const cost = p && typeof p.cost !== 'undefined' ? p.cost : '';
            return `
                <div class="index-entry" data-name="${escapeAttr(name)}" data-search="${escapeAttr(`${rarity} ${desc} ${special} ${cost}`)}">
                    <button type="button" class="index-entry-toggle" data-target="${id}">
                        <span class="index-entry-name">${escapeHtml(name)}</span>
                        <span class="index-entry-meta">${rarity ? rarity : ''}</span>
                    </button>
                    <div class="index-entry-details" id="${id}" style="display:none">
                        ${cost !== '' ? `<div class="index-entry-meta">Cost: ${cost}$</div>` : ''}
                        ${desc ? `<div class="index-entry-meta">${escapeHtml(desc)}</div>` : ''}
                        ${special ? `<div class="index-entry-meta">✨ ${escapeHtml(special)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        const bossesHtml = typeof BOSSES !== 'undefined' && Array.isArray(BOSSES)
            ? BOSSES.map((b, i) => {
                const id = `idx-boss-${i}`;
                const name = (b && b.name) || '';
                const desc = (b && b.description) || '';
                const round = (b && b.round) || '';
                return `
                    <div class="index-entry index-boss" data-name="${escapeAttr(name)}" data-search="${escapeAttr(`${round} ${desc}`)}">
                        <button type="button" class="index-entry-toggle" data-target="${id}">
                            <span class="index-entry-name">${escapeHtml(name)}</span>
                            <span class="index-entry-meta">Round ${round}</span>
                        </button>
                        <div class="index-entry-details" id="${id}" style="display:none">
                            ${desc ? `<div class="index-entry-meta">${escapeHtml(desc)}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('')
            : '';

        return `
            <div class="index-search-row">
                <input id="index-search" class="index-search" type="text" placeholder="Search items, perks, bosses..." />
            </div>
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

        const timePlayed = this.gameState.getGameTime();
        return `
            <div class="attributes-display">
                <div style="text-align: left; margin-bottom: 10px;">
                    <strong>Your Attributes:</strong>
                </div>
                <div class="attributes-grid">
                    <div class="attribute-card">
                        <div class="attribute-name">Run Time</div>
                        <div class="attribute-value">${timePlayed}</div>
                    </div>
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
     * Show round transition screen
     */
    renderRoundTransition(nextRound) {
        this.currentScreen = 'transition';
        const html = `
            <div class="screen">
                <div class="screen-title">Round ${nextRound}</div>
                <div class="screen-subtitle">New Challenges Await!</div>
                <div class="screen-content">
                    <p>You successfully advanced to the next round.</p>
                    <p>Your attributes are ready to help you!</p>
                </div>
                <button class="btn btn-primary" onclick="game.handleContinueRound()">
                    Begin Round ${nextRound}
                </button>
            </div>
        `;
        this.container.innerHTML = html;
    }
  renderShopScreen() {
        try {
            this.currentScreen = 'shop';
            // Removed automatic generation to prevent rerolling when returning from other screens
            // this.shop.generateShopPerks();
            if (typeof game !== 'undefined' && game.resetRerollCost) {
                game.resetRerollCost();
            }
            
            const displayRound = this.gameState.pendingNextRound || this.gameState.round;
            const rerollCost = (typeof game !== 'undefined') ? game.shopRerollCost : 5;

            const html = `
                <div class="perk-topbar">
                    
                    <div class="topbar-perks" id="topbar-perks">
                        ${this.renderTopbarPerks()}
                    </div>
                    <button class="stats-button" onclick="game.toggleStats()">Stats</button>
                    <button class="index-button" onclick="game.toggleIndex()">Index</button>
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
                    <div class="game-title">Round ${displayRound} Shop</div>
                    ${this.renderHeaderWorldInfo()}
                    <div class="game-stats">
                        <div class="stat-item">
                            <span class="stat-label">Round</span>
                            <span class="stat-value">${displayRound}</span>
                        </div>
                        <div class="stat-item cash-with-tooltip">
                            <span class="stat-label">Cash</span>
                            <div class="cash-tooltip-wrapper">
                                <span class="stat-value stat-cash">$${this.gameState.cash}</span>
                                <div class="interest-tooltip">
                                    <span class="interest-tooltip-text">Interest: ×${this.gameState.interestStacks}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="game-content">


                    <!-- Center: Shop Perks -->
                    <div class="section roll-section" style="overflow-y: auto;">
                        <div class="section-title">Shop Perks</div>
                        <div id="shop-grid" class="perk-card-grid">
                            ${this.renderShop()}
                        </div>
                    </div>

                    <!-- Right: Actions -->
                    <div class="section loot-section">
                        <div class="section-title">Actions</div>
                        <div class="shop-footer-actions" style="display: flex; flex-direction: column; gap: 10px; margin-top: auto; margin-bottom: auto; width: 100%;">
                            <div class="shop-subtitle" style="text-align: center; margin-bottom: 20px; color: var(--text-muted);">Prepare for the next battle</div>
                            <button id="reroll-btn" class="reroll-btn" onclick="game.handleRerollShop()" style="margin-bottom: 10px; width: 100%;">
                                Reroll (<span id="reroll-cost">${rerollCost}</span>$)
                            </button>
                            <button class="btn btn-secondary btn-block" onclick="game.handleOpenForging()" style="padding: 12px; width: 100%;">
                                Forging Chamber
                            </button>
                            <button class="btn btn-primary btn-block start-round-btn" onclick="game.handleStartRound()" style="padding: 16px; font-size: 1.2rem; width: 100%;">
                                Start Round ${displayRound}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            this.container.innerHTML = html;
            
            // Add keyboard navigation
            const handleShopKey = (e) => {
                if (this.currentScreen !== 'shop') {
                    document.removeEventListener('keydown', handleShopKey);
                    return;
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.removeEventListener('keydown', handleShopKey);
                    game.handleStartRound();
                }
            };
            // Remove any existing listener first just in case (though difficult to reference anonymous func)
            // We rely on the screen check to clean up
            document.addEventListener('keydown', handleShopKey);

            this.attachEventListeners();
            setTimeout(() => {
                if (typeof game !== 'undefined' && game.attachTiltEffect) {
                    game.attachTiltEffect();
                }
            }, 100);
        } catch (error) {
            console.error("Error in renderShopScreen:", error);
            this.container.innerHTML = `<div style="padding: 20px; color: red;">Error loading shop: ${error.message}</div>`;
        }
    }
    /**
     * Show shop between rounds
     */
 renderForgingScreen(perkId = null) {
        // Stop any running simulation first
        this.stopForceLayout();

        this.currentScreen = 'forging';
        this.selectedForgePerk = perkId;
        
        // Initialize pan state if not exists
        if (!this.forgePan) {
            this.forgePan = { x: 0, y: 0, isDragging: false, startX: 0, startY: 0 };
        }
        if (this.forgeZoom == null) {
            this.forgeZoom = 1;
        }

        const forgeable = this.gameState.getForgeableOptions ? this.gameState.getForgeableOptions() : [];
        
        // Sort recipes: Tier (Ascending) -> Name (Ascending)
        const tierWeight = {'special': 0, 'common': 1, 'uncommon': 2, 'rare': 3, 'epic':4, 'legendary': 5, 'mythical':6, 'godlike': 7, 'ultimate':8 };
        forgeable.sort((a, b) => {
            const ta = tierWeight[a.tier] || 0;
            const tb = tierWeight[b.tier] || 0;
            if (ta !== tb) return ta - tb;
            return a.name.localeCompare(b.name);
        });
        
        // --- Sidebar: Recipe List ---
        const sidebarHtml = forgeable.map(option => {
            const isSelected = option.id === this.selectedForgePerk;
            const canForge = option.canForge;
            // Description
            const desc = typeof escapeHtml === 'function' ? escapeHtml(option.description) : option.description;
            
            // Use icon from perk definition
            const icon = this.getPerkIcon(option);
            const rarity = option.tier || 'common';
            const rarityClass = `rarity-${rarity}`;
            
            let nameStyleStr = '';
            if (option.nameStyle) {
                if (option.nameStyle.color) nameStyleStr += `color: ${option.nameStyle.color};`;
                if (option.nameStyle.textStroke) nameStyleStr += `-webkit-text-stroke: ${option.nameStyle.textStroke};`;
            }
            
            // Perk Card Style for Sidebar (mimics shop cards)
            const isHighTier = ['legendary', 'mythical', 'godlike', 'ultimate'].includes(rarity);
            
            return `
                    <div class="perk-card perk-card-shop perk-card-forge ${rarityClass} ${isSelected ? 'perk-selected' : ''}" 
                         onclick="game.handleForgeSelect('${option.id}')"
                         title="${desc}">
                        ${isHighTier ? `
                            <div class="perk-card-particles">
                                <span></span><span></span><span></span>
                            </div>
                        ` : ''}
                        <div class="perk-rarity-badge">${rarity.toUpperCase()}</div>
                        <div class="perk-card-art">
                            <div class="perk-card-icon">${icon}</div>
                        </div>
                        <div class="perk-card-info">
                            <div class="perk-card-name" style="${nameStyleStr}">${option.name}</div>
                            <div class="perk-card-footer">
                                 <div class="forge-status-text" style="color: #9898a8; font-size: 0.75em; width: 100%; white-space: normal; line-height: 1.2;">
                                    ${desc}
                                 </div>
                            </div>
                        </div>
                        ${canForge ? '<div class="forge-ready-overlay"></div>' : ''}
                    </div>
                `;
            }).join('');

        // --- Main Area: Tree View ---
        let mainContentHtml = '';
        let forgeActionHtml = '';
        
        if (this.selectedForgePerk) {
            mainContentHtml = this.renderForgeTree(this.selectedForgePerk);
            
            // Floating Forge Action Button
            const perk = typeof getPerkById === 'function' ? getPerkById(this.selectedForgePerk) : null;
            if (perk) {
                const canForge = this.gameState.canForgePerk(this.selectedForgePerk).canForge;
                const reason = this.gameState.canForgePerk(this.selectedForgePerk).reason;
                
                forgeActionHtml = `
                    <div class="forge-action-container">
                        <button class="forge-btn-modern ${canForge ? 'ready' : 'locked'}" 
                            onclick="game.handleForgePerk('${this.selectedForgePerk}')" 
                            ${canForge ? '' : 'disabled'}>
                            <span class="btn-text">Forge</span>
                        </button>
                        ${!canForge && reason ? `<div class="forge-reason-pill">${reason}</div>` : ''}
                    </div>
                `;
            }
        } else {
            mainContentHtml = `
                <div class="forge-empty-state">
                    <div style="font-size: 4em; margin-bottom: 20px; opacity: 0.5;">⚒️</div>
                    <div style="font-size: 1.2em; color: var(--text-muted);">Select a recipe from the left to view details</div>
                </div>
            `;
        }

        const html = `
            <div class="perk-topbar">

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
                <div class="game-title">Forging Chamber</div>
                <div class="game-stats">
                    <div class="stat-item cash-with-tooltip">
                        <span class="stat-label">Cash</span>
                        <div class="cash-tooltip-wrapper">
                            <span class="stat-value stat-cash">${this.gameState.cash}$</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="game-content forge-screen-content">
                <div class="forge-grid-bg"></div>
                <div class="section forge-sidebar-section">
                    <div class="section-title">Recipes</div>
                    <div class="forge-sidebar-list">
                        ${sidebarHtml || '<div style="padding:20px; text-align:center; color:gray;">No recipes available</div>'}
                    </div>
                    <button class="btn btn-secondary" onclick="game.handleReturnToShop()" style="margin-top: 15px; width: 100%;">
                        ← Back to Shop
                    </button>
                </div>
                <div class="section forge-main-section" id="forge-viewport">
                    <div class="forge-particles"></div>
                    
                    <!-- Controls Overlay -->
                    <div class="forge-overlay-controls">
                        <!-- Top Left: Forge Action -->
                        <div class="control-group-left">
                            ${forgeActionHtml}
                        </div>
                        
                        <!-- Top Right: View Controls -->
                        <div class="control-group-right">
                            <button class="btn-icon forge-reset-btn" id="btn-reset-view" title="Reset View">
                                ⟲ Reset
                            </button>
                        </div>
                    </div>

                    <div class="forge-content-layer" id="forge-content" style="transform: translate(${this.forgePan.x}px, ${this.forgePan.y}px) scale(${this.forgeZoom});">
                        ${mainContentHtml}
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        this.attachEventListeners();
        this._injectForgeStyles();
        this.setupForgeInteractions();
    }

    setupForgeInteractions() {
        const viewport = document.getElementById('forge-viewport');
        const content = document.getElementById('forge-content');
        const resetBtn = document.getElementById('btn-reset-view');
        
        if (!viewport || !content) return;
        
        const computeCenterPan = () => {
            const container = document.getElementById('forge-graph-container');
            const vRect = viewport.getBoundingClientRect();
            const cRect = container ? container.getBoundingClientRect() : { width: vRect.width, height: vRect.height };
            const x = Math.round((vRect.width - cRect.width) / 2);
            const y = Math.round((vRect.height - cRect.height) / 2);
            return { x, y };
        };
        
        if (!this._forgeInitialized) {
            const center = computeCenterPan();
            this.forgePan.x = center.x;
            this.forgePan.y = center.y;
            content.style.transform = `translate(${this.forgePan.x}px, ${this.forgePan.y}px) scale(${this.forgeZoom || 1})`;
            this._forgeInitialized = true;
        }

        // Reset Handler
        if (resetBtn) {
            resetBtn.onclick = (e) => {
                e.stopPropagation();
                const center = computeCenterPan();
                this.forgePan.x = center.x;
                this.forgePan.y = center.y;
                this.forgeZoom = 1;
                // Add transition class for smooth reset
                content.classList.add('animate-reset');
                content.style.transform = `translate(${this.forgePan.x}px, ${this.forgePan.y}px) scale(${this.forgeZoom})`;
                
                if (this.currentGraphData && this.currentGraphData.nodes) {
                    this.currentGraphData.nodes.forEach(n => {
                        n.x = undefined;
                        n.y = undefined;
                        n.vx = 0;
                        n.vy = 0;
                        n.isDragging = false;
                    });
                    this.stopForceLayout();
                    this.initForceLayout();
                }
                
                // Remove class after animation
                setTimeout(() => {
                    content.classList.remove('animate-reset');
                }, 300);
            };
        }

        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            const min = 0.5;
            const max = 2.5;
            this.forgeZoom = Math.max(min, Math.min(max, this.forgeZoom * factor));
            content.style.transform = `translate(${this.forgePan.x}px, ${this.forgePan.y}px) scale(${this.forgeZoom})`;
        });

        // Drag Handlers
        viewport.addEventListener('mousedown', (e) => {
            // 1. Check for Graph Node Dragging first
            let target = e.target;
            let nodeElement = null;
            
            // Traverse up to find potential targets
            let current = target;
            while (current && current !== viewport) {
                if (current.id && current.id.startsWith('node-') && current.classList.contains('forge-graph-node')) {
                    nodeElement = current;
                    break;
                }
                current = current.parentElement;
            }

            if (nodeElement) {
                // Start Node Drag
                e.preventDefault();
                e.stopPropagation();
                
                const nodeId = nodeElement.id.replace('node-', '');
                if (this.currentGraphData && this.currentGraphData.nodes) {
                    const node = this.currentGraphData.nodes.find(n => n.id.toString() === nodeId);
                    if (node) {
                        this.draggedGraphNode = node;
                        node.isDragging = true;
                        node.vx = 0; node.vy = 0;
                        viewport.style.cursor = 'grabbing';
                        return; // Stop here, don't start pan
                    }
                }
            }

            // 2. Check if we should block panning (buttons, non-graph cards)
            // Only drag if clicking background or content wrapper, not buttons/cards directly
            target = e.target;
            while (target && target !== viewport) {
                if (target.tagName === 'BUTTON' || target.classList.contains('perk-card-tree')) {
                    // Note: Graph nodes have perk-card-tree inside, but we handled them above.
                    // If we are here, it means we clicked a card that is NOT inside a graph node (unlikely in this view but possible if mixed)
                    // Or we clicked a button.
                    // To be safe, if we didn't match nodeElement above, we block pan on these.
                    return;
                }
                target = target.parentElement;
            }
            
            e.preventDefault(); // Prevent text selection
            this.forgePan.isDragging = true;
            this.forgePan.startX = e.clientX - this.forgePan.x;
            this.forgePan.startY = e.clientY - this.forgePan.y;
            viewport.style.cursor = 'grabbing';
            content.classList.remove('animate-reset'); // Stop any reset animation
        });

        // Global listeners should only be attached once
        if (!this._forgeListenersAttached) {
            this._forgeListenersAttached = true;
            
            // Mouse Over/Out for Highlighting (Tooltip handled by global listeners)
            window.addEventListener('mouseover', (e) => {
                // Find closest node wrapper
                const wrapper = e.target.closest('.forge-graph-node');
                
                if (wrapper) {
                    // Highlight Connections
                    const nodeId = wrapper.id.replace('node-', '');
                    wrapper.classList.add('highlight-node');
                    
                    // Highlight Links and Neighbors
                    const svg = document.getElementById('forge-graph-svg');
                    if (svg) {
                        const links = svg.querySelectorAll('.forge-link');
                        links.forEach(link => {
                            const source = link.getAttribute('data-source');
                            const targetId = link.getAttribute('data-target');
                            
                            if (source === nodeId || targetId === nodeId) {
                                link.classList.add('highlight-link');
                                // Styles handled by CSS class now
                                
                                // Highlight connected node
                                const otherId = source === nodeId ? targetId : source;
                                const otherNode = document.getElementById(`node-${otherId}`);
                                if (otherNode) otherNode.classList.add('highlight-node');
                            } else {
                                link.classList.add('dimmed-link');
                            }
                        });
                    }
                }
            });
            
            window.addEventListener('mouseout', (e) => {
                // Check if we really left the node
                const wrapper = e.target.closest('.forge-graph-node');
                if (wrapper) {
                     if (e.relatedTarget && wrapper.contains(e.relatedTarget)) return;
                     
                     // Remove highlights
                     const allNodes = document.querySelectorAll('.forge-graph-node');
                     allNodes.forEach(n => n.classList.remove('highlight-node'));
                     
                     const svg = document.getElementById('forge-graph-svg');
                     if (svg) {
                         const links = svg.querySelectorAll('.forge-link');
                         links.forEach(link => {
                             link.classList.remove('highlight-link');
                             link.classList.remove('dimmed-link');
                         });
                     }
                }
            });

            window.addEventListener('mousemove', (e) => {
                e.preventDefault();
                
                // Update Tooltip Position
                const tooltip = document.getElementById('forge-floating-tooltip');
                if (tooltip && tooltip.style.opacity === '1') {
                    // Position slightly offset from mouse
                    const offset = 15;
                    let x = e.clientX + offset;
                    let y = e.clientY + offset;
                    
                    // Boundary check (simple)
                    if (x + 250 > window.innerWidth) x = e.clientX - 265;
                    if (y + 100 > window.innerHeight) y = e.clientY - 115;
                    
                    tooltip.style.transform = `translate(${x}px, ${y}px)`;
                }

                // Handle Graph Node Drag
                if (this.draggedGraphNode) {
                     const container = document.getElementById('forge-graph-container');
                     if (container) {
                         const rect = container.getBoundingClientRect();
                         // Update node position relative to container
                         this.draggedGraphNode.x = e.clientX - rect.left;
                         this.draggedGraphNode.y = e.clientY - rect.top;
                         this.draggedGraphNode.vx = 0;
                         this.draggedGraphNode.vy = 0;
                         
                         if (!this.isSimulating) {
                             this.updateGraphDOM(); 
                         }
                     }
                     return;
                }
                
                // Handle Viewport Pan
                if (!this.forgePan || !this.forgePan.isDragging) return;
                
                this.forgePan.x = e.clientX - this.forgePan.startX;
                this.forgePan.y = e.clientY - this.forgePan.startY;
                
                // We need to re-query content because it might have been re-rendered
                const currentContent = document.getElementById('forge-content');
                if (currentContent) {
                    currentContent.style.transform = `translate(${this.forgePan.x}px, ${this.forgePan.y}px) scale(${this.forgeZoom})`;
                }
            });

            window.addEventListener('mouseup', () => {
                // Stop Graph Node Drag
                if (this.draggedGraphNode) {
                    this.draggedGraphNode.isDragging = false;
                    this.draggedGraphNode = null;
                }

                // Stop Viewport Pan
                if (this.forgePan && this.forgePan.isDragging) {
                    this.forgePan.isDragging = false;
                    const currentViewport = document.getElementById('forge-viewport');
                    if (currentViewport) {
                        currentViewport.style.cursor = 'grab';
                    }
                }
            });
        }
    }

    stopForceLayout() {
        this.isSimulating = false;
        // Also clear any dragged node state
        this.draggedGraphNode = null;
        if (this.forgePan) {
            this.forgePan.isDragging = false;
        }
    }

    renderForgeTree(perkId) {
        // Force-Directed Graph Builder
        
        // 1. Build Graph Data (Nodes & Links)
        const nodes = [];
        const links = [];
        const addedNodeIds = new Set();

        const addNode = (id, type = 'perk', parentId = null) => {
            if (addedNodeIds.has(id)) {
                // Link even if already added
                if (parentId) links.push({ source: parentId, target: id });
                return;
            }
            
            // Logic to get perk/data
            let data = {};
            if (type === 'perk') {
                const perk = typeof getPerkById === 'function' ? getPerkById(id) : null;
                if (!perk) return;
                data = perk;
            } else if (type === 'cash') {
                data = { id: 'cash-' + parentId, name: 'Cash', amount: id }; // id passed as amount
            }

            // Create Node Object
            const node = {
                id: type === 'cash' ? data.id : id,
                type: type,
                data: data,
                x: 0, y: 0, vx: 0, vy: 0 // Physics placeholders
            };
            
            nodes.push(node);
            addedNodeIds.add(node.id);
            
            if (parentId) {
                links.push({ source: parentId, target: node.id });
            }
            
            // Recursively add children
            if (type === 'perk') {
                const perk = data;
                const recipe = perk.forgeRecipe;
                
                // 1. Recipe Perks
                if (recipe && Array.isArray(recipe.perks)) {
                    recipe.perks.forEach(reqId => addNode(reqId, 'perk', node.id));
                }
                
                // 2. Recipe Cash
                if (recipe && recipe.cash) {
                    addNode(recipe.cash, 'cash', node.id);
                }
                
                // 3. Fallback: Conditions
                if (!recipe && perk.conditions) {
                     const forgeCondition = perk.conditions.find(c => c.type === 'forging');
                     if (forgeCondition && forgeCondition.recipe) {
                        const r = forgeCondition.recipe;
                        const pList = Array.isArray(r) ? r : (r.perks || []);
                        const cAmt = r.cash || (forgeCondition.cash);
                        
                        pList.forEach(reqId => addNode(reqId, 'perk', node.id));
                        if (cAmt) addNode(cAmt, 'cash', node.id);
                     }
                }
            }
        };
        
        // Start building from root
        addNode(perkId);
        
        this.currentGraphData = { nodes, links };
        
        // Render Initial HTML (Nodes only, links via SVG)
        const nodesHtml = nodes.map(node => {
            const isTarget = node.id === perkId;
            let innerHtml = '';
            let tooltipHtml = '';
            
            if (node.type === 'cash') {
                const amount = node.data.amount;
                const hasCash = this.gameState.cash >= amount;
                
                // Cash Node - Horizontal Pill Style
                innerHtml = `
                    <div class="perk-square-node ${hasCash ? 'status-owned' : 'status-missing'}" style="width: 160px; height: 60px; background: #222; border: 2px solid ${hasCash ? '#4ade80' : '#ef4444'}; border-radius: 8px; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; padding: 5px 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.5); text-align: left;">
                        <div style="font-size: 2em; margin-right: 10px;">💵</div>
                        <div class="perk-name" style="color: #4ade80; font-size: 0.9em; font-weight: bold; line-height: 1.1;">$${amount}</div>
                        <div class="node-tooltip-content" style="display: none;">
                            <div class="tooltip-header"><span class="tooltip-name" style="color: #4ade80;">$${amount}</span></div>
                            <div class="tooltip-desc">Required Cash</div>
                            <div class="tooltip-status ${hasCash ? 'req-met' : 'req-missing'}">${hasCash ? 'AVAILABLE' : 'MISSING'}</div>
                        </div>
                    </div>
                `;
            } else {
                const perk = node.data;
                const isOwned = (this.gameState.perksPurchased[perk.id] || 0) > 0;
                const icon = this.getPerkIcon(perk);
                const rarityClass = perk.tier ? `rarity-${perk.tier}` : 'rarity-common';
                const desc = typeof escapeHtml === 'function' ? escapeHtml(perk.description) : perk.description;
                const rarityLabel = perk.tier ? perk.tier.toUpperCase() : 'COMMON';
                const canForge = isTarget ? this.gameState.canForgePerk(perk.id).canForge : false;
                
                // Status class logic
                let statusClass = 'status-pending';
                if (isOwned) statusClass = 'status-owned';
                else if (isTarget && canForge) statusClass = 'status-ready';
                else if (!isTarget && !isOwned) statusClass = 'status-missing';

                // Tooltip HTML (stored for mouse-following)
                tooltipHtml = `
                    <div class="tooltip-header">
                         <span class="tooltip-name" style="${perk.nameStyle?.color ? 'color:'+perk.nameStyle.color : ''}">${perk.name}</span>
                    </div>
                    <div class="tooltip-rarity ${rarityClass}">${rarityLabel}</div>
                    <div class="tooltip-desc">${desc}</div>
                    <div class="tooltip-status ${isOwned ? 'req-met' : 'req-missing'}">
                        ${isOwned ? 'OWNED' : 'MISSING'}
                    </div>
                `;
                
                if (isTarget) {
                    // Target Node - Exact Shop Card Style
                    const specialText = perk.special ? (typeof perk.special === 'string' ? perk.special : Object.keys(perk.special).join(', ')) : '';
                    const isLegendary = ['legendary', 'mythic', 'godlike', 'ultimate', 'surreal', 'exotic'].includes(perk.tier || 'common');
                    const isMythical = (perk.tier || 'common') === 'mythical';
                    const nameStyle = perk.nameStyle || {};
                    const nameCss = nameStyle.color ? ` style="color:${nameStyle.color}"` : '';
                    
                    if (isMythical) {
                        // Mythical Shop Card Style (Vertical Rectangle) with Opaque Background
                        innerHtml = `
                            <div class="perk-card perk-card-shop perk-tooltip-anchor rarity-${perk.tier || 'common'} ${statusClass}" 
                                 data-perk-id="${perk.id}" 
                                 data-perk-name="${escapeAttr(perk.name)}" 
                                 data-perk-rarity="${escapeAttr(rarityLabel)}" 
                                 data-perk-desc="${escapeAttr(desc)}" 
                                 data-perk-special="${escapeAttr(specialText)}"
                                 style="width: 180px; height: 240px; position: relative; background: #2a0a2a; border: 2px solid #a855f7; z-index: 10;">
                                
                                <div class="perk-card-particles">
                                    <span></span><span></span><span></span>
                                </div>
                                
                                <div class="perk-rarity-badge">${rarityLabel}</div>
                                <div class="perk-card-art">
                                    <div class="perk-card-icon">${icon}</div>
                                </div>
                                <div class="perk-card-info">
                                    <div class="perk-card-name"${nameCss}>${perk.name}</div>
                                    <div class="perk-card-footer">
                                        <!-- Removed FORGE text -->
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        // Standard Shop Card Style
                        innerHtml = `
                            <div class="perk-card perk-card-shop perk-tooltip-anchor rarity-${perk.tier || 'common'} ${statusClass}" 
                                 data-perk-id="${perk.id}" 
                                 data-perk-name="${escapeAttr(perk.name)}" 
                                 data-perk-rarity="${escapeAttr(rarityLabel)}" 
                                 data-perk-desc="${escapeAttr(desc)}" 
                                 data-perk-special="${escapeAttr(specialText)}"
                                 style="width: 180px; height: 240px; position: relative;">
                                
                                ${isLegendary ? `
                                    <div class="perk-card-particles">
                                        <span></span><span></span><span></span>
                                    </div>
                                ` : ''}
                                
                                <div class="perk-rarity-badge">${rarityLabel}</div>
                                <div class="perk-card-art">
                                    <div class="perk-card-icon">${icon}</div>
                                </div>
                                <div class="perk-card-info">
                                    <div class="perk-card-name"${nameCss}>${perk.name}</div>
                                    <div class="perk-card-footer">
                                        <!-- Removed FORGE text -->
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    // Ingredient Node - Horizontal Pill Style with Name + Tooltip Anchor
                    const specialText = perk.special ? (typeof perk.special === 'string' ? perk.special : Object.keys(perk.special).join(', ')) : '';
                    const borderColor = isOwned ? '#4ade80' : '#ef4444';
                    
                    innerHtml = `
                        <div class="perk-square-node perk-tooltip-anchor ${rarityClass} ${statusClass}" 
                             data-perk-id="${perk.id}" 
                             data-perk-name="${escapeAttr(perk.name)}" 
                             data-perk-rarity="${escapeAttr(rarityLabel)}" 
                             data-perk-desc="${escapeAttr(desc)}" 
                             data-perk-special="${escapeAttr(specialText)}"
                             style="width: 160px; height: 60px; background: #1a1a1a; border: 2px solid ${borderColor}; border-radius: 8px; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; padding: 5px 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.6); position: relative; text-align: left;">
                            <div class="perk-icon" style="font-size: 2em; margin-right: 10px; flex-shrink: 0;">${icon}</div>
                            <div class="perk-name" style="${perk.nameStyle?.color ? 'color:'+perk.nameStyle.color : 'color: #ffffff'}; font-size: 0.8em; font-weight: bold; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; width: 100%;">${perk.name}</div>
                        </div>
                    `;
                }
            }
            
            return `
                <div class="forge-graph-node" id="node-${node.id}" style="position: absolute; transform: translate(-50%, -50%); z-index: 10;">
                    ${innerHtml}
                </div>
            `;
        }).join('');

        // Trigger simulation
        setTimeout(() => this.initForceLayout(), 0);

        return `
            <div class="forge-graph-container" id="forge-graph-container" style="position: relative; width: clamp(15000px, 500vw, 120000px); height: clamp(15000px, 500vh, 120000px);">
                <svg class="forge-connections-svg" id="forge-graph-svg" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;"></svg>
                ${nodesHtml}
                <div id="forge-floating-tooltip" class="ingredient-tooltip" style="position: fixed; pointer-events: none; opacity: 0; z-index: 9999; transform: translate(15px, 15px); transition: opacity 0.1s; max-width: 250px;"></div>
            </div>
        `;
    }

    initForceLayout() {
        if (this.isSimulating) return;
        this.isSimulating = true;
        
        const { nodes, links } = this.currentGraphData;
        const containerEl = document.getElementById('forge-graph-container');
        const rect = containerEl ? containerEl.getBoundingClientRect() : { width: 1000, height: 700 };
        const width = rect.width; 
        const height = rect.height; 
        
        // Initial positions
        nodes.forEach((node, i) => {
            if (!node.x) {
                const angle = i * 0.6;
                const base = Math.min(width, height) * 0.35;
                const radius = base + 45 * i;
                node.x = width/2 + Math.cos(angle) * radius;
                node.y = height/2 + Math.sin(angle) * radius;
                node.vx = 0; node.vy = 0;
            }
        });
        const rootId = this.selectedForgePerk;
        const root = nodes.find(n => n.id === rootId);
        if (root) {
            root.x = width / 2;
            root.y = height / 2;
            root.vx = 0;
            root.vy = 0;
        }
        
        // Center initial camera on the crafting card
        if (!this._centeredOnRoot) {
            const viewport = document.getElementById('forge-viewport');
            const content = document.getElementById('forge-content');
            if (viewport && content) {
                const vRect = viewport.getBoundingClientRect();
                const targetX = Math.round((vRect.width / 2) - (root ? root.x : width / 2));
                const targetY = Math.round((vRect.height / 2) - (root ? root.y : height / 2));
                this.forgePan.x = targetX;
                this.forgePan.y = targetY;
                this.forgeZoom = this.forgeZoom || 1;
                content.style.transform = `translate(${this.forgePan.x}px, ${this.forgePan.y}px) scale(${this.forgeZoom})`;
                this._centeredOnRoot = true;
            }
        }

        // Tuned for MAX SPREAD and FLOATINESS
        const repulsion = 44000;      // Very strong push
        const springLength = 560;     // Longer connections to extend line reach
        const springStrength = 0.03;  // Loose springs
        const centerGravity = 0.0005; // Almost zero gravity
        const damping = 0.92;         // High damping for drift
        
        const tick = () => {
            const svg = document.getElementById('forge-graph-svg');
            if (!svg) {
                this.isSimulating = false;
                return;
            }
            
            // Physics
            // Repulsion
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    let d2 = dx*dx + dy*dy;
                    if (d2 === 0) { d2 = 0.1; }
                    const d = Math.sqrt(d2);
                    const f = repulsion / d2;
                    const fx = (dx/d)*f;
                    const fy = (dy/d)*f;
                    
                    if (!a.isDragging) { a.vx += fx; a.vy += fy; }
                    if (!b.isDragging) { b.vx -= fx; b.vy -= fy; }
                }
            }
            // Springs
            links.forEach(link => {
                const s = nodes.find(n => n.id === link.source);
                const t = nodes.find(n => n.id === link.target);
                if (!s || !t) return;
                const dx = t.x - s.x;
                const dy = t.y - s.y;
                const d = Math.sqrt(dx*dx + dy*dy);
                const f = (d - springLength) * springStrength;
                const fx = (dx/d)*f;
                const fy = (dy/d)*f;
                
                if (!s.isDragging) { s.vx += fx; s.vy += fy; }
                if (!t.isDragging) { t.vx -= fx; t.vy -= fy; }
            });

            // Collision Detection
            // Assume typical card size ~180x240, so radius approx 120 or check rect overlap
            // Simple circular collision for smooth physics
            const collisionRadius = 150; // Enough to keep cards from overlapping too much
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    let d2 = dx*dx + dy*dy;
                    if (d2 === 0) { d2 = 0.1; }
                    const d = Math.sqrt(d2);
                    
                    if (d < collisionRadius) {
                        const overlap = collisionRadius - d;
                        const force = overlap * 0.05; // Soft collision
                        const fx = (dx/d) * force;
                        const fy = (dy/d) * force;
                        
                        if (!a.isDragging) { a.vx += fx; a.vy += fy; }
                        if (!b.isDragging) { b.vx -= fx; b.vy -= fy; }
                    }
                }
            }

            // Gravity
            nodes.forEach(n => {
                if (n.isDragging) return;
                n.vx += (width/2 - n.x) * centerGravity;
                n.vy += (height/2 - n.y) * centerGravity;
                n.vx *= damping;
                n.vy *= damping;
                n.x += n.vx;
                n.y += n.vy;
                
            });
            
            this.updateGraphDOM();
            
            if (this.isSimulating) requestAnimationFrame(tick);
        };
        tick();
    }

    updateGraphDOM() {
        const { nodes, links } = this.currentGraphData

        const svg = document.getElementById('forge-graph-svg');
        if (!svg) return;
        
        // Update Links
            let linesHtml = '';
            links.forEach(link => {
                const s = nodes.find(n => n.id === link.source);
                const t = nodes.find(n => n.id === link.target);
                if (s && t) {
                    linesHtml += `<line class="forge-link" data-source="${s.id}" data-target="${t.id}" x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="rgba(255,255,255,0.25)" stroke-width="4" stroke-linecap="round" />`;
                }
            });
            svg.innerHTML = linesHtml;
        
        // Update Nodes
        nodes.forEach(node => {
            const el = document.getElementById(`node-${node.id}`);
            if (el) {
                el.style.left = `${node.x}px`;
                el.style.top = `${node.y}px`;
            }
        });
    }

    _injectForgeStyles() {
        if (document.getElementById('new-forging-styles')) return;
        const style = document.createElement('style');
        style.id = 'new-forging-styles';
        style.textContent = `
            /* Forge Screen Layout Override */
            .forge-screen-content {
                display: flex !important; /* Override grid */
                flex-direction: row;
                gap: 20px;
                align-items: stretch !important; /* Full height */
                position: relative;
            }

            /* Full Screen Grid Background */
            .forge-grid-bg {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-image:
                    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                background-size: 50px 50px;
                pointer-events: none;
                z-index: 0;
            }

            /* Sidebar Section */
            .forge-sidebar-section {
                width: 420px;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                z-index: 1; /* Above grid */
                background: var(--bg-section, #111); /* Ensure opacity */
            }
            
            .forge-sidebar-list {
                flex: 1;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 10px; /* Spacing between cards */
                padding-right: 5px;
                margin-top: 10px;
            }

            /* Main Section */
            .forge-main-section {
                flex: 1;
                padding: 0;
                background: #111;
                overflow: hidden !important; /* Ensure content doesn't spill */
                position: relative;
                z-index: 1; /* Above grid */
                display: flex;
                flex-direction: column;
                cursor: grab; /* Pan cursor */
                min-height: calc(210vh); /* Larger viewport for graph */
            }
            .forge-main-section:active {
                cursor: grabbing;
            }
            
            .forge-content-layer {
                position: relative;
                z-index: 2;
                flex: 1; /* Fill main section */
                padding: 40px;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                transform-origin: center top;
            }
            .forge-content-layer.animate-reset {
                transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            
            /* Controls Overlay */
            .forge-overlay-controls {
                position: absolute;
                inset: 0;
                pointer-events: none;
                z-index: 100;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 20px;
            }
            .control-group-left, .control-group-right {
                pointer-events: auto;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            /* Modern Reset Button */
            .forge-reset-btn {
                background: rgba(20, 20, 20, 0.6);
                backdrop-filter: blur(8px);
                color: #ccc;
                border: 1px solid rgba(255, 255, 255, 0.1);
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: inherit;
                font-size: 0.9em;
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .forge-reset-btn:hover {
                background: rgba(40, 40, 40, 0.8);
                color: #fff;
                border-color: rgba(255, 255, 255, 0.3);
                transform: translateY(-1px);
                box-shadow: 0 6px 12px rgba(0,0,0,0.2);
            }

            /* Modern Forge Action Button */
            .forge-action-container {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            .forge-btn-modern {
                background: rgba(251, 191, 36, 0.1); /* Gold tint */
                backdrop-filter: blur(8px);
                color: #fbbf24;
                border: 1px solid rgba(251, 191, 36, 0.3);
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: inherit;
                font-size: 1em;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(251, 191, 36, 0.1);
            }
            .forge-btn-modern:hover {
                background: rgba(251, 191, 36, 0.2);
                border-color: rgba(251, 191, 36, 0.6);
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(251, 191, 36, 0.2);
            }
            .forge-btn-modern.locked {
                background: rgba(30, 30, 30, 0.8);
                color: #666;
                border-color: #444;
                cursor: not-allowed;
                box-shadow: none;
            }
            .forge-btn-modern.locked:hover {
                transform: none;
            }
            .forge-reason-pill {
                font-size: 0.8em;
                color: #ef4444;
                background: rgba(20, 20, 20, 0.9);
                padding: 6px 10px;
                border-radius: 6px;
                border: 1px solid rgba(239, 68, 68, 0.3);
                max-width: 250px;
            }

            /* Horizontal Card Layout for Sidebar */
            .perk-card-forge {
                width: 100% !important; 
                min-height: 90px;
                height: auto !important;
                margin: 0;
                flex-shrink: 0;
                flex-direction: row !important;
                align-items: stretch !important;
                padding: 0 !important;
                position: relative;
                transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            
            .perk-card-forge:hover {
                transform: scale(0.95);
                z-index: 10;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            }
            
            .perk-card-forge.perk-selected {
                border-color: #fff;
                box-shadow: 0 0 0 2px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.5);
                transform: scale(0.95);
            }
            
            /* Graph Node Fixes */
            .forge-graph-node {
                opacity: 1 !important; /* Disable transparency */
                transition: transform 0.2s ease, opacity 0.2s ease;
            }
            
            /* Ensure opaque backgrounds for cards in tree */
            .perk-card-tree {
                background-color: #151515 !important;
                backdrop-filter: none !important;
            }
            
            /* Highlight State */
            .highlight-node {
                z-index: 20 !important;
                transform: translate(-50%, -50%) scale(1.1) !important;
                filter: brightness(1.2);
            }
            
            /* Simple Circle Node Hover */
            .perk-circle-node {
                transition: box-shadow 0.2s, border-color 0.2s;
            }
            .perk-circle-node:hover {
                box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
                border-color: #fff !important;
            }

            /* Square Node Styling */
            .perk-square-node {
                transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
                border-radius: 4px; /* Slight rounded corners for squares */
            }
            .perk-square-node:hover {
                box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
                border-color: #fff !important;
                transform: scale(1.05);
                z-index: 15;
            }
            
            /* Link Highlight */
            .forge-link {
                transition: stroke 0.15s, stroke-width 0.15s, opacity 0.15s;
            }
            .highlight-link {
                stroke: rgba(255, 255, 255, 1) !important;
                filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.95));
                stroke-width: 8px !important;
                z-index: 5;
            }
            .dimmed-link {
                opacity: 0.1 !important;
                stroke-width: 3px !important;

                stroke: rgba(255, 255, 255, 1) !important;
            }
            
            .perk-card-forge .perk-card-art {
                width: 80px;
                height: auto !important; /* Allow it to stretch */
                flex-shrink: 0;
                border-bottom: none !important;
                border-right: 1px solid rgba(255,255,255,0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.2);
            }
            
            .perk-card-forge .perk-card-icon {
                font-size: 2.5em !important;
                transform: none !important;
            }
            
            .perk-card-forge .perk-card-info {
                flex: 1;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding: 8px 12px !important;
                align-items: flex-start !important;
                min-width: 0; /* Fix flex text overflow */
            }

            .perk-card-forge .perk-card-name {
                font-size: 0.9em !important;
                margin-bottom: 4px;
                text-align: left !important;
                width: 100%;
                white-space: normal;
                overflow: visible;
                padding-right: 60px;
                line-height: 1.2;
            }

            .perk-card-forge .perk-card-footer {
                margin-top: 0 !important;
                width: 100%;
            }

            .perk-card-forge .perk-rarity-badge {
                font-size: 0.6em !important;
                padding: 2px 6px !important;
                top: 4px !important;
                right: 4px !important;
                left: auto !important;
            }

            .forge-status-text {
                text-align: left !important;
                font-size: 0.75em !important;
            }
            
            .forge-ready-overlay {
                position: absolute;
                inset: 0;
                border: 2px solid #4ade80;
                border-radius: 16px;
                pointer-events: none;
                box-shadow: inset 0 0 20px rgba(74, 222, 128, 0.2);
                animation: pulse-ready 2s infinite;
                z-index: 5;
            }
            
            @keyframes pulse-ready {
                0% { opacity: 0.5; }
                50% { opacity: 1; }
                100% { opacity: 0.5; }
            }

            /* Particles (keep existing) */
            .forge-particles {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 0; /* Behind content layer */
                background: radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.05) 0%, transparent 60%);
                animation: pulse-glow 8s infinite alternate;
            }
            .forge-particles::before {
                content: '';
                position: absolute;
                width: 100%;
                height: 100%;
                background-image: radial-gradient(#fff 1px, transparent 1px);
                background-size: 60px 60px;
                opacity: 0.1;
                animation: float-particles 20s linear infinite;
            }
            @keyframes pulse-glow {
                0% { opacity: 0.5; transform: scale(1); }
                100% { opacity: 1; transform: scale(1.1); }
            }
            @keyframes float-particles {
                0% { background-position: 0 0; }
                100% { background-position: 60px 60px; }
            }
            
            .forge-empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #555;
            }
            .forge-tree-container {
                display: flex;
                justify-content: center;
                padding-bottom: 50px;
            }
            .tree-node-wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            /* Tree Override for Cards */
            .perk-card-tree {
                width: 140px !important;
                height: 200px !important;
                flex-direction: column !important;
                margin-bottom: 0 !important;
                position: relative;
                z-index: 2;
                transition: transform 0.2s;
            }
            /* Simplified Ingredient Node */
            .ingredient-node-simple {
                display: flex;
                flex-direction: row;
                align-items: center;
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid #333;
                border-radius: 8px;
                padding: 10px 15px;
                width: 180px;
                margin-bottom: 0 !important;
                position: relative;
                z-index: 2;
                transition: all 0.2s;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }
            .ingredient-node-simple:hover {
                border-color: #666;
                z-index: 10;
            }
            .ingredient-node-simple.status-owned {
                border-color: #4ade80;
                background: rgba(74, 222, 128, 0.1);
                box-shadow: 0 0 10px rgba(74, 222, 128, 0.1);
            }
            .ingredient-node-simple.status-missing {
                border-color: #ef4444;
                opacity: 1;
            }
            .ing-icon {
                font-size: 1.8em;
                margin-right: 12px;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255,255,255,0.05);
                border-radius: 6px;
            }
            .ing-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                text-align: left;
                overflow: hidden;
            }
            .ing-name {
                font-size: 1.1em;
                font-weight: bold;
                margin-bottom: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: #eee;
            }
            .ing-status {
                font-size: 0.75em;
                font-weight: 600;
            }
            .status-owned .ing-status { color: #4ade80; }
            .status-missing .ing-status { color: #ef4444; }

            /* Tooltip Styles */
            .ingredient-tooltip {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(10, 10, 10, 0.95);
                border: 1px solid #555;
                border-radius: 8px;
                padding: 12px;
                width: 240px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.8);
                z-index: 100;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                visibility: hidden;
                text-align: center;
            }
            .ingredient-node-simple:hover .ingredient-tooltip {
                opacity: 1;
                visibility: visible;
            }
            .tooltip-header {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                border-bottom: 1px solid rgba(255,255,255,0.2);
                padding-bottom: 6px;
            }
            .tooltip-name { font-weight: bold; color: #fff; font-size: 1.1em; }
            .tooltip-rarity { font-size: 0.7em; margin-bottom: 4px; font-weight: bold; }
            .tooltip-desc { font-size: 0.9em; color: #ccc; margin-bottom: 8px; line-height: 1.4; }
            .tooltip-status { font-size: 0.85em; font-weight: bold; }

            /* Target Node Enhancement */
            .target-node-card {
                width: 200px !important;
                height: 280px !important;
                border-width: 2px;
                box-shadow: 0 0 40px rgba(251, 191, 36, 0.3) !important;
                margin-bottom: 40px;
            }
            .target-node-card .perk-card-icon {
                font-size: 4em !important;
            }
            .target-node-card .perk-card-name {
                font-size: 1.4em !important;
                margin-bottom: 10px;
            }
            .perk-card-tree:hover {
                transform: scale(1.05);
                z-index: 10;
            }
            .perk-card-tree .perk-card-art {
                height: 80px !important;
                border-right: none !important;
                border-bottom: 1px solid rgba(255,255,255,0.1) !important;
            }
            .perk-card-tree .perk-card-icon {
                font-size: 2em !important;
            }
            .perk-card-tree .perk-card-info {
                padding: 10px 5px !important;
                justify-content: flex-start;
                align-items: center !important;
            }
            .perk-card-tree .perk-card-name {
                font-size: 1.1em !important;
                text-align: center !important;
                white-space: normal;
                margin-bottom: 8px;
                padding-right: 0 !important;
                width: 100%;
                line-height: 1.2;
            }
            .perk-card-tree .perk-rarity-badge {
                font-size: 0.6em !important;
                padding: 2px 4px !important;
            }

            .node-status-area {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .node-req {
                font-size: 0.75em;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 4px;
                background: rgba(0,0,0,0.5);
                margin-top: 4px;
            }
            .req-met { color: #4ade80; }
            .req-missing { color: #ef4444; }

            .forge-action-btn {
                background: #fbbf24;
                color: #000;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-weight: bold;
                cursor: pointer;
                font-size: 0.8em;
                width: 100%;
            }
            .forge-action-btn:disabled {
                background: #444;
                color: #888;
                cursor: not-allowed;
            }

            /* Status Styling on Card */
            .perk-card-tree.status-missing {
                filter: grayscale(0.6);
                opacity: 0.8;
                border-color: #ef4444;
            }
            .perk-card-tree.status-owned {
                /* border-color: #4ade80; */
            }
            .perk-card-tree.target-node {
                transform: scale(1.1);
                box-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
                z-index: 5;
            }

            /* Tree Connectors - Improved (Obsidian Style) */
            .node-children {
                display: flex;
                flex-direction: row;
                justify-content: center;
                position: relative;
                padding-top: 30px;
            }
            /* Vertical line from parent */
            .node-children::before {
                content: '';
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 1px;
                height: 30px;
                background: rgba(255, 255, 255, 0.15);
            }
            
            .tree-branch {
                padding: 30px 15px 0 15px;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            /* Vertical line to child */
            .tree-branch::before {
                content: '';
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 1px;
                height: 30px;
                background: rgba(255, 255, 255, 0.15);
            }
            /* Horizontal connecting line */
            .tree-branch::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 1px;
                background: rgba(255, 255, 255, 0.15);
            }
            
            /* First child: line starts from center to right */
            .tree-branch:first-child::after {
                left: 50%;
                width: 50%;
            }
            /* Last child: line starts from left to center */
            .tree-branch:last-child::after {
                width: 50%;
            }
            /* Only child: no horizontal line */
            .tree-branch:only-child::after {
                display: none;
            }
            .tree-branch:only-child {
                padding-top: 0;
            }
            /* Connect vertical line directly to parent for only child */
            .tree-branch:only-child::before {
                height: 30px;
                top: 0;
            }

        `;
        document.head.appendChild(style);
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
            <div class="screen start-screen">
                <div class="start-content-wrapper">
                    <h1 class="screen-title glitch" data-text="Thingamajig">Thingamajig</h1>
                    <div class="screen-subtitle">A Roguelike Gambling Adventure</div>
                    <div class="screen-author">by Vectheric</div>
                    
                    <div class="screen-description">
                        <p>Roll items. Sell for chips. Survive.</p>
                        <p>Every 5th round is a <span class="text-danger">BOSS</span>.</p>
                        <p>Build your engine. Break the bank.</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <input type="text" id="seed-input" placeholder="Seed (Optional)" style="background: rgba(0, 0, 0, 0.4); border: 1px solid #444; color: #fff; padding: 8px 12px; border-radius: 4px; font-family: monospace; width: 200px; text-align: center;">
                    </div>

                    <button class="btn-launch" onclick="game.handleStartTransition(this)">
                        <span class="btn-content">LAUNCH</span>
                        <span class="btn-glitch"></span>
                    </button>
                </div>
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
        let duration = 4000;
        if (type === 'epic') duration = 6000;
        if (type === 'unlock') duration = 8000;

        if (existing) {
            let count = parseInt(existing.getAttribute('data-msg-count') || '1', 10) + 1;
            existing.setAttribute('data-msg-count', String(count));
            const progressHtml = type === 'unlock' ? '' : `<div class="notification-progress" style="animation-duration: ${duration}ms"></div>`;
            existing.innerHTML = `<span class="notification-text">${message}</span> <span class="notification-count">(×${count})</span>${progressHtml}`;
            existing.classList.remove('hiding'); // Reset hiding state if it reappears
            const oldT = existing.getAttribute('data-timeout');
            if (oldT) clearTimeout(parseInt(oldT, 10));
        }
        const div = existing || document.createElement('div');
        if (!existing) {
            div.className = `notification notification-${type}`;
            div.setAttribute('data-msg-key', key);
            div.setAttribute('data-msg-count', '1');
            const progressHtml = type === 'unlock' ? '' : `<div class="notification-progress" style="animation-duration: ${duration}ms"></div>`;
            div.innerHTML = `<span class="notification-text">${message}</span>${progressHtml}`;
            container.appendChild(div);
        }
        
        const t = setTimeout(() => {
            div.classList.add('hiding');
            const onEnd = (e) => {
                if (e.target === div && div.classList.contains('hiding')) {
                    div.remove();
                    div.removeEventListener('animationend', onEnd);
                }
            };
            div.addEventListener('animationend', onEnd);
        }, duration);
        div.setAttribute('data-timeout', String(t));
    }
}

