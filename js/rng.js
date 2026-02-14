// Optimized code for RNG
function rng(seed) {
    // Using a simple linear congruential generator
    return (seed * 48271) % 2147483647;
}

export default rng;