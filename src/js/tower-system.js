// Enemy Tower System — Tower has health, takes damage, can be destroyed
// EPIC 2 / US 2.5 — Destroy the Enemy Tower

class Tower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.maxHealth = 500;
        this.health = this.maxHealth;
        this.isDestroyed = false;
        this.destructionAnimation = null;
        this.destructionStartTime = 0;
        this.destructionDuration = 2000; // 2 seconds
        
        // Visual properties
        this.width = 4;
        this.height = 6;
        this.baseColor = "#8B4513";
        this.damagedColor = "#5a2d0c";
        this.destroyedColor = "#2d1a08";
    }

    takeDamage(damage) {
        if (this.isDestroyed) return false;
        
        this.health -= damage;
        if (this.health < 0) this.health = 0;
        
        console.log(`Tower took ${damage} damage. Health: ${this.health}/${this.maxHealth}`);
        
        if (this.health <= 0) {
            this.destroy();
            return true; // Tower destroyed
        }
        return false;
    }

    destroy() {
        this.isDestroyed = true;
        this.destructionStartTime = Date.now();
        this.destructionAnimation = {
            particles: [],
            phase: 'exploding'
        };
        
        // Create destruction particles
        for (let i = 0; i < 30; i++) {
            this.destructionAnimation.particles.push({
                x: this.x + Math.random() * this.width - this.width / 2,
                y: this.y + Math.random() * this.height - this.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 3, // upward bias
                life: 1.0,
                decay: 0.015 + Math.random() * 0.01,
                color: `hsl(${Math.random() * 30 + 15}, 100%, ${40 + Math.random() * 30}%)`, // orange/red/yellow
                size: 3 + Math.random() * 4
            });
        }
        
        console.log("TOWER DESTROYED! Victory!");
        // Trigger win condition - will be handled by game controller
        if (window.gameController) {
            window.gameController.onTowerDestroyed();
        }
    }

    updateDestructionAnimation() {
        if (!this.isDestroyed || !this.destructionAnimation) return;
        
        const elapsed = Date.now() - this.destructionStartTime;
        if (elapsed >= this.destructionDuration) {
            this.destructionAnimation.phase = 'finished';
            return;
        }
        
        // Update particles
        for (const particle of this.destructionAnimation.particles) {
            particle.x += particle.vx * 0.1;
            particle.y += particle.vy * 0.1;
            particle.vy += 0.15; // gravity
            particle.life -= particle.decay;
            particle.size *= 0.98;
        }
        
        // Remove dead particles
        this.destructionAnimation.particles = this.destructionAnimation.particles.filter(p => p.life > 0);
    }

    getHealthPercent() {
        return this.health / this.maxHealth;
    }

    isAlive() {
        return !this.isDestroyed && this.health > 0;
    }
}

class TowerSystem {
    constructor() {
        this.tower = null;
        this.towerX = 9; // Right side of grid (same as defenses)
        this.towerY = 3; // Center vertically
    }

    createTower() {
        this.tower = new Tower(this.towerX, this.towerY);
        console.log(`Enemy Tower created at (${this.towerX}, ${this.towerY}) with ${this.tower.maxHealth} HP`);
        return this.tower;
    }

    getTower() {
        return this.tower;
    }

    // Called by plants when they attack the tower
    attackTower(plant, damage) {
        if (!this.tower || this.tower.isDestroyed) return false;
        
        // Only plants that have "reached" the tower can attack
        // For now, any plant within range of the tower can attack
        const dx = this.tower.x - plant.x;
        const dy = this.tower.y - plant.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Tower attack range - plants need to be adjacent or very close
        if (distance <= 2) {
            const destroyed = this.tower.takeDamage(damage);
            return { hit: true, destroyed };
        }
        return { hit: false, destroyed: false };
    }

    update() {
        if (this.tower && this.tower.isDestroyed) {
            this.tower.updateDestructionAnimation();
        }
    }

