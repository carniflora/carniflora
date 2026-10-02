// Plant information panel with ability details

class PlantInfoPanel {
    constructor() {
        this.panel = document.getElementById('plant-info-panel');
        this.plantSystem = plantSystem;
        
        // Initialize with empty panel
        if (this.panel) {
            this.panel.innerHTML = '<h3>Plant Information</h3><p>Select a plant to see details</p>';
        }
    }
    
    showPlantInfo(plant) {
        if (!this.panel) return;
        
        // Create detailed information for the selected plant
        const abilityDesc = this.getAbilityDescription(plant);
        
        this.panel.innerHTML = `
            <h3>${plant.name}</h3>
            <div class="plant-type">${this.getPlantTypeIcon(plant.type)} ${this.getPlantTypeName(plant.type)}</div>
            <div class="plant-stats">
                <p>Damage: ${plant.damage}</p>
                <p>Range: ${plant.range}</p>
                <p>Cooldown: ${plant.cooldown}s</p>
                <p>Cost: ${plant.sunCost} sun, ${plant.mineralCost} minerals</p>
            </div>
            <div class="plant-ability">
                <strong>Ability:</strong> ${abilityDesc}
            </div>
            <div class="plant-description">${plant.description}</div>
        `;
    }
    
    getAbilityDescription(plant) {
        switch (plant.type) {
            case 'trapping':
                return "Trap enemies in area for damage over time";
            case 'shooting':
                return "Fire projectiles at enemies in range";
            case 'manipulation':
                return "Apply status effects like slow or poison";
            default:
                return "Standard plant ability";
        }
    }
    
    getPlantTypeIcon(type) {
        switch (type) {
            case 'trapping': return '🌿';
            case 'shooting': return '🔫';
            case 'manipulation': return '🧬';
            default: return '🌱';
        }
    }
    
    getPlantTypeName(type) {
        switch (type) {
            case 'trapping': return 'Trapping Plant';
            case 'shooting': return 'Shooting Plant';
            case 'manipulation': return 'Manipulation Plant';
            default: return 'Unknown Plant';
        }
    }
}

// Initialize the plant info panel
const plantInfoPanel = new PlantInfoPanel();