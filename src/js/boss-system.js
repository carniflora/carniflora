// Final Boss System — Multi-phase boss fight for EPIC 9
// US 9.3: Fight and Destroy the Final Boss

const BOSS_PHASES = {
    1: {
        name: "Root Guardian",
        maxHealth: 800,
        color: "#8B4513",
        secondaryColor: "#5a2d0c",
        attacks: [
            { name: "Root Slam", type: "area", damage: 30, cooldown: 3000, range: 3, icon: "🌱" },
            { name: "Vine Whip", type: "line", damage: 25, cooldown: 2000, range: 5, icon: "🌿" }
        ],
        sprite: "🌳",
        phaseTransitionHealth: 0.6, // 60% health triggers phase 2
        description: "Ancient tree guardian of the corrupted grove"
    },
    2: {
        name: "Thorn Sovereign",
        maxHealth: 1000,
        color: "#8F2D56",
        secondaryColor: "#5a1a35",
        attacks: [
            { name: "Thorn Barrage", type: "spread", damage: 20, cooldown: 1500, range: 6, count: 5, icon: "🌹" },
            { name: "Poison Cloud", type: "area", damage: 15, cooldown: 4000, range: 4, duration: 3000, icon: "☠️" },
            { name: "Root Entanglement", type: "cc", damage: 0, cooldown: 5000, range: 4, duration: 2000, icon: "🌿" }
        ],
        sprite: "🌹",
        phaseTransitionHealth: 0.3, // 30% health triggers phase 3
        description: "Mutated sovereign of thorns and poison"
    },
    3: {
        name: "Carniflora Prime",
        maxHealth: 1200,
        color: "#4A0E4E",
        secondaryColor: "#2d0830",
        attacks: [
            { name: "Devouring Maw", type: "line", damage: 50, cooldown: 2500, range: 7, icon: "👁️" },
            { name: "Spore Explosion", type: "area", damage: 35, cooldown: 3000, range: 5, icon: "☁️" },
            { name: "Reality Tear", type: "teleport", damage: 0, cooldown: 6000, range: 8, icon: "🌀" },
            { name: "Final Harvest", type: "ultimate", damage: 100, cooldown: 10000, range: 10, icon: "⚡" }
        ],
        sprite: "👑",
        phaseTransitionHealth: 0, // Final phase
        description: "The ultimate carnivorous horror — apex predator"
    }
};