    // Render tower health bar on canvas
    renderHealthBar(ctx, cellSize) {
        if (!this.tower) return;
        
        const x = this.tower.x * cellSize;
        const y = (this.tower.y - 1) * cellSize; // Above tower
        const barWidth = this.tower.width * cellSize;
        const barHeight = 8;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health fill
        const healthPercent = this.tower.getHealthPercent();
        if (healthPercent > 0.6) {
            ctx.fillStyle = '#4CAF50'; // Green
        } else if (healthPercent > 0.3) {
            ctx.fillStyle = '#FFC107'; // Yellow
        } else {
            ctx.fillStyle = '#F44336'; // Red
        }
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Health text
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${Math.ceil(this.tower.health)}/${this.tower.maxHealth}`,
            x + barWidth / 2,
            y + barHeight + 10
        );
    }

    // Render the tower itself on canvas
    renderTower(ctx, cellSize) {
        if (!this.tower) return;
        
        const x = this.tower.x * cellSize;
        const y = this.tower.y * cellSize;
        const w = this.tower.width * cellSize;
        const h = this.tower.height * cellSize;
        
        if (this.tower.isDestroyed && this.tower.destructionAnimation && this.tower.destructionAnimation.phase !== 'finished') {
            // Render destruction animation
            this.renderDestruction(ctx, cellSize);
            return;
        }
        
        // Determine color based on health
        let color = this.tower.baseColor;
        if (this.tower.isDestroyed) {
            color = this.tower.destroyedColor;
        } else if (this.tower.getHealthPercent() < 0.5) {
            color = this.tower.damagedColor;
        }
        
        // Tower base
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        
        // Tower details - crenellations
        ctx.fillStyle = '#6B3A13';
        const crenWidth = w / 4;
        for (let i = 0; i < 4; i++) {
            const cx = x + i * crenWidth;
            const crenHeight = h * 0.3;
            ctx.fillRect(cx, y - crenHeight, crenWidth * 0.8, crenHeight);
        }
        
        // Tower windows
        ctx.fillStyle = '#1a1a2e';
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const wx = x + w * 0.2 + col * w * 0.4;
                const wy = y + h * 0.15 + row * h * 0.25;
                ctx.fillRect(wx, wy, w * 0.15, h * 0.15);
            }
        }
        
        // Border
        ctx.strokeStyle = '#4A2511';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }

    renderDestruction(ctx, cellSize) {
        if (!this.tower || !this.tower.destructionAnimation) return;
        
        const anim = this.tower.destructionAnimation;
        
        // Draw particles
        for (const particle of anim.particles) {
            if (particle.life <= 0) continue;
            
            const px = (this.tower.x + particle.x) * cellSize;
            const py = (this.tower.y + particle.y) * cellSize;
            
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(px, py, particle.size * cellSize * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
        
        // Draw tower ruins if animation finished
        if (anim.phase === 'finished') {
            const x = this.tower.x * cellSize;
            const y = this.tower.y * cellSize;
            const w = this.tower.width * cellSize;
            const h = this.tower.height * cellSize;
            
            // Ruins - dark rubble
            ctx.fillStyle = '#1a0f05';
            ctx.fillRect(x, y + h * 0.6, w, h * 0.4);
            
            // Broken pieces
            ctx.fillStyle = '#2d1a08';
            for (let i = 0; i < 5; i++) {
                const px = x + Math.random() * w;
                const py = y + h * 0.5 + Math.random() * h * 0.3;
                const pw = 5 + Math.random() * 15;
                const ph = 3 + Math.random() * 10;
                ctx.fillRect(px, py, pw, ph);
            }
        }
    }

    // Check if tower is destroyed (win condition)
    isTowerDestroyed() {
        return this.tower && this.tower.isDestroyed && 
               this.tower.destructionAnimation && 
               this.tower.destructionAnimation.phase === 'finished';
    }

    // Reset tower for new game
    reset() {
        this.tower = null;
    }
}

// Global tower system instance
const towerSystem = new TowerSystem();