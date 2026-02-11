/**
 * Time System
 * Handles day/night cycles and time progression
 * Scale: 1 real second = 1 game minute
 */
class TimeSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.gameState.time = {
            day: 1,
            minuteOfDay: 480, // Start at 8:00 AM (8 * 60)
            totalMinutes: 0
        };
        
        // Constants
        this.MINUTES_PER_DAY = 1440; // 24 * 60
        this.REAL_SECONDS_PER_GAME_MINUTE = 1;
        
        this._lastTick = Date.now();
        this._accumulator = 0;
    }

    /**
     * Update time based on elapsed real time
     * @param {number} deltaSeconds - Real seconds passed since last update
     */
    update(deltaSeconds) {
        // Accumulate time to handle potential lag or fast updates
        this._accumulator += deltaSeconds;

        while (this._accumulator >= this.REAL_SECONDS_PER_GAME_MINUTE) {
            this.tickMinute();
            this._accumulator -= this.REAL_SECONDS_PER_GAME_MINUTE;
        }
    }

    /**
     * Advance game time by one minute
     */
    tickMinute() {
        this.gameState.time.minuteOfDay++;
        this.gameState.time.totalMinutes++;

        // Check for day roll over
        if (this.gameState.time.minuteOfDay >= this.MINUTES_PER_DAY) {
            this.gameState.time.minuteOfDay = 0;
            this.gameState.time.day++;
            // Trigger day change event if needed
            if (typeof game !== 'undefined' && game.handleDayChange) {
                game.handleDayChange();
            }
        }
    }

    /**
     * Get formatted time string (12-hour format)
     */
    getDisplayTime() {
        const totalMinutes = this.gameState.time.minuteOfDay;
        let hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'

        const mStr = minutes < 10 ? '0' + minutes : minutes;
        
        return `${hours}:${mStr} ${ampm}`;
    }

    getDisplayDay() {
        return `Day ${this.gameState.time.day}`;
    }
}
