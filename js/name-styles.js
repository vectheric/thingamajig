/**
 * Name styling for items and perks (stroke, font, color, italic, bold, underline, strikethrough)
 * Used by UI when rendering item names and perk names.
 */

const RARITY_NAME_STYLES = {
    common: {
        color: '#a1a1aa',
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textStroke: 'none',
        fontFamily: 'inherit',
    },
    uncommon: {
        color: '#4ade80',
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textStroke: 'none',
        fontFamily: 'inherit',
    },
    rare: {
        color: '#60a5fa',
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.3)',
        fontFamily: 'inherit',
    },
    epic: {
        color: '#c4b5fd',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.2)',
        fontFamily: 'inherit',
    },
    legendary: {
        color: '#fbbf24',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.4)',
        fontFamily: 'inherit',
    },
};

/** Perk name styles by rarity (same structure) */
const PERK_NAME_STYLES = {
    common: { ...RARITY_NAME_STYLES.common },
    uncommon: { ...RARITY_NAME_STYLES.uncommon },
    rare: { ...RARITY_NAME_STYLES.rare },
    epic: { ...RARITY_NAME_STYLES.epic },
    legendary: { ...RARITY_NAME_STYLES.legendary },
};

/**
 * Build inline style string from a style object
 * @param {Object} style - { color, fontWeight, fontStyle, textDecoration, textStroke, fontFamily }
 * @returns {string} style="..."
 */
function nameStyleToCss(style) {
    if (!style) return '';
    const s = style;
    const parts = [];
    if (s.color) parts.push(`color:${s.color}`);
    if (s.fontWeight) parts.push(`font-weight:${s.fontWeight}`);
    if (s.fontStyle) parts.push(`font-style:${s.fontStyle}`);
    if (s.textDecoration) parts.push(`text-decoration:${s.textDecoration}`);
    if (s.fontFamily && s.fontFamily !== 'inherit') parts.push(`font-family:${s.fontFamily}`);
    if (s.textStroke && s.textStroke !== 'none') parts.push(`-webkit-text-stroke:${s.textStroke}`);
    return parts.length ? ` style="${parts.join(';')}"` : '';
}

/**
 * Get name style for an item (by rarity; item can override via thing.nameStyle if present)
 * @param {Object} item - { rarity, nameStyle? }
 * @returns {Object} style object
 */
function getItemNameStyle(item) {
    const rarity = (item && item.rarity) || 'common';
    const base = RARITY_NAME_STYLES[rarity] || RARITY_NAME_STYLES.common;
    return item && item.nameStyle ? { ...base, ...item.nameStyle } : base;
}

/**
 * Get name style for a perk (by rarity)
 * @param {Object} perk - { rarity, nameStyle? }
 * @returns {Object} style object
 */
function getPerkNameStyle(perk) {
    const rarity = (perk && perk.rarity) || 'common';
    const base = PERK_NAME_STYLES[rarity] || PERK_NAME_STYLES.common;
    return perk && perk.nameStyle ? { ...base, ...perk.nameStyle } : base;
}

/**
 * Wrap name HTML with inline style (for items/perks)
 * @param {string} name - display name
 * @param {Object} style - style object
 * @param {string} tag - tag name, default 'span'
 * @returns {string} HTML
 */
function wrapStyledName(name, style, tag = 'span') {
    const css = nameStyleToCss(style);
    return `<${tag} class="styled-name"${css}>${escapeHtml(name)}</${tag}>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
