// Optimized game-state.js

class GameState {
    constructor() {
        this.state = {};
    }

    setState(newState) {
        this.state = { ...this.state, ...newState }; // Merge new state into existing state
    }

    getState() {
        return this.state; // Return current state
    }

    resetState() {
        this.state = {}; // Clear state
    }

    isEmpty() {
        return Object.keys(this.state).length === 0; // Check if state is empty
    }
}

export default GameState;