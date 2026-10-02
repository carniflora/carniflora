// Win Screen System — Handles victory UI, stats, and player choices
// EPIC 7 / US 7.1 — Win Condition, US 7.4 — Restart Failed Level, US 7.5 — Continue from Successful Level

class WinScreen {
    constructor(gameController) {
        this.gameController = gameController;
        this.overlay = null;
        this.stats = {};
        this.init();
    }

    init() {
        // Create the win screen overlay element
        this.overlay = document.createElement('div');
        this.overlay.id = 'win-screen-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Arial', sans-serif;
        `;
        document.body.appendChild(this.overlay);
    }

    // Calculate and return win statistics
    calculateStats() {
        const gc = this.gameController;
        const plants = gc.plantSystem.getAllPlants().filter(p => p.alive);
        const totalDamageDealt = this.getTotalDamageDealt();
        const enemiesDefeated = this.getEnemiesDefeated();
        
        this.stats = {
            wave: gc.currentWave,
            plantsSurvived: plants.length,
            totalPlantsPlaced: gc.plantSystem.plants.length,
            sunRemaining: gc.sun,
            mineralsRemaining: gc.minerals,
            totalDamageDealt: totalDamageDealt,
            enemiesDefeated: enemiesDefeated,
            towerHealthRemaining: 0, // Tower is destroyed
            score: this.calculateScore(gc.currentWave, plants.length, gc.sun, gc.minerals, enemiesDefeated)
        };
        return this.stats;
    }

    calculateScore(wave, plantsSurvived, sunRemaining, mineralsRemaining, enemiesDefeated) {
        // Score formula: wave bonus + survival bonus + resource bonus + enemy bonus
        const waveBonus = wave * 500;
        const survivalBonus = plantsSurvived * 200;
        const resourceBonus = sunRemaining + (mineralsRemaining * 2);
        const enemyBonus = enemiesDefeated * 100;
        return waveBonus + survivalBonus + resourceBonus + enemyBonus;
    }

    getTotalDamageDealt() {
        // Estimate total damage based on plants' damage potential and wave
        let total = 0;
        const plants = this.gameController.plantSystem.getAllPlants();
        for (const plant of plants) {
            // Each plant could have attacked multiple times
            const attacksPerWave = Math.floor(60 / (plant.cooldown || 3)); // ~60 second wave
            total += plant.damage * attacksPerWave * this.gameController.currentWave;
        }
        return total;
    }

    getEnemiesDefeated() {
        // Estimate enemies defeated based on wave
        // Each wave spawns enemiesPerWave * multiplier^(wave-1)
        const baseEnemies = 5;
        const multiplier = 1.5;
        let total = 0;
        for (let w = 1; w <= this.gameController.currentWave; w++) {
            total += Math.floor(baseEnemies * Math.pow(multiplier, w - 1));
        }
        return total;
    }

    // Build and show the win screen
    show() {
        this.calculateStats();
        
        this.overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a3a1a 0%, #2d5a2d 100%);
                border: 3px solid #4CAF50;
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                color: white;
                box-shadow: 0 0 40px rgba(76, 175, 80, 0.4);
                animation: winSlideIn 0.5s ease-out;
            ">
                <style>
                    @keyframes winSlideIn {
                        from { opacity: 0; transform: scale(0.8) translateY(-50px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    .win-title { 
                        font-size: 2.5em; 
                        color: #FFD700; 
                        margin-bottom: 10px;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                    }
                    .win-subtitle { 
                        font-size: 1.2em; 
                        color: #90EE90; 
                        margin-bottom: 30px;
                    }
                    .stats-grid { 
                        display: grid; 
                        grid-template-columns: repeat(2, 1fr); 
                        gap: 15px; 
                        margin-bottom: 30px;
                        text-align: left;
                    }
                    .stat-item { 
                        background: rgba(255,255,255,0.1); 
                        padding: 15px; 
                        border-radius: 10px;
                        border-left: 4px solid #4CAF50;
                    }
                    .stat-label { 
                        font-size: 0.85em; 
                        color: #BBB; 
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .stat-value { 
                        font-size: 1.5em; 
                        font-weight: bold; 
                        color: #FFD700;
                    }
                    .score-display {
                        background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                        color: #1a1a1a;
                        padding: 20px;
                        border-radius: 10px;
                        margin-bottom: 30px;
                    }
                    .score-label { font-size: 0.9em; text-transform: uppercase; letter-spacing: 2px; }
                    .score-value { font-size: 2.5em; font-weight: bold; }
                    .btn-container { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
                    .win-btn { 
                        padding: 15px 30px; 
                        font-size: 1.1em; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        transition: all 0.2s;
                        min-width: 160px;
                        font-weight: bold;
                    }
                    .continue-btn { 
                        background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
                        color: white;
                    }
                    .continue-btn:hover { 
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(76, 175, 80, 0.5);
                    }
                    .menu-btn { 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .menu-btn:hover { 
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.5);
                    }
                </style>
                <h1 class="win-title">🏆 VICTORY! 🏆</h1>
                <p class="win-subtitle">Enemy Tower Destroyed — Wave ${this.stats.wave} Complete</p>
                
                <div class="score-display">
                    <div class="score-label">Final Score</div>
                    <div class="score-value">${this.stats.score.toLocaleString()}</div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Wave Reached</div>
                        <div class="stat-value">${this.stats.wave}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Plants Survived</div>
                        <div class="stat-value">${this.stats.plantsSurvived} / ${this.stats.totalPlantsPlaced}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Sun Remaining</div>
                        <div class="stat-value">${this.stats.sunRemaining}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Minerals Remaining</div>
                        <div class="stat-value">${this.stats.mineralsRemaining}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Enemies Defeated</div>
                        <div class="stat-value">${this.stats.enemiesDefeated}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Damage</div>
                        <div class="stat-value">${this.stats.totalDamageDealt.toLocaleString()}</div>
                    </div>
                </div>
                
                <div class="btn-container">
                    <button id="continue-next-level" class="win-btn continue-btn">▶ Continue to Wave ${this.stats.wave + 1}</button>
                    <button id="return-to-menu" class="win-btn menu-btn">🏠 Return to Menu</button>
                </div>
            </div>
        `;
        
        this.overlay.style.display = 'flex';
        
        // Add event listeners
        document.getElementById('continue-next-level').addEventListener('click', () => {
            this.continueToNextLevel();
        });
        
        document.getElementById('return-to-menu').addEventListener('click', () => {
            this.returnToMenu();
        });
    }

