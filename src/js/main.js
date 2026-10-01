// Main game controller for Carniflora Tower Offence

class GameController {
    constructor() {
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.currentWave = 1;
        this.selectedPlant = null;
        
        // Resource management
        this.sun = 100;
        this.minerals = 50;
        
        this.grid = [];
        this.gridWidth = 10;
        this.gridHeight = 8;
        
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
                
                // Add click event for plant placement
                cell.addEventListener('click', (e) => this.handleCellClick(x, y));
                
                gridContainer.appendChild(cell);
            }
        }
    }
    
    setupEventListeners() {
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('pause-game').addEventListener('click', () => this.pauseGame());
        document.getElementById('next-wave').addEventListener('click', () => this.nextWave());
        
        // Initialize plant selection
        this.setupPlantSelection();
    }
    
    setupPlantSelection() {
        const plantContainer = document.getElementById('plant-selection');
        plantContainer.innerHTML = '';
        
        // Add plant options from PlantData
        const plants = PlantData.getAllPlants();
        plants.forEach(plant => {
            const plantElement = document.createElement('div');
            plantElement.className = 'plant-option';
            plantElement.dataset.plantName = plant.name;
            
            plantElement.innerHTML = `
                <span class="plant-icon">${this.getPlantIcon(plant.type)}</span>
                <div class="plant-name">${plant.name}</div>
                <div class="plant-cost">Cost: ${plant.sunCost} sun, ${plant.mineralCost} minerals</div>
            `;
            
            plantElement.addEventListener('click', () => this.selectPlant(plant));
            plantContainer.appendChild(plantElement);
        });
    }
    
    handleCellClick(x, y) {
        if (this.gameState !== 'playing' || !this.selectedPlant) return;
        
        // Check if location is valid for placement
        if (this.isValidPlacement(x, y)) {
            // Check if player has enough resources
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
        // Check if cell is empty and within bounds
        return (x >= 0 && x < this.gridWidth && 
                y >= 0 && y < this.gridHeight && 
                !this.grid[y][x]);
    }
    
    placePlant(x, y) {
        const cell = document.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
        cell.className = 'grid-cell plant';
        cell.innerHTML = `<span class="plant-icon">${this.getPlantIcon(this.selectedPlant.type)}</span>`;
        
        // Store planted location
        this.grid[y][x] = {
            type: 'plant',
            name: this.selectedPlant.name,
            x: x,
            y: y
        };
        
        console.log(`Plant placed at (${x}, ${y})`);
    }
    
    selectPlant(plant) {
        this.selectedPlant = plant;
        
        // Update UI to show selection
        document.querySelectorAll('.plant-option').forEach(el => {
            el.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        
        console.log(`Selected plant: ${plant.name}`);
    }
    
    startGame() {
        this.gameState = 'playing';
        this.currentWave = 1;
        this.sun = 100;
        this.minerals = 50;
        this.updateDisplay();
        console.log("Game started");
    }
    
    pauseGame() {
        this.gameState = this.gameState === 'playing' ? 'paused' : 'playing';
        console.log(`Game ${this.gameState}`);
    }
    
    nextWave() {
        if (this.gameState === 'playing') {
            this.currentWave++;
            // For demo purposes, just increment wave
            console.log(`Next wave: ${this.currentWave}`);
            this.updateDisplay();
        }
    }
    
    hasResources(plant) {
        return (this.sun >= plant.sunCost && this.minerals >= plant.mineralCost);
    }
    
    spendResources(plant) {
        this.sun -= plant.sunCost;
        this.minerals -= plant.mineralCost;
    }
    
    updateDisplay() {
        document.getElementById('sun-count').textContent = this.sun;
        document.getElementById('minerals-count').textContent = this.minerals;
        document.getElementById('wave-number').textContent = this.currentWave;
        
        const statusElement = document.getElementById('game-status');
        statusElement.innerHTML = `<p>Wave ${this.currentWave} | Enemies: 5 | Sun: ${this.sun}</p>`;
    }
    
    getPlantIcon(type) {
        // Return plant emojis based on type
        switch (type) {
            case 'trapping': return '🌿';
            case 'shooting': return '🔫';
            case 'manipulation': return '🧬';
            default: return '🌱';
        }
    }
}

// Initialize game when page loads
let gameController;

window.addEventListener('DOMContentLoaded', () => {
    gameController = new GameController();
    console.log("Game controller loaded");
});