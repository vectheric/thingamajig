/**
 * Name styling for items and augments (stroke, font, color, none, bold, underline, strikethrough)
 * Used by UI when rendering item names and augment names.
 */

const TIER_NAME_STYLES = {
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
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.2)',
        fontFamily: 'inherit',
    },
    legendary: {
        color: '#fbbf24',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.4)',
        fontFamily: 'inherit',
    },
    mythical: {
        color: '#d946ef',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.4)',
        fontFamily: 'inherit',
    },
    significant: {
        color: '#e4e4e7',
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textStroke: 'none',
        fontFamily: 'inherit',
    },
    master: {
        color: '#c084fc',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.3)',
        fontFamily: 'inherit',
    },
    surreal: {
        color: '#2dd4bf',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.3)',
        fontFamily: 'inherit',
    },
    mythic: {
        color: '#f472b6',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.4)',
        fontFamily: 'inherit',
    },
    exotic: {
        color: '#facc15',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.4)',
        fontFamily: 'inherit',
    },
    exquisite: {
        color: '#4ade80',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.4)',
        fontFamily: 'inherit',
    },
    transcendent: {
        color: '#60a5fa',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.5)',
        fontFamily: 'inherit',
    },
    enigmatic: {
        color: '#a3e635',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.5)',
        fontFamily: 'inherit',
    },
    unfathomable: {
        color: '#818cf8',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.5)',
        fontFamily: 'inherit',
    },
    otherworldly: {
        color: '#f472b6',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.5)',
        fontFamily: 'inherit',
    },
    imaginary: {
        color: '#fef08a',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.5)',
        fontFamily: 'inherit',
    },
    zenith: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontStyle: 'none',
        textDecoration: 'none',
        textStroke: '1px rgba(0,0,0,0.6)',
        fontFamily: 'inherit',
    },
};

/** AUGMENT name styles by rarity (same structure) */
const AUGMENT_NAME_STYLES = {
    common: { ...TIER_NAME_STYLES.common },
    uncommon: { ...TIER_NAME_STYLES.uncommon },
    rare: { ...TIER_NAME_STYLES.rare },
    epic: { ...TIER_NAME_STYLES.epic },
    legendary: { ...TIER_NAME_STYLES.legendary },
    mythical: { ...TIER_NAME_STYLES.mythical },
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
    const rarity = (item && (item.tier || item.rarity)) || 'common';
    const base = TIER_NAME_STYLES[rarity] || TIER_NAME_STYLES.common;
    let style = item && item.nameStyle ? { ...base, ...item.nameStyle } : base;

    // Fallback: Check THING_TEMPLATES for color if not present in style
    // This handles retroactively adding colors to existing items
    const templateId = item && (item.templateId || item.id);
    if (templateId && typeof THING_TEMPLATES !== 'undefined') {
        const template = THING_TEMPLATES[templateId];
        if (template && template.color) {
            // Only apply if we don't already have a custom color from nameStyle
            if (!item || !item.nameStyle || !item.nameStyle.color) {
                style = { ...style, color: template.color };
            }
        }
    }

    return style;
}

/**
 * Get name style for a augment (by rarity)
 * @param {Object} augment - { rarity, nameStyle? }
 * @returns {Object} style object
 */
function getAUGMENTNameStyle(augment) {
    const rarity = (augment && (augment.rarity || augment.tier)) || 'common';
    const base = AUGMENT_NAME_STYLES[rarity] || AUGMENT_NAME_STYLES.common;
    return augment && augment.nameStyle ? { ...base, ...augment.nameStyle } : base;
}

/**
 * Wrap name HTML with inline style (for items/augments)
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
