/**
 * Background Particle System
 * Optimized canvas-based particle system for ambient effects
 */
class BackgroundParticles {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.particles = [];
        this.numParticles = 0; // Will be set based on screen size
        this.width = 0;
        this.height = 0;
        
        // Configuration
        this.config = {
            baseCount: 150, // Base count for 1920x1080
            color: '255, 255, 255', // RGB
            minSize: 1,
            maxSize: 3,
            minAlpha: 0.1,  // Increased from 0.05
            maxAlpha: 0.35, // Increased from 0.2
            speed: 0.2 // Drift speed
        };
        
        this.init();
    }

    init() {
        this.canvas.id = 'bg-particles';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '0'; // Behind game-container (z-1) but above body bg
        this.canvas.style.pointerEvents = 'none';
        document.body.prepend(this.canvas);
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Adjust particle count based on area
        const area = this.width * this.height;
        const refArea = 1920 * 1080;
        this.numParticles = Math.floor(this.config.baseCount * (area / refArea));
        // Clamp count
        this.numParticles = Math.max(50, Math.min(this.numParticles, 400));
        
        this.initParticles();
    }

    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            // Size properties
            baseSize: Math.random() * (this.config.maxSize - this.config.minSize) + this.config.minSize,
            sizeOffset: Math.random() * Math.PI * 2,
            sizeSpeed: 0.02 + Math.random() * 0.03,
            // Alpha properties
            baseAlpha: Math.random() * (this.config.maxAlpha - this.config.minAlpha) + this.config.minAlpha,
            alphaOffset: Math.random() * Math.PI * 2,
            alphaSpeed: 0.01 + Math.random() * 0.02,
            // Movement
            vx: (Math.random() - 0.5) * this.config.speed,
            vy: (Math.random() - 0.5) * this.config.speed,
            // Rotation
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02 // Slow spin
        };
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Update rotation
            p.rotation += p.rotationSpeed;
            
            // Wrap around screen
            if (p.x < -10) p.x = this.width + 10;
            if (p.x > this.width + 10) p.x = -10;
            if (p.y < -10) p.y = this.height + 10;
            if (p.y > this.height + 10) p.y = -10;
            
            // Oscillate size
            // sin returns -1 to 1. Map to 0.5 to 1.5 multiplier
            const sizeMult = 1 + Math.sin(time * p.sizeSpeed + p.sizeOffset) * 0.5;
            const currentSize = p.baseSize * sizeMult;
            const halfSize = currentSize / 2;
            
            // Oscillate alpha
            const alphaMult = 1 + Math.sin(time * p.alphaSpeed + p.alphaOffset) * 0.5;
            const currentAlpha = p.baseAlpha * alphaMult;
            
            // Draw rotated square
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.fillStyle = `rgba(${this.config.color}, ${currentAlpha})`;
            this.ctx.fillRect(-halfSize, -halfSize, currentSize, currentSize);
            this.ctx.restore();
        }
        
        requestAnimationFrame(() => this.animate());
    }
}
