/**
 * Global Random Number Generator System
 * Replaces Math.random with a seeded implementation (Mulberry32)
 * Adds Math.seed() and Math.getSeed()
 */

(function() {
    let _seed = Date.now();
    let _originalSeed = String(_seed);
    let _rng = null;

    // Mulberry32 generator
    function mulberry32(a) {
        return function() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
    }

    /**
     * Generate a complex random seed string
     */
    Math.generateRandomSeed = function() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#!$%$%^&*';
        const length = Math.floor(Math.random() * 8) + 14;;
        let result = '';
        // Use crypto.getRandomValues if available for better entropy, otherwise Math.random (before seed override)
        // Since we are setting the seed, we want true randomness here if possible, but we might have already overridden Math.random.
        // We can use a simple time-based mixing for the seed generation itself.
        const array = new Uint32Array(length);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
        } else {
            for(let i=0; i<length; i++) array[i] = Date.now() + Math.random() * 1000000;
        }
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(array[i] % chars.length);
        }
        return result;
    };

    /**
     * Set the global random seed
     * @param {number|string} s - Seed value
     */
    Math.seed = function(s) {
        _originalSeed = String(s);
        if (typeof s === 'string') {
            // Hash string to number
            let h = 2166136261;
            for (let i = 0; i < s.length; i++) {
                h ^= s.charCodeAt(i);
                h = Math.imul(h, 16777619);
            }
            _seed = h >>> 0;
        } else {
            _seed = (s >>> 0);
        }
        _rng = mulberry32(_seed);
        console.log(`[RNG] Seed set to: ${_originalSeed} (Hash: ${_seed})`);
        return _seed;
    };

    /**
     * Get the current seed (numeric hash)
     */
    Math.getSeed = function() {
        return _seed;
    };

    /**
     * Get the original seed string
     */
    Math.getOriginalSeed = function() {
        return _originalSeed;
    };

    /**
     * Generate a seeded random number (0-1)
     * Overrides default Math.random
     */
    Math.random = function() {
        if (!_rng) {
            Math.seed(Date.now());
        }
        return _rng();
    };

    // Initialize with clock
    Math.seed(Date.now());

    // Expose factory for isolated streams (replaces things.js implementation if loaded first)
    if (typeof window !== 'undefined') {
        window.createSeededRng = function(seed) {
            return mulberry32(seed >>> 0);
        };
    } else {
        // Node.js environment
        global.createSeededRng = function(seed) {
            return mulberry32(seed >>> 0);
        };
    }

})();
