// Resource system for Carnivorous Plants Tower Offence

class ResourceManager {
    constructor() {
        this.sun = 100;
        this.minerals = 50;
        this.collectionRate = 1; // Resources per second
        this.lastCollectionTime = Date.now();
        this.updateInterval = 1000; // Update every second
    }
    
    update(deltaTime) {
        const currentTime = Date.now();
        if (currentTime - this.lastCollectionTime >= this.updateInterval) {
            this.sun += this.collectionRate;
            this.minerals += Math.floor(this.collectionRate / 2); // Minerals at half rate
            
            this.lastCollectionTime = currentTime;
        }
    }
    
    canAfford(sunCost, mineralCost) {
        return (this.sun >= sunCost && this.minerals >= mineralCost);
    }
    
    spendResources(sunCost, mineralCost) {
        if (this.canAfford(sunCost, mineralCost)) {
            this.sun -= sunCost;
            this.minerals -= mineralCost;
            return true;
        }
        return false;
    }
    
    addResources(sunGain, mineralGain) {
        this.sun += sunGain;
        this.minerals += mineralGain
    }
    
    getResources() {
        return {
            sun: this.sun,
            minerals: this.minerals
        };
    }
    
    setResources(sun, minerals) {
        this.sun = sun;
        this.minerals = minerals;
    }
}

// Initialize resource manager
const resourceManager = new ResourceManager();