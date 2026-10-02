// Enemy Defense System — Tower defenses (turrets/spikes) that attack plants
// EPIC 2 / US 2.2 — Enemy Defenses Attack Plants

// ── Defense types ──────────────────────────────────────────────────────────
// Each defense is placed on the enemy tower (right side of the grid).
// Defenses detect plants in range, fire projectiles on cooldown, and
// deal damage to the first plant they hit in their arc.

const DEFENSE_DEFS = {
    turret: {
        name: "Turret",
        icon: "🔫",
        damage: 20,
        range: 4,
        cooldown: 1500,   // ms between shots
        projectileSpeed: 4,
        projectileColor: "#ff4444",
        arcAngle: 60,     // degrees — narrow cone toward center
        description: "Rapid-fire turret, narrow arc, moderate damage"
    },
    spike: {
        name: "Spike Wall",
        icon: "🌵",
        damage: 15,
        range: 2,
        cooldown: 2000,
        projectileSpeed: 3,
        projectileColor: "#cc8800",
        arcAngle: 90,
        description: "Close-range spike launcher, wide arc, splash on hit"
    },
    cannon: {
        name: "Cannon",
        icon: "💣",
        damage: 50,
        range: 6,
        cooldown: 3000,
        projectileSpeed: 2,
        projectileColor: "#4444ff",
        arcAngle: 45,
        description: "Heavy cannon, long range, high damage, slow fire rate"
    }
};

// ── Projectile ─────────────────────────────────────────────────────────────
class Projectile {
    constructor(x, y, target, defense) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = defense.damage;
        this.speed = defense.projectileSpeed;
        this.color = defense.projectileColor;
        this.alive = true;
        this.splashRadius = defense.name === "Spike Wall" ? 1.0 : 0;
    }

    // Return unit-vector from projectile toward target
    _dir(tx, ty) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return { dx: -1, dy: 0 };
        return { dx: dx / dist, dy: dy / dist };
    }

    update(dt) {
        if (!this.alive) return;

        // Track target in case it moved
        let tx = this.target.x;
        let ty = this.target.y;
        // If target died while projectile was flying, keep last known pos
        if (!this.target.alive) {
            tx = this.target.lastX ?? tx;
            ty = this.target.lastY ?? ty;
        }

        const dir = this._dir(tx, ty);
        this.x += dir.dx * this.speed * dt;
        this.y += dir.dy * this.speed * dt;

        // Distance to target
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.speed * dt + 0.3) {
            this.alive = false;
            // Deal damage via plant system
            if (this.target && this.target.alive) {
                plantSystem.takeDamage(this.target.id, this.damage);
            }
            // Splash for spike wall
            if (this.splashRadius > 0) {
                const all = plantSystem.getAllPlants();
                for (const p of all) {
                    if (!p.alive || p.id === this.target?.id) continue;
                    const sdx = p.x - this.x;
                    const sdy = p.y - this.y;
                    if (Math.sqrt(sdx * sdx + sdy * sdy) < this.splashRadius) {
                        plantSystem.takeDamage(p.id, Math.floor(this.damage * 0.5));
                    }
                }
            }
        }
    }
}

// ── Defense ────────────────────────────────────────────────────────────────
class Defense {
    constructor(x, y, type) {
        const def = DEFENSE_DEFS[type];
        if (!def) throw new Error(`Unknown defense type: ${type}`);
        this.x = x;
        this.y = y;
        this.type = type;
        this.icon = def.icon;
        this.name = def.name;
        this.damage = def.damage;
        this.range = def.range;
        this.cooldownMs = def.cooldown;
        this.projectileSpeed = def.projectileSpeed;
        this.projectileColor = def.projectileColor;
        this.arcAngle = def.arcAngle;
        this.lastFireTime = 0;
        this.currentTarget = null;
        this.alive = true;
    }

    // Check if a plant is within range and arc
    _inArc(plant) {
        const dx = this.x - plant.x;
        const dy = this.y - plant.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Range check
        if (dist > this.range) return false;

        // Arc check — defenses face left (toward plant spawn)
        // Angle from defense to plant relative to 180° (straight left)
        let angle = Math.atan2(dy, -dx) * (180 / Math.PI); // -90..90
        if (angle < -90) angle += 180;
        if (angle > 90) angle -= 180;
        if (Math.abs(angle) > this.arcAngle / 2) return false;

        // Line-of-sight: no other enemy between defense and plant
        // (simplified — skip for now)

        return true;
    }

    // Find the closest plant within range and arc
    findTarget() {
        const plants = plantSystem.getAllPlants().filter(p => p.alive);
        let best = null;
        let bestDist = Infinity;
        for (const plant of plants) {
            if (this._inArc(plant)) {
                const d = Math.hypot(this.x - plant.x, this.y - plant.y);
                if (d < bestDist) {
                    bestDist = d;
                    best = plant;
                }
            }
        }
        return best;
    }

    fire() {
        const target = this.findTarget();
        if (!target) return;
        this.currentTarget = target;

        // Create projectile
        const proj = new Projectile(this.x, this.y, target, this);
        projectiles.push(proj);

        this.lastFireTime = Date.now();
    }

    update() {
        if (!this.alive) return;
        const now = Date.now();
        if (now - this.lastFireTime >= this.cooldownMs) {
            this.fire();
        }
    }
}

// ── Defense System ─────────────────────────────────────────────────────────
class DefenseSystem {
    constructor() {
        this.defenses = [];
    }

    // Place a defense on the tower (right side)
    addDefense(x, y, type) {
        const def = new Defense(x, y, type);
        this.defenses.push(def);
        console.log(`Enemy defense placed: ${def.name} at (${x}, ${y})`);
        return def;
    }

    // Default defenses for the tower — called automatically on game start
    setupDefaultDefenses() {
        // Clear any previous
        this.defenses = [];

        // Turret (center-top)
        this.addDefense(9, 1, "turret");
        // Spike wall (center)
        this.addDefense(9, 3, "spike");
        // Cannon (center-bottom)
        this.addDefense(9, 6, "cannon");
    }

    update() {
        for (const def of this.defenses) {
            def.update();
        }

        // Update projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            proj.update(0.1); // ~10 fps dt
            if (!proj.alive) {
                projectiles.splice(i, 1);
            }
        }
    }

    getAllDefenses() {
        return this.defenses;
    }

    getProjectiles() {
        return projectiles;
    }

    getDefenseDefs() {
        return DEFENSE_DEFS;
    }
}

// ── Global projectile list ─────────────────────────────────────────────────
const projectiles = []; // projectiles array shared between systems

// ── Export for use by main.js ──────────────────────────────────────────────
const defenseSystem = new DefenseSystem();
