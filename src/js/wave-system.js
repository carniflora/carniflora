// Wave system for Carnivorous Plants Tower Offence

class WaveSystem {
    constructor() {
        this.currentWave = 1;
        this.enemiesPerWave = 5;
        this.waveInterval = 30000; // 30 seconds between waves
        this.lastWaveTime = Date.now();
        this.isWaveActive = false;
        this.enemyMultiplier = 1.5;
    }
    
    update(deltaTime) {
        if (this.isWaveActive) {
            const currentTime = Date.now();
            if (currentTime - this.lastWaveTime >= this.waveInterval) {
                this.startNextWave();
                this.lastWaveTime = currentTime;
                
                // Add rewards for completing wave
                resourceManager.addResources(20 * this.currentWave, 10 * this.currentWave);
            }
        }
    }
    
    startWave(waveNumber) {
        this.currentWave = waveNumber;
        this.isWaveActive = true;
        
        // Spawn enemies for this wave (simplified)
        const enemiesToSpawn = Math.floor(this.enemiesPerWave * Math.pow(this.enemyMultiplier, waveNumber - 1));
        
        for (let i = 0; i < enemiesToSpawn; i++) {
            // Spawn enemy at random spawn point
            const x = 0;
            const y = Math.random() * 8;
            const enemyType = this.getEnemyType();
            
            enemySystem.spawnEnemy(x, y, enemyType);
        }
        
        console.log(`Wave ${waveNumber} started with ${enemiesToSpawn} enemies`);
    }
    
    startNextWave() {
        this.currentWave++;
        this.startWave(this.currentWave);
    }
    
    getEnemyType() {
        const types = ['standard', 'standard', 'fast', 'tank', 'boss'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    getCurrentWave() {
        return this.currentWave;
    }
    
    isWaveActive() {
        return this.isWaveActive;
    }
    
    setIsWaveActive(active) {
        this.isWaveActive = active;
    }
}

// Initialize wave system
const waveSystem = new WaveSystem();