class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.currentPhase = 1;
        this.maxHealth = BOSS_PHASES[1].maxHealth;
        this.health = this.maxHealth;
        this.isDestroyed = false;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        
        // Phase transition state
        this.isTransitioning = false;
        this.transitionStartTime = 0;
        this.transitionDuration = 3000;
        this.transitionCallback = null;
        
        // Attack timers
        this.attackTimers = {};
        this.lastAttackTime = {};
        
        // Visual effects
        this.particles = [];
        this.screenShake = 0;
        this.flashIntensity = 0;
        
        // Position tracking
        this.baseX = x;
        this.baseY = y;
        this.moveTargetX = x;
        this.moveTargetY = y;
        this.isMoving = false;
        
        // Cinematic state
        this.defeatAnimation = null;
        this.defeatStartTime = 0;
        this.defeatDuration = 4000;
        
        this.initPhase(1);
    }
    
    initPhase(phaseNumber) {
        const phase = BOSS_PHASES[phaseNumber];
        this.currentPhase = phaseNumber;
        this.maxHealth = phase.maxHealth;
        this.health = this.maxHealth;
        this.attacks = phase.attacks;
        this.sprite = phase.sprite;
        this.phaseColor = phase.color;
        this.phaseSecondaryColor = phase.secondaryColor;
        this.phaseName = phase.name;
        this.phaseDescription = phase.description;
        
        // Initialize attack timers
        this.attackTimers = {};
        this.lastAttackTime = {};
        for (const attack of this.attacks) {
            this.attackTimers[attack.name] = attack.cooldown;
            this.lastAttackTime[attack.name] = 0;
        }
        
        console.log(`Boss Phase ${phaseNumber}: ${phase.name} (${phase.maxHealth} HP)`);
    }
    
    takeDamage(damage) {
        if (this.isDestroyed || this.invulnerable || this.isTransitioning) return false;
        
        this.health -= damage;
        if (this.health < 0) this.health = 0;
        
        // Visual feedback
        this.flashIntensity = 1.0;
        this.screenShake = 8;
        
        // Create hit particles
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: this.x + (Math.random() - 0.5) * 2,
                y: this.y + (Math.random() - 0.5) * 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 2,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                color: `hsl(${Math.random() * 30 + 350}, 100%, ${50 + Math.random() * 30}%)`,
                size: 2 + Math.random() * 3
            });
        }
        
        console.log(`${this.phaseName} took ${damage} damage. Health: ${Math.ceil(this.health)}/${this.maxHealth}`);
        
        // Check for phase transition
        const phaseData = BOSS_PHASES[this.currentPhase];
        const healthPercent = this.health / this.maxHealth;
        
        if (healthPercent <= phaseData.phaseTransitionHealth && this.currentPhase < 3) {
            this.startPhaseTransition(this.currentPhase + 1);
            return true;
        }
        
        if (this.health <= 0) {
            this.destroy();
            return true;
        }
        
        return false;
    }
    
    startPhaseTransition(nextPhase) {
        this.isTransitioning = true;
        this.transitionStartTime = Date.now();
        
        // Create transition particles
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: this.x + (Math.random() - 0.5) * 4,
                y: this.y + (Math.random() - 0.5) * 4,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 3,
                life: 1.0,
                decay: 0.01 + Math.random() * 0.01,
                color: `hsl(${Math.random() * 60 + 300}, 100%, ${40 + Math.random() * 40}%)`,
                size: 3 + Math.random() * 5
            });
        }
        
        this.screenShake = 20;
        
        console.log(`BOSS PHASE TRANSITION: ${this.phaseName} → ${BOSS_PHASES[nextPhase].name}`);
        
        // Trigger callback when transition completes
        this.transitionCallback = () => {
            // Brief invulnerability during transition
            this.invulnerable = true;
            this.invulnerableTimer = Date.now() + 1000;
            
            // Store old max health for health bar scaling
            const oldMaxHealth = this.maxHealth;
            const healthRatio = this.health / oldMaxHealth;
            
            this.initPhase(nextPhase);
            
            // Scale health to new max health proportionally
            this.health = this.maxHealth * healthRatio;
            
            setTimeout(() => {
                this.invulnerable = false;
            }, 1000);
        };
    }
    
    destroy() {
        this.isDestroyed = true;
        this.defeatStartTime = Date.now();
        this.defeatAnimation = {
            particles: [],
            phase: 'exploding',
            screenFlash: 1.0
        };
        
        // Massive particle explosion
        for (let i = 0; i < 100; i++) {
            const angle = (Math.PI * 2 * i) / 100;
            const speed = 3 + Math.random() * 5;
            this.defeatAnimation.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.005 + Math.random() * 0.01,
                color: `hsl(${Math.random() * 60 + 280}, 100%, ${40 + Math.random() * 40}%)`,
                size: 4 + Math.random() * 6,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3
            });
        }
        
        // Add delayed secondary explosion
        setTimeout(() => {
            for (let i = 0; i < 50; i++) {
                this.defeatAnimation.particles.push({
                    x: this.x + (Math.random() - 0.5) * 3,
                    y: this.y + (Math.random() - 0.5) * 3,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8 - 4,
                    life: 1.0,
                    decay: 0.01 + Math.random() * 0.01,
                    color: `hsl(${Math.random() * 30 + 20}, 100%, ${50 + Math.random() * 30}%)`,
                    size: 5 + Math.random() * 8
                });
            }
        }, 1000);
        
        console.log("FINAL BOSS DEFEATED! VICTORY!");
        
        // Trigger win condition
        if (window.gameController) {
            window.gameController.onBossDefeated();
        }
    }
    
    update(dt) {
        if (this.isDestroyed) {
            this.updateDefeatAnimation();
            return;
        }
        
        if (this.isTransitioning) {
            this.updatePhaseTransition();
            return;
        }
        
        // Update invulnerability
        if (this.invulnerable && Date.now() > this.invulnerableTimer) {
            this.invulnerable = false;
        }
        
        // Update flash effect
        if (this.flashIntensity > 0) {
            this.flashIntensity -= dt * 3;
            if (this.flashIntensity < 0) this.flashIntensity = 0;
        }
        
        // Update screen shake
        if (this.screenShake > 0) {
            this.screenShake -= dt * 15;
            if (this.screenShake < 0) this.screenShake = 0;
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt * 0.1;
            p.y += p.vy * dt * 0.1;
            p.vy += 0.2 * dt * 0.1; // gravity
            p.life -= p.decay;
            p.size *= 0.99;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Movement
        if (this.isMoving) {
            const dx = this.moveTargetX - this.x;
            const dy = this.moveTargetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0.1) {
                this.x += (dx / dist) * 2 * dt * 0.1;
                this.y += (dy / dist) * 2 * dt * 0.1;
            } else {
                this.x = this.moveTargetX;
                this.y = this.moveTargetY;
                this.isMoving = false;
            }
        }
        
        // Execute attacks
        this.executeAttacks(dt);
    }
    
    updatePhaseTransition() {
        const elapsed = Date.now() - this.transitionStartTime;
        const progress = Math.min(elapsed / this.transitionDuration, 1);
        
        // Update transition particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * 0.1;
            p.y += p.vy * 0.1;
            p.vy += 0.15;
            p.life -= p.decay;
            p.size *= 0.98;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        if (progress >= 1 && this.transitionCallback) {
            this.isTransitioning = false;
            this.transitionCallback();
            this.transitionCallback = null;
        }
    }
    
    updateDefeatAnimation() {
        if (!this.defeatAnimation) return;
        
        const elapsed = Date.now() - this.defeatStartTime;
        const progress = Math.min(elapsed / this.defeatDuration, 1);
        
        // Update screen flash
        this.defeatAnimation.screenFlash = 1.0 - progress * 0.8;
        
        // Update particles
        for (let i = this.defeatAnimation.particles.length - 1; i >= 0; i--) {
            const p = this.defeatAnimation.particles[i];
            p.x += p.vx * 0.1;
            p.y += p.vy * 0.1;
            p.vy += 0.15; // gravity
            p.life -= p.decay;
            p.size *= 0.985;
            p.rotation += p.rotationSpeed * 0.1;
            if (p.life <= 0) {
                this.defeatAnimation.particles.splice(i, 1);
            }
        }
        
        if (progress >= 1 && this.defeatAnimation.particles.length === 0) {
            this.defeatAnimation.phase = 'finished';
        }
    }
    
    executeAttacks(dt) {
        const now = Date.now();
        const plants = window.plantSystem ? window.plantSystem.getAllPlants().filter(p => p.alive) : [];
        
        if (plants.length === 0) return;
        
        for (const attack of this.attacks) {
            if (now - this.lastAttackTime[attack.name] >= attack.cooldown) {
                this.performAttack(attack, plants);
                this.lastAttackTime[attack.name] = now;
            }
        }
    }
    
    performAttack(attack, plants) {
        const target = this.selectTarget(plants, attack);
        if (!target) return;
        
        console.log(`${this.phaseName} uses ${attack.name}!`);
        
        switch (attack.type) {
            case 'area':
                this.areaAttack(target, attack);
                break;
            case 'line':
                this.lineAttack(target, attack);
                break;
            case 'spread':
                this.spreadAttack(target, attack);
                break;
            case 'cc':
                this.ccAttack(target, attack);
                break;
            case 'teleport':
                this.teleportAttack(attack);
                break;
            case 'ultimate':
                this.ultimateAttack(target, attack);
                break;
        }
        
        // Screen shake on attack
        this.screenShake = Math.max(this.screenShake, 5);
    }
    
    selectTarget(plants, attack) {
        // Prefer closest plant to boss
        let best = null;
        let bestDist = Infinity;
        for (const plant of plants) {
            const dx = this.x - plant.x;
            const dy = this.y - plant.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= attack.range && dist < bestDist) {
                bestDist = dist;
                best = plant;
            }
        }
        return best;
    }
    
    areaAttack(target, attack) {
        const plants = window.plantSystem.getAllPlants().filter(p => p.alive);
        for (const plant of plants) {
            const dx = target.x - plant.x;
            const dy = target.y - plant.y;
            if (Math.sqrt(dx * dx + dy * dy) <= attack.range) {
                window.plantSystem.takeDamage(plant.id, attack.damage);
            }
        }
        // Visual: expanding ring
        this.createAreaEffect(target.x, target.y, attack.range, attack.icon);
    }
    
    lineAttack(target, attack) {
        // Damage all plants in a line from boss to target
        const plants = window.plantSystem.getAllPlants().filter(p => p.alive);
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;
        
        const dirX = dx / dist;
        const dirY = dy / dist;
        
        for (const plant of plants) {
            // Check if plant is near the line
            const pdx = plant.x - this.x;
            const pdy = plant.y - this.y;
            const projection = pdx * dirX + pdy * dirY;
            if (projection < 0 || projection > dist) continue;
            
            const closestX = this.x + dirX * projection;
            const closestY = this.y + dirY * projection;
            const lineDist = Math.sqrt((plant.x - closestX) ** 2 + (plant.y - closestY) ** 2);
            
            if (lineDist <= 1.5) {
                window.plantSystem.takeDamage(plant.id, attack.damage);
            }
        }
        
        // Visual: line effect
        this.createLineEffect(this.x, this.y, target.x, target.y, attack.icon);
    }
    
    spreadAttack(target, attack) {
        const plants = window.plantSystem.getAllPlants().filter(p => p.alive);
        for (const plant of plants) {
            const dx = this.x - plant.x;
            const dy = this.y - plant.y;
            if (Math.sqrt(dx * dx + dy * dy) <= attack.range) {
                window.plantSystem.takeDamage(plant.id, attack.damage);
            }
        }
        this.createSpreadEffect(this.x, this.y, attack.count, attack.icon);
    }
    
    ccAttack(target, attack) {
        const plants = window.plantSystem.getAllPlants().filter(p => p.alive);
        for (const plant of plants) {
            const dx = target.x - plant.x;
            const dy = target.y - plant.y;
            if (Math.sqrt(dx * dx + dy * dy) <= attack.range) {
                // Apply root/entangle effect
                plant.rooted = true;
                plant.rootEndTime = Date.now() + attack.duration;
                plant.rootSource = this.phaseName;
            }
        }
        this.createCCEffect(target.x, target.y, attack.range, attack.icon);
    }
    
    teleportAttack(attack) {
        // Teleport to a random position near plants
        const plants = window.plantSystem.getAllPlants().filter(p => p.alive);
        if (plants.length === 0) return;
        
        const target = plants[Math.floor(Math.random() * plants.length)];
        const angle = Math.random() * Math.PI * 2;
        const distance = 2 + Math.random() * 2;
        
        this.moveTargetX = target.x + Math.cos(angle) * distance;
        this.moveTargetY = target.y + Math.sin(angle) * distance;
        this.isMoving = true;
        
        // Visual: teleport effect
        this.createTeleportEffect(this.x, this.y);
        setTimeout(() => {
            this.createTeleportEffect(this.moveTargetX, this.moveTargetY);
        }, 500);
    }
    
    ultimateAttack(target, attack) {
        // Devastating attack - damages all plants heavily
        const plants = window.plantSystem.getAllPlants().filter(p => p.alive);
        for (const plant of plants) {
            window.plantSystem.takeDamage(plant.id, attack.damage);
        }
        this.createUltimateEffect(this.x, this.y, attack.range, attack.icon);
        this.screenShake = 30;
    }
    
    // Visual effect creators
    createAreaEffect(x, y, range, icon) {
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            this.particles.push({
                x: x + Math.cos(angle) * range * 0.5,
                y: y + Math.sin(angle) * range * 0.5,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: 1.0,
                decay: 0.02,
                color: this.phaseColor,
                size: 3
            });
        }
    }
    
    createLineEffect(x1, y1, x2, y2, icon) {
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const steps = Math.ceil(dist * 2);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            this.particles.push({
                x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 0.5,
                y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * 0.5,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1 - 1,
                life: 1.0,
                decay: 0.03,
                color: this.phaseSecondaryColor,
                size: 2
            });
        }
    }
    
    createSpreadEffect(x, y, count, icon) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            for (let j = 0; j < 5; j++) {
                this.particles.push({
                    x: x + Math.cos(angle) * j * 0.5,
                    y: y + Math.sin(angle) * j * 0.5,
                    vx: Math.cos(angle) * 3,
                    vy: Math.sin(angle) * 3,
                    life: 1.0,
                    decay: 0.02,
                    color: this.phaseColor,
                    size: 2 + j * 0.5
                });
            }
        }
    }
    
    createCCEffect(x, y, range, icon) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * range;
            this.particles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1 - 1,
                life: 1.0,
                decay: 0.015,
                color: "#8F2D56",
                size: 3
            });
        }
    }
    
    createTeleportEffect(x, y) {
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 2,
                y: y + (Math.random() - 0.5) * 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 2,
                life: 1.0,
                decay: 0.02,
                color: `hsl(${Math.random() * 60 + 280}, 100%, 60%)`,
                size: 3 + Math.random() * 3
            });
        }
    }
    
    createUltimateEffect(x, y, range, icon) {
        // Massive screen-wide effect
        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * range * 2;
            this.particles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: Math.cos(angle) * (2 + Math.random() * 4),
                vy: Math.sin(angle) * (2 + Math.random() * 4) - 3,
                life: 1.0,
                decay: 0.008,
                color: `hsl(${Math.random() * 40 + 300}, 100%, ${50 + Math.random() * 30}%)`,
                size: 4 + Math.random() * 5
            });
        }
    }
    
    getHealthPercent() {
        return this.health / this.maxHealth;
    }
    
    isAlive() {
        return !this.isDestroyed && this.health > 0;
    }
}

