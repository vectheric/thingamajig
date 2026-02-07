# Things Roller - Roguelike Gambling Game

A pure gambling-based roguelike web game where you roll items, sell them for chips, and upgrade your abilities between waves. Similar to Balatro in design philosophy with a modular, easily extensible framework.

## Features

- **Rolling Mechanic**: Roll items with rarity-based randomization
- **Rarity System**: Common, Uncommon, Rare, Epic, Legendary items with varying values
- **Inventory System**: See all rolled items and track total value
- **Wave Progression**: Complete waves by earning enough chips
- **Shop System**: Purchase upgrades (Attributes) between waves
- **Attributes/Upgrades**:
  - Extra Roll: Gain +1 roll per wave
  - Lucky Charm: +5% chance for better items
  - Golden Touch: +10% item values
  - Shrewd Merchant: +15% chip earnings
  - And more!

## Game Flow

1. **Start Wave**: Begin with N rolls (upgradeable, starts at 3)
2. **Roll Phase**: Click ROLL to get random items
3. **Sell Phase**: Complete wave to sell items for chips
4. **Progression**: Pay chips to enter next wave
5. **Shop**: Upgrade attributes before next wave
6. **Win Condition**: Reach higher waves (survive longer)
7. **Lose Condition**: Not enough chips to afford next wave

## Architecture

The game is built with a modular, framework-based architecture:

### Core Modules

- **game-state.js**: Central state management (GameState class)
- **things.js**: Item/thing definitions and rolling logic
- **attributes.js**: Upgrade/attribute definitions
- **inventory.js**: Inventory display and management
- **shop.js**: Shop logic and purchasing
- **ui.js**: UI rendering and DOM updates
- **game.js**: Main game controller and flow

### Extensibility

The framework is designed for easy extension:

1. **Adding New Items**: Edit THING_TEMPLATES in things.js
2. **Adding New Upgrades**: Add to ATTRIBUTES in attributes.js
3. **Adjusting Values/Costs**: Modify RARITY_VALUES, RARITY_WEIGHTS in things.js
4. **Game Balance**: Tweak wave costs, attribute scalings in game-state.js

## How to Play

1. Open index.html in a web browser
2. Click "Start Game"
3. Click "ROLL" to roll items
4. When done rolling, click "Complete Wave & Sell"
5. Buy upgrades in the shop
6. Continue to next wave
7. Survive as many waves as possible!

## File Structure

```
ADDict/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # All styling
└── js/
    ├── things.js       # Item definitions
    ├── attributes.js   # Upgrade definitions
    ├── game-state.js   # Game state management
    ├── inventory.js    # Inventory handling
    ├── shop.js         # Shop management
    ├── ui.js           # UI rendering
    └── game.js         # Main game controller
```

## Customization Guide

### Adding a New Thing Type

```javascript
// In things.js, add to THING_TEMPLATES:
MY_ITEM: {
    name: 'My Item',
    baseValue: 10,
    rarityMultiplier: 1.3
}
```

### Adding a New Attribute

```javascript
// In attributes.js, add to ATTRIBUTES:
MY_UPGRADE: {
    id: 'my_upgrade',
    name: 'My Upgrade',
    description: 'What it does',
    baseCost: 50,
    costScaling: 1.15,
    stat: 'my_stat_name'
}

// Then update GameState to handle the new stat
```

### Adjusting Game Balance

- **Wave Costs**: Edit `getWaveEntryCost()` in game-state.js
- **Base Rolls**: Change baseRolls = 3 in `getAvailableRolls()`
- **Item Values**: Modify RARITY_VALUES in things.js
- **Rarity Weights**: Change RARITY_WEIGHTS in things.js

## Development Notes

- **No Data Persistence**: Everything is session-based, no save/load
- **Pure JavaScript**: No frameworks or dependencies
- **Responsive Design**: Works on desktop and mobile
- **Extensible**: Classes and modules designed for easy expansion

---

Made with ❤️ for roguelike gambling fans!
