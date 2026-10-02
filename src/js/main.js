// Main game controller for Carniflora Tower Offence

class GameController {
    constructor() {
        this.gameState = 'menu'; // menu, playing, paused, gameOver, win, bossBattle
        this.currentWave = 1;
        this.selectedPlant = null;
        this.bossWave = 5; // Boss appears at wave 5

        // Resource management
        this.sun = 100;
        this.minerals = 50;

        this.grid = [];
        this.gridWidth = 10;
        this.gridHeight = 8;

        this.plantSystem = plantSystem; // Reference to plant system
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.cellSize = 50; // pixels per grid cell

        this.init();
    }

    init() {
        this.createGrid();
        this.setupEventListeners();
        this.updateDisplay();
        console.log("Game initialized");
    }

    createGrid() {
        const gridContainer = document.getElementById('game-grid');
        gridContainer.innerHTML = '';

        for (let y = 0; y < this.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                this.grid[y][x] = null;
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('click', () => this.handleCellClick(x, y));
                gridContainer.appendChild(cell);
            }
        }
    }

    setupEventListeners() {
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('pause-game').addEventListener('click', () => this.pauseGame());
        document.getElementById('next-wave').addEventListener('click', () => this.nextWave());
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.continueLevel());
        }

        this.setupPlantSelection();
    }

    setupPlantSelection() {
        const plantContainer = document.getElementById('plant-selection');
        plantContainer.innerHTML = '';
        const plants = PlantData.getAllPlants();
        plants.forEach(plant => {
            const plantElement = document.createElement('div');
            plantElement.className = 'plant-option';
            plantElement.dataset.plantName = plant.name;
            plantElement.innerHTML = `
                <span class="plant-icon">${this.getPlantIcon(plant.type)}</span>
                <div class="plant-name">${plant.name}</div>
                <div class="plant-cost">Cost: ${plant.sunCost} sun, ${plant.mineralCost} minerals</div>
                <div class="plant-ability">${plant.description}</div>
            `;
            plantElement.addEventListener('click', () => this.selectPlant(plant));
            plantContainer.appendChild(plantElement);
        });
    }

    selectPlant(plant) {
        this.selectedPlant = plant;
        document.querySelectorAll('.plant-option').forEach(el => el.classList.remove('selected'));
        event.currentTarget?.classList.add('selected');
        plantInfoPanel.showPlantInfo(plant);
        console.log(`Selected plant: ${plant.name}`);
    }

    handleCellClick(x, y) {
        if (this.gameState !== 'playing' || !this.selectedPlant) return;
        if (this.isValidPlacement(x, y)) {
            if (this.hasResources(this.selectedPlant)) {
                this.placePlant(x, y);
                this.spendResources(this.selectedPlant);
                this.updateDisplay();
                console.log(`Placed ${this.selectedPlant.name} at (${x}, ${y})`);
            } else {
                alert('Not enough resources!');
            }
        }
    }

    isValidPlacement(x, y) {
        return (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight && !this.grid[y][x]);
    }

    placePlant(x, y) {
        const cell = document.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
        cell.className = 'grid-cell plant';
        cell.innerHTML = `<span class="plant-icon">${this.getPlantIcon(this.selectedPlant.type)}</span>`;
        this.grid[y][x] = { type: 'plant', name: this.selectedPlant.name, x, y };
        this.plantSystem.createPlant(this.selectedPlant.name, x, y);
        console.log(`Plant placed at (${x}, ${y})`);
    }

    startGame() {
        this.gameState = 'playing';
        this.currentWave = 1;
        this.sun = 100;
        this.minerals = 50;

        // Set up enemy tower defenses
        defenseSystem.setupDefaultDefenses();
        
        // Create the enemy tower
        towerSystem.createTower();
        
        // Reset boss system
        bossSystem.reset();

        this.renderDefenses();
        this.updateDisplay();
        console.log("Game started");

        // Set up game loop for updates
        this.gameLoop();
    }

    pauseGame() {
        this.gameState = this.gameState === 'playing' ? 'paused' : 'playing';
        console.log(`Game ${this.gameState}`);
    }

    nextWave() {
        if (this.gameState === 'playing') {
            this.currentWave++;
            console.log(`Next wave: ${this.currentWave}`);
            this.updateDisplay();
        }
    }

    continueLevel() {
        if (this.gameState === 'win') {
            // Advance to next level: simply start the next wave
            this.gameState = 'playing';
            this.currentWave++;
            console.log(`Continuing to wave ${this.currentWave}`);
            this.updateDisplay();
            this.gameLoop();
        }
    }

    returnToMenu() {
        // Reset game state completely
        this.gameState = 'menu';
        this.currentWave = 1;
        this.sun = 100;
        this.minerals = 50;
        this.selectedPlant = null;
        
        // Reset all systems
        this.plantSystem.plants = [];
        this.plantSystem.plantCount = 0;
        
        enemySystem.enemies = [];
        enemySystem.enemyCount = 0;
        
        defenseSystem.defenses = [];
        projectiles.length = 0;
        
        towerSystem.reset();
        
        // Reset grid
        this.createGrid();
        
        // Hide win screen if showing
        if (window.winScreen) {
            window.winScreen.hide();
        }
        
        // Update display
        this.updateDisplay();
        
        console.log("Returned to main menu");
    }

    hasResources(plant) {
        return this.sun >= plant.sunCost && this.minerals >= plant.mineralCost;
    }

    spendResources(plant) {
        this.sun -= plant.sunCost;
        this.minerals -= plant.mineralCost;
    }

    getPlantIcon(type) {
        switch (type) {
            case 'trapping': return '🌿';
            case 'shooting': return '🔫';
            case 'manipulation': return '🧬';
            default: return '🌱';
        }
    }

    updateDisplay() {
        document.getElementById('sun-count').textContent = this.sun;
        document.getElementById('minerals-count').textContent = this.minerals;
        document.getElementById('wave-number').textContent = this.currentWave;
        const enemyCount = enemySystem.getEnemyCount();
        const statusElement = document.getElementById('game-status');
        
        if (this.gameState === 'win') {
            statusElement.innerHTML = `<p style="color: gold;">🏆 VICTORY! Tower Destroyed! Wave ${this.currentWave} Complete</p>`;
        } else {
            statusElement.innerHTML = `<p>Wave ${this.currentWave} | Enemies: ${enemyCount} | Sun: ${this.sun}</p>`;
        }
    }

    // Called when tower is destroyed
    onTowerDestroyed() {
        this.gameState = 'win';
        console.log("WIN CONDITION TRIGGERED - Tower Destroyed!");

        // Show win screen with stats and options
        if (window.winScreen) {
            window.winScreen.show();
        } else {
            // Fallback if win screen not loaded yet
            const continueBtn = document.getElementById('continue-btn');
            if (continueBtn) {
                continueBtn.style.display = 'inline-block';
            }
            this.updateDisplay();
        }
    }

    triggerBossBattle() {
        this.gameState = 'bossBattle';
        bossSystem.spawnBoss();
        
        // Hide tower during boss battle
        const tower = towerSystem.getTower();
        if (tower) {
            tower.isDestroyed = true; // Visually hide tower
        }
        
        // Update status display
        const statusElement = document.getElementById('game-status');
        if (statusElement) {
            statusElement.innerHTML = `<p style="color: #FFD700; font-size: 1.2em;">⚠️ BOSS BATTLE: ${bossSystem.getBoss().phaseName} APPROACHES! ⚠️</p>`;
        }
        
        console.log("BOSS BATTLE INITIATED!");
    }

    onBossDefeated() {
        this.gameState = 'win';
        console.log("WIN CONDITION TRIGGERED - Final Boss Defeated!");

        // Show win screen with special boss victory message
        if (window.winScreen) {
            window.winScreen.showBossVictory();
        } else {
            const continueBtn = document.getElementById('continue-btn');
            if (continueBtn) {
                continueBtn.style.display = 'inline-block';
                continueBtn.textContent = 'Claim Victory';
            }
            this.updateDisplay();
        }
    }

    renderDefenses() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render defenses
        const defenses = defenseSystem.getAllDefenses();
        for (const defense of defenses) {
            if (!defense.alive) continue;
            const x = defense.x * this.cellSize + this.cellSize / 2;
            const y = defense.y * this.cellSize + this.cellSize / 2;
            
            // Defense icon
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(defense.icon, x, y);
        }
    }

    renderProjectiles() {
        if (!this.ctx) return;
        const projectiles = defenseSystem.getProjectiles();
        for (const proj of projectiles) {
            if (!proj.alive) continue;
            const x = proj.x * this.cellSize;
            const y = proj.y * this.cellSize;
            
            this.ctx.fillStyle = proj.color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderPlantHealth() {
        if (!this.ctx) return;
        const plants = this.plantSystem.getAllPlants();
        for (const plant of plants) {
            if (!plant.alive) continue;
            
            const x = plant.x * this.cellSize;
            const y = plant.y * this.cellSize;
            const barWidth = this.cellSize;
            const barHeight = 6;
            const healthPercent = plant.health / plant.maxHealth;
            
            // Background
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(x, y - 10, barWidth, barHeight);
            
            // Health
            this.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
            this.ctx.fillRect(x, y - 10, barWidth * healthPercent, barHeight);
            
            // Border
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y - 10, barWidth, barHeight);
        }
    }

    renderTower() {
        if (!this.ctx) return;
        towerSystem.renderTower(this.ctx, this.cellSize);
        towerSystem.renderHealthBar(this.ctx, this.cellSize);
    }

    // Check if any plants can attack the tower
    checkTowerAttacks() {
        if (!towerSystem.getTower() || towerSystem.getTower().isDestroyed) return;
        
        const plants = this.plantSystem.getAllPlants();
        for (const plant of plants) {
            if (!plant.alive || plant.isOnCooldown) continue;
            
            // Check if plant is in range to attack tower
            const result = towerSystem.attackTower(plant, plant.damage);
            if (result.hit) {
                // Plant attacked tower - set cooldown
                plant.lastActivated = Date.now();
                plant.isOnCooldown = true;
                setTimeout(() => {
                    plant.isOnCooldown = false;
                }, plant.cooldownTime);
                
                console.log(`${plant.name} attacks tower for ${plant.damage} damage!`);
                
                // Re-render tower health bar
                this.renderTower();
            }
        }
    }

    gameLoop() {
        if (this.gameState === 'playing' || this.gameState === 'bossBattle') {
            const dt = 0.1; // ~10 fps time delta
            
            // Update plants for cooldowns and such
            this.plantSystem.update();

            // Update enemy defense system (defenses fire, projectiles move, check damage)
            defenseSystem.update();

            // Update tower system (destruction animation)
            towerSystem.update();

            // Update boss system
            bossSystem.update(dt);

            // Check if we should spawn the boss
            if (this.currentWave >= this.bossWave && !bossSystem.isBossActive() && !bossSystem.isBossDefeated()) {
                this.triggerBossBattle();
            }

            // Check if plants can attack the tower (only if not in boss battle)
            if (this.gameState !== 'bossBattle') {
                this.checkTowerAttacks();
            }

            // Check if all plants are dead (game over)
            if (this.plantSystem.areAllPlantsDead() && this.plantSystem.plants.length > 0) {
                this.gameState = 'gameOver';
                console.log("Game Over — all plants destroyed by enemy defenses!");
                alert("Game Over! Enemy defenses have destroyed all your plants.");
                return;
            }

            // Check win condition (tower destroyed)
            if (towerSystem.isTowerDestroyed()) {
                this.onTowerDestroyed();
                return;
            }

            // Check boss defeat win condition
            if (bossSystem.isBossDefeated()) {
                this.onBossDefeated();
                return;
            }

            // Render updates
            this.renderDefenses();
            this.renderProjectiles();
            this.renderPlantHealth();
            this.renderTower();
            
            // Render boss if active
            if (bossSystem.isBossActive()) {
                bossSystem.renderBoss(this.ctx, this.cellSize);
                bossSystem.renderHealthBar(this.ctx, this.cellSize);
            }

            setTimeout(() => this.gameLoop(), 100);
        }
    }
}

// Initialize game when page loads
let gameController;
let winScreen;

window.addEventListener('DOMContentLoaded', () => {
    gameController = new GameController();
    // Initialize win screen after game controller is ready
    setTimeout(() => {
        winScreen = new WinScreen(gameController);
        // Make it globally accessible
        window.winScreen = winScreen;
        console.log("Win screen initialized");
    }, 100);
    console.log("Game controller loaded");
});