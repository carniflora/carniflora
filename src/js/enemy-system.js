// Enemy system for Carnivorous Plants Tower Offence

class Enemy {
    constructor(x, y, type = 'standard') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.health = 100;
        this.maxHealth = 100;
        this.damage = 10;
        this.speed = 2;
        this.rewardSun = 10;
        this.targetX = 0; // Target position (player base)
        this.targetY = 0; // Should be updated to base position
    }
    
    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }
    
    // Move towards the target (simplified pathfinding)
    move() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.1) {
            this.x += (dx / distance) * this.speed * 0.02;
            this.y += (dy / distance) * this.speed * 0.02;
        }
    }
    
    getEnemyIcon() {
        switch (this.type) {
            case 'standard': return '🏰';
            case 'tank': return '🛡️'; 
            case 'fast': return '🏃';
            case 'boss': return '👑';
            default: return '👹';
        }
    }
}

class EnemySystem {
    constructor() {
        this.enemies = [];
        this.enemyCount = 0;
        this.spawnRate = 1000; // ms between spawns
        this.lastSpawnTime = 0;
    }
    
    spawnEnemy(x, y, type = 'standard') {
        const enemy = new Enemy(x, y, type);
        enemy.id = this.enemyCount++;
        this.enemies.push(enemy);
        return enemy;
    }
    
    update(deltaTime) {
        // Move all enemies towards target
        this.enemies.forEach(enemy => {
            enemy.move();
        });
        
        // Remove dead enemies
        this.enemies = this.enemies.filter(enemy => enemy.health > 0);
    }
    
    getEnemyCount() {
        return this.enemies.length;
    }
    
    getAllEnemies() {
        return this.enemies;
    }
}

// Initialize enemy system
const enemySystem = new EnemySystem();