    continueToNextLevel() {
        this.hide();
        this.gameController.continueLevel();
    }

    returnToMenu() {
        this.hide();
        this.gameController.returnToMenu();
    }

    // Special victory screen for defeating the final boss
    showBossVictory() {
        this.calculateStats();
        
        // Add boss victory bonus to score
        this.stats.bossVictoryBonus = 5000;
        this.stats.score += this.stats.bossVictoryBonus;
        
        this.overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a0a2e 0%, #3a0a5a 50%, #1a0a2e 100%);
                border: 3px solid #FFD700;
                border-radius: 20px;
                padding: 40px;
                max-width: 600px;
                width: 90%;
                text-align: center;
                color: white;
                box-shadow: 0 0 60px rgba(255, 215, 0, 0.5), inset 0 0 60px rgba(255, 215, 0, 0.1);
                animation: bossWinSlideIn 0.8s ease-out;
                position: relative;
                overflow: hidden;
            ">
                <style>
                    @keyframes bossWinSlideIn {
                        from { opacity: 0; transform: scale(0.7) translateY(-50px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    @keyframes goldPulse {
                        0%, 100% { transform: scale(1); text-shadow: 0 0 20px #FFD700, 0 0 40px #FFD700; }
                        50% { transform: scale(1.05); text-shadow: 0 0 30px #FFD700, 0 0 60px #FFD700, 0 0 80px #FFD700; }
                    }
                    @keyframes sparkle {
                        0% { opacity: 0; transform: scale(0) rotate(0deg); }
                        50% { opacity: 1; transform: scale(1) rotate(180deg); }
                        100% { opacity: 0; transform: scale(0) rotate(360deg); }
                    }
                    .boss-win-title { 
                        font-size: 2.8em; 
                        color: #FFD700; 
                        margin-bottom: 10px;
                        animation: goldPulse 2s ease-in-out infinite;
                        font-family: 'Georgia', serif;
                    }
                    .boss-win-subtitle { 
                        font-size: 1.3em; 
                        color: #FFB347; 
                        margin-bottom: 10px;
                    }
                    .boss-win-epic {
                        font-size: 1.1em;
                        color: #E6E6FA;
                        margin-bottom: 30px;
                        font-style: italic;
                    }
                    .stats-grid { 
                        display: grid; 
                        grid-template-columns: repeat(3, 1fr); 
                        gap: 12px; 
                        margin-bottom: 25px;
                        text-align: left;
                    }
                    .stat-item { 
                        background: rgba(255,215,0,0.1); 
                        padding: 12px; 
                        border-radius: 10px;
                        border-left: 4px solid #FFD700;
                        transition: transform 0.2s;
                    }
                    .stat-item:hover { transform: translateX(5px); }
                    .stat-label { 
                        font-size: 0.8em; 
                        color: #FFD700; 
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .stat-value { 
                        font-size: 1.3em; 
                        font-weight: bold; 
                        color: white;
                    }
                    .score-display {
                        background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
                        color: #1a1a1a;
                        padding: 25px;
                        border-radius: 15px;
                        margin-bottom: 30px;
                        position: relative;
                        animation: goldPulse 3s ease-in-out infinite;
                    }
                    .score-label { font-size: 1em; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 5px; }
                    .score-value { font-size: 3em; font-weight: bold; }
                    .bonus-tag {
                        background: rgba(255,255,255,0.3);
                        padding: 5px 15px;
                        border-radius: 20px;
                        font-size: 0.9em;
                        margin-top: 10px;
                        display: inline-block;
                        animation: goldPulse 1.5s ease-in-out infinite;
                    }
                    .btn-container { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
                    .win-btn { 
                        padding: 18px 35px; 
                        font-size: 1.2em; 
                        border: none; 
                        border-radius: 10px; 
                        cursor: pointer; 
                        transition: all 0.2s;
                        min-width: 200px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .continue-btn { 
                        background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                        color: #1a1a1a;
                        box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
                    }
                    .continue-btn:hover { 
                        transform: translateY(-3px) scale(1.02);
                        box-shadow: 0 8px 30px rgba(255, 215, 0, 0.6);
                    }
                    .menu-btn { 
                        background: linear-gradient(135deg, #8A2BE2 0%, #4B0082 100%);
                        color: white;
                    }
                    .menu-btn:hover { 
                        transform: translateY(-3px) scale(1.02);
                        box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
                    }
                    .confetti { position: absolute; pointer-events: none; font-size: 24px; animation: confettiFall 3s linear infinite; }
                </style>
                <div class="confetti" style="left: 10%; animation-delay: 0s;">🌸</div>
                <div class="confetti" style="left: 20%; animation-delay: 0.5s;">🌿</div>
                <div class="confetti" style="left: 30%; animation-delay: 1s;">🌹</div>
                <div class="confetti" style="left: 40%; animation-delay: 1.5s;">👑</div>
                <div class="confetti" style="left: 50%; animation-delay: 2s;">✨</div>
                <div class="confetti" style="left: 60%; animation-delay: 2.5s;">💎</div>
                <div class="confetti" style="left: 70%; animation-delay: 3s;">🌻</div>
                <div class="confetti" style="left: 80%; animation-delay: 0.3s;">🍃</div>
                <div class="confetti" style="left: 90%; animation-delay: 0.8s;">🌺</div>
                <style>
                    @keyframes confettiFall {
                        0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
                        100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
                    }
                </style>
                
                <h1 class="boss-win-title">👑 CARNIFLORA PRIME DEFEATED! 👑</h1>
                <p class="boss-win-subtitle">The Ultimate Carnivorous Horror Has Fallen</p>
                <p class="boss-win-epic">"The grove is free. The roots remember. The blossoms will bloom again."</p>
                
                <div class="score-display">
                    <div class="score-label">Final Score</div>
                    <div class="score-value">${this.stats.score.toLocaleString()}</div>
                    <div class="bonus-tag">✨ BOSS VICTORY BONUS: +${this.stats.bossVictoryBonus.toLocaleString()} ✨</div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Final Wave</div>
                        <div class="stat-value">${this.stats.wave}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Plants Survived</div>
                        <div class="stat-value">${this.stats.plantsSurvived} / ${this.stats.totalPlantsPlaced}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Sun Remaining</div>
                        <div class="stat-value">${this.stats.sunRemaining}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Minerals Remaining</div>
                        <div class="stat-value">${this.stats.mineralsRemaining}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Enemies Defeated</div>
                        <div class="stat-value">${this.stats.enemiesDefeated}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Damage</div>
                        <div class="stat-value">${this.stats.totalDamageDealt.toLocaleString()}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Boss Phases</div>
                        <div class="stat-value">3 / 3</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Boss Forms</div>
                        <div class="stat-value">Root Guardian → Thorn Sovereign → Carniflora Prime</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Victory Type</div>
                        <div class="stat-value">🏆 COMPLETE VICTORY 🏆</div>
                    </div>
                </div>
                
                <div class="btn-container">
                    <button id="continue-next-level" class="win-btn continue-btn">🌱 NEW GAME+</button>
                    <button id="return-to-menu" class="win-btn menu-btn">🏠 MAIN MENU</button>
                </div>
            </div>
        `;
        
        this.overlay.style.display = 'flex';
        
        // Add event listeners
        document.getElementById('continue-next-level').addEventListener('click', () => {
            this.continueToNextLevel();
        });
        
        document.getElementById('return-to-menu').addEventListener('click', () => {
            this.returnToMenu();
        });
    }
    
    hide() {
        this.overlay.style.display = 'none';
    }
}

// Global win screen instance (will be initialized after gameController)
let winScreen;