class BossSystem {
    constructor() {
        this.boss = null;
        this.bossActive = false;
        this.bossX = 9; // Right side of grid
        this.bossY = 3;
        this.bossDefeated = false;
    }
    
    spawnBoss() {
        this.boss = new Boss(this.bossX, this.bossY);
        this.bossActive = true;
        this.bossDefeated = false;
        console.log("FINAL BOSS SPAWNED!");
        return this.boss;
    }
    
    getBoss() {
        return this.boss;
    }
    
    isBossActive() {
        return this.bossActive && this.boss && !this.boss.isDestroyed;
    }
    
    isBossDefeated() {
        return this.bossDefeated;
    }
    
    update(dt) {
        if (!this.bossActive || !this.boss) return;
        
        this.boss.update(dt);
        
        if (this.boss.isDestroyed && this.boss.defeatAnimation && this.boss.defeatAnimation.phase === 'finished') {
            this.bossDefeated = true;
            this.bossActive = false;
        }
    }
    
    // Render boss health bar
    renderHealthBar(ctx, cellSize) {
        if (!this.boss || !this.bossActive) return;
        
        const x = this.boss.x * cellSize;
        const y = (this.boss.y - 2) * cellSize; // Above boss
        const barWidth = 6 * cellSize; // Wider than tower
        const barHeight = 12;
        
        // Background
        ctx.fillStyle = '#1a0f05';
        ctx.fillRect(x - cellSize, y, barWidth, barHeight);
        
        // Health fill with phase color
        const healthPercent = this.boss.getHealthPercent();
        const phaseData = BOSS_PHASES[this.boss.currentPhase];
        
        // Gradient health bar
        const gradient = ctx.createLinearGradient(x - cellSize, y, x - cellSize + barWidth, y);
        if (healthPercent > 0.6) {
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(1, '#2E7D32');
        } else if (healthPercent > 0.3) {
            gradient.addColorStop(0, '#FFC107');
            gradient.addColorStop(1, '#FFA000');
        } else {
            gradient.addColorStop(0, '#F44336');
            gradient.addColorStop(1, '#C62828');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(x - cellSize, y, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - cellSize, y, barWidth, barHeight);
        
        // Boss name and phase
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${phaseData.name} — Phase ${this.boss.currentPhase}/3`,
            x - cellSize + barWidth / 2,
            y - 5
        );
        
        // Health text
        ctx.font = '11px Arial';
        ctx.fillText(
            `${Math.ceil(this.boss.health)}/${this.boss.maxHealth}`,
            x - cellSize + barWidth / 2,
            y + barHeight + 16
        );
        
        // Phase transition indicator
        if (this.boss.isTransitioning) {
            const elapsed = Date.now() - this.boss.transitionStartTime;
            const progress = Math.min(elapsed / this.boss.transitionDuration, 1);
            
            ctx.fillStyle = `rgba(255, 215, 0, ${0.5 + Math.sin(Date.now() * 0.01) * 0.3})`;
            ctx.font = 'bold 16px Arial';
            ctx.fillText(
                `⚡ PHASE TRANSITION ⚡`,
                x - cellSize + barWidth / 2,
                y + barHeight + 35
            );
        }
    }
    
    // Render boss on canvas
    renderBoss(ctx, cellSize) {
        if (!this.boss || !this.bossActive) return;
        
        const boss = this.boss;
        
        // Apply screen shake
        if (boss.screenShake > 0) {
            ctx.save();
            ctx.translate(
                (Math.random() - 0.5) * boss.screenShake,
                (Math.random() - 0.5) * boss.screenShake
            );
        }
        
        // Apply flash effect
        if (boss.flashIntensity > 0) {
            ctx.globalAlpha = 1.0 - boss.flashIntensity * 0.5;
        }
        
        const x = boss.x * cellSize;
        const y = boss.y * cellSize;
        const w = 4 * cellSize;
        const h = 6 * cellSize;
        
        if (boss.isDestroyed && boss.defeatAnimation && boss.defeatAnimation.phase !== 'finished') {
            this.renderDefeatAnimation(ctx, cellSize);
        } else if (boss.isTransitioning) {
            this.renderPhaseTransition(ctx, cellSize);
        } else {
            this.renderBossBody(ctx, cellSize, x, y, w, h);
        }
        
        // Render particles
        this.renderParticles(ctx, cellSize, boss.particles);
        
        // Render defeat animation particles
        if (boss.defeatAnimation) {
            this.renderParticles(ctx, cellSize, boss.defeatAnimation.particles);
        }
        
        // Restore context
        if (boss.screenShake > 0 || boss.flashIntensity > 0) {
            ctx.restore();
        }
    }
    
    renderBossBody(ctx, cellSize, x, y, w, h) {
        const boss = this.boss;
        
        // Determine color based on health and phase
        let color = boss.phaseColor;
        const healthPercent = boss.getHealthPercent();
        
        if (healthPercent < 0.5) {
            // Blend with secondary color when damaged
            color = boss.phaseSecondaryColor;
        }
        
        // Boss body - large organic shape
        ctx.fillStyle = color;
        ctx.beginPath();
        // Main trunk/body
        ctx.ellipse(x + w/2, y + h * 0.7, w * 0.4, h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Upper body
        ctx.ellipse(x + w/2, y + h * 0.35, w * 0.35, h * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head/crown area
        ctx.ellipse(x + w/2, y + h * 0.1, w * 0.3, h * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Phase-specific details
        this.renderPhaseDetails(ctx, cellSize, x, y, w, h);
        
        // Eyes (glowing)
        ctx.fillStyle = healthPercent < 0.3 ? '#ff0000' : healthPercent < 0.6 ? '#ffaa00' : '#00ff00';
        ctx.beginPath();
        ctx.arc(x + w * 0.35, y + h * 0.15, w * 0.06, 0, Math.PI * 2);
        ctx.arc(x + w * 0.65, y + h * 0.15, w * 0.06, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + w * 0.35, y + h * 0.15, w * 0.02, 0, Math.PI * 2);
        ctx.arc(x + w * 0.65, y + h * 0.15, w * 0.02, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = '#2d1a08';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    renderPhaseDetails(ctx, cellSize, x, y, w, h) {
        const boss = this.boss;
        
        switch (boss.currentPhase) {
            case 1: // Root Guardian - roots and bark
                ctx.strokeStyle = '#4A2511';
                ctx.lineWidth = 2;
                // Root lines
                for (let i = 0; i < 5; i++) {
                    const rx = x + w * 0.1 + i * w * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(rx, y + h * 0.9);
                    ctx.lineTo(rx + (Math.random() - 0.5) * 10, y + h * 1.2);
                    ctx.stroke();
                }
                // Bark texture lines
                ctx.strokeStyle = '#5D3A1A';
                ctx.lineWidth = 1;
                for (let i = 0; i < 8; i++) {
                    const ty = y + h * 0.2 + i * h * 0.1;
                    ctx.beginPath();
                    ctx.moveTo(x + w * 0.2, ty);
                    ctx.lineTo(x + w * 0.8, ty + (Math.random() - 0.5) * 5);
                    ctx.stroke();
                }
                break;
                
            case 2: // Thorn Sovereign - thorns and roses
                // Thorns
                ctx.fillStyle = '#8F2D56';
                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI * 2 * i) / 12;
                    const tx = x + w/2 + Math.cos(angle) * w * 0.5;
                    const ty = y + h * 0.4 + Math.sin(angle) * h * 0.3;
                    const thornSize = 8 + Math.random() * 8;
                    ctx.beginPath();
                    ctx.moveTo(tx, ty);
                    ctx.lineTo(tx + Math.cos(angle) * thornSize, ty + Math.sin(angle) * thornSize);
                    ctx.lineTo(tx + Math.cos(angle + 0.3) * thornSize * 0.5, ty + Math.sin(angle + 0.3) * thornSize * 0.5);
                    ctx.closePath();
                    ctx.fill();
                }
                // Rose buds
                ctx.fillStyle = '#FF6B9D';
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 * i) / 6 + Date.now() * 0.001;
                    const rx = x + w/2 + Math.cos(angle) * w * 0.45;
                    const ry = y + h * 0.5 + Math.sin(angle) * h * 0.3;
                    ctx.beginPath();
                    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 3: // Carniflora Prime - eldritch horror
                // Pulsing aura
                const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
                ctx.strokeStyle = `rgba(74, 14, 78, ${pulse})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x + w/2, y + h * 0.4, w * 0.6 * pulse, 0, Math.PI * 2);
                ctx.stroke();
                
                // Floating runes/symbols
                ctx.fillStyle = `rgba(255, 0, 255, ${pulse})`;
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 * i) / 5 + Date.now() * 0.0005;
                    const rx = x + w/2 + Math.cos(angle) * w * 0.7;
                    const ry = y + h * 0.4 + Math.sin(angle) * h * 0.5;
                    ctx.fillText(['⚡','👁️','🌀','☠️','∞'][i], rx, ry);
                }
                
                // Tendrils
                ctx.strokeStyle = '#4A0E4E';
                ctx.lineWidth = 3;
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8 + Date.now() * 0.002;
                    const len = 40 + Math.sin(Date.now() * 0.003 + i) * 20;
                    ctx.beginPath();
                    ctx.moveTo(x + w/2, y + h * 0.4);
                    ctx.quadraticCurveTo(
                        x + w/2 + Math.cos(angle) * len * 0.5,
                        y + h * 0.4 + Math.sin(angle) * len * 0.5,
                        x + w/2 + Math.cos(angle) * len,
                        y + h * 0.4 + Math.sin(angle) * len
                    );
                    ctx.stroke();
                }
                break;
        }
    }
    
    renderPhaseTransition(ctx, cellSize) {
        const boss = this.boss;
        const elapsed = Date.now() - boss.transitionStartTime;
        const progress = Math.min(elapsed / boss.transitionDuration, 1);
        
        const x = boss.x * cellSize;
        const y = boss.y * cellSize;
        const w = 4 * cellSize;
        const h = 6 * cellSize;
        
        // Expanding ring effect
        const ringRadius = w * progress * 2;
        const alpha = 1.0 - progress;
        
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x + w/2, y + h * 0.4, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner glow
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(x + w/2, y + h * 0.4, ringRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Rising text
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `PHASE ${boss.currentPhase + 1}: ${BOSS_PHASES[boss.currentPhase + 1].name}`,
            x + w/2,
            y - 20 - progress * 30
        );
    }
    
    renderDefeatAnimation(ctx, cellSize) {
        const boss = this.boss;
        const anim = boss.defeatAnimation;
        const elapsed = Date.now() - boss.defeatStartTime;
        const progress = Math.min(elapsed / boss.defeatDuration, 1);
        
        const x = boss.x * cellSize;
        const y = boss.y * cellSize;
        const w = 4 * cellSize;
        const h = 6 * cellSize;
        
        // Screen flash
        if (anim.screenFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${anim.screenFlash * 0.5})`;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        
        // Collapsing boss form
        const collapseProgress = progress;
        const scale = 1.0 - collapseProgress * 0.8;
        
        ctx.save();
        ctx.translate(x + w/2, y + h * 0.5);
        ctx.scale(scale, scale);
        ctx.translate(-(x + w/2), -(y + h * 0.5));
        
        // Darkening boss
        ctx.fillStyle = `rgba(26, 15, 5, ${1 - progress * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(x + w/2, y + h * 0.7, w * 0.4, h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.ellipse(x + w/2, y + h * 0.35, w * 0.35, h * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.ellipse(x + w/2, y + h * 0.1, w * 0.3, h * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Victory text
        if (progress > 0.5) {
            const textAlpha = (progress - 0.5) * 2;
            ctx.fillStyle = `rgba(255, 215, 0, ${textAlpha})`;
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('VICTORY!', ctx.canvas.width / 2, ctx.canvas.height / 2 - 50);
            
            ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
            ctx.font = '24px Arial';
            ctx.fillText('The Carniflora Prime has been defeated', ctx.canvas.width / 2, ctx.canvas.height / 2 + 10);
        }
    }
    
    renderParticles(ctx, cellSize, particles) {
        for (const p of particles) {
            if (p.life <= 0) continue;
            
            const px = (p.x) * cellSize;
            const py = (p.y) * cellSize;
            
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            
            if (p.rotation !== undefined) {
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(p.rotation);
                ctx.beginPath();
                ctx.arc(0, 0, p.size * cellSize * 0.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(px, py, p.size * cellSize * 0.1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1.0;
    }
    
    reset() {
        this.boss = null;
        this.bossActive = false;
        this.bossDefeated = false;
    }
}

// Global boss system instance
const bossSystem = new BossSystem();