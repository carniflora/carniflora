// Plant management system for Carniflora Tower Offence

class PlantData {
    static getAllPlants() {
        return [
            {
                name: "Venus Flytrap",
                type: "trapping",
                sunCost: 100,
                mineralCost: 0,
                damage: 50,
                range: 2,
                cooldown: 3,
                description: "Snap traps that catch enemies in range"
            },
            {
                name: "Pitcher Plant",
                type: "trapping", 
                sunCost: 150,
                mineralCost: 0,
                damage: 40,
                range: 3,
                cooldown: 4,
                description: "Lure with nectar, trap inside"
            },
            {
                name: "Sundew",
                type: "shooting",
                sunCost: 80,
                mineralCost: 0,
                damage: 25,
                range: 5,
                cooldown: 2,
                description: "Sticky tentacles that slow enemies"
            },
            {
                name: "Drosera",
                type: "trapping",
                sunCost: 120,
                mineralCost: 0,
                damage: 35,
                range: 1.5,
                cooldown: 2,
                description: "Rapidly snap traps with area effect"
            },
            {
                name: "Rafflesia",
                type: "shooting",
                sunCost: 300,
                mineralCost: 0,
                damage: 80,
                range: 6,
                cooldown: 6,
                description: "Huge explosion damage"
            },
            {
                name: "Nepenthes",
                type: "manipulation",
                sunCost: 180,
                mineralCost: 0,
                damage: 20,
                range: 4,
                cooldown: 5,
                description: "Toxic pitcher with slow effect"
            },
            {
                name: "Utricularia",
                type: "manipulation",
                sunCost: 200,
                mineralCost: 0,
                damage: 30,
                range: 3,
                cooldown: 3,
                description: "Underwater suction trap"
            },
            {
                name: "Sarracenia",
                type: "trapping",
                sunCost: 140,
                mineralCost: 0,
                damage: 45,
                range: 2.5,
                cooldown: 4,
                description: "Venomous pitcher with paralysis"
            }
        ];
    }
    
    static getPlantByName(name) {
        return this.getAllPlants().find(plant => plant.name === name);
    }
}

// Plant system class
class PlantSystem {
    constructor() {
        this.plants = [];
        this.plantCount = 0;
    }
    
    createPlant(plantType, x, y) {
        const plantData = PlantData.getPlantByName(plantType);
        if (plantData) {
            const plant = {
                id: this.plantCount++,
                name: plantData.name,
                type: plantData.type,
                x: x,
                y: y,
                health: 100,
                maxHealth: 100,
                damage: plantData.damage,
                range: plantData.range,
                cooldown: plantData.cooldown,
                sunCost: plantData.sunCost,
                mineralCost: plantData.mineralCost
            };
            
            this.plants.push(plant);
            return plant;
        }
        return null;
    }
    
    getPlantCount() {
        return this.plants.length;
    }
    
    getAllPlants() {
        return this.plants;
    }
}

// Initialize plant system
const plantSystem = new PlantSystem();