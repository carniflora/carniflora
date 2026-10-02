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
                lastX: x,
                lastY: y,
                health: 100,
                maxHealth: 100,
                damage: plantData.damage,
                range: plantData.range,
                cooldown: plantData.cooldown,
                sunCost: plantData.sunCost,
                mineralCost: plantData.mineralCost,
                alive: true,
                // Add a cooldown timer for activation
                lastActivated: 0,
                // Initialize ability data based on type
                ...this.getPlantAbility(plantData)
            };
            
            this.plants.push(plant);
            return plant;
        }
        return null;
    }
    
    // Function to determine the exact ability of each plant type
    getPlantAbility(plantData) {
        const baseAbility = {
            active: false, 
            isOnCooldown: false,
            lastActivated: 0,
            cooldownTime: plantData.cooldown * 1000 // Convert seconds to milliseconds
        };
        
        switch (plantData.type) {
            case 'trapping':
                // Trapping plants can ensnare enemies in a trap area
                return {
                    ability: "trap",
                    abilityDescription: "Traps and damages targets over time",
                    abilityEffect: (target, gameController) => {
                        // For trapping plants, damage over time effect
                        if (target && !target.trapImmune) {
                            target.health -= plantData.damage * 0.2; // 20% of damage per second
                            target.trapImmune = true; // Prevents immediate re-trapping
                            
                            // If trap effect is over, remove immune flag
                            setTimeout(() => {
                                if (target) delete target.trapImmune;
                            }, 3000);
                        }
                    },
                    ...baseAbility,
                    damage: plantData.damage,
                    range: plantData.range
                };
                
            case 'shooting':
                // Shooting plants fire projectiles at enemies in range
                return {
                    ability: "shoot",
                    abilityDescription: "Fires projectiles that damage enemies",
                    abilityEffect: (target, gameController) => {
                        if (target) {
                            target.health -= plantData.damage;
                        }
                    },
                    ...baseAbility,
                    projectileDamage: plantData.damage,
                    projectileSpeed: 5
                };
                
            case 'manipulation':
                // Manipulation plants cause status effects like slow or poison
                return {
                    ability: "manipulate",
                    abilityDescription: "Causes status effects on enemies",
                    abilityEffect: (target, gameController) => {
                        if (target && !target.slowed) {
                            target.speed *= 0.5; // Apply half speed
                            target.slowed = true;
                            
                            // Remove slow effect after duration
                            setTimeout(() => {
                                if (target && target.slowed) {
                                    target.speed *= 2; // Restore normal speed
                                    delete target.slowed;
                                }
                            }, 3000);
                        }
                    },
                    ...baseAbility,
                    damage: plantData.damage,
                    range: plantData.range
                };
                
            default:
                return baseAbility;
        }
    }
    
    getPlantCount() {
        return this.plants.length;
    }
    
    getAllPlants() {
        return this.plants;
    }
    
    // Function to activate a specific plant's ability (if available and not on cooldown)
    activatePlantAbility(plantId, target, gameController) {
        const plant = this.plants.find(p => p.id === plantId);
        if (!plant || plant.isOnCooldown) return false;
        
        // Check if we are within range
        if (target) {
            const dx = plant.x - target.x;
            const dy = plant.y - target.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > plant.range) return false; // Out of range
        }
        
        // Activate the ability based on type
        switch (plant.type) {
            case 'trapping':
                this.activateTrappingAbility(plant, target);
                break;
            case 'shooting':
                this.activateShootingAbility(plant, target, gameController);
                break;
            case 'manipulation':
                this.activateManipulationAbility(plant, target);
                break;
            default:
                return false;
        }
        
        // Set cooldown
        plant.lastActivated = Date.now();
        plant.isOnCooldown = true;
        
        // Reset cooldown after specified time
        setTimeout(() => {
            plant.isOnCooldown = false;
        }, plant.cooldownTime);
        
        return true;
    }
    
    activateTrappingAbility(plant, target) {
        if (target) {
            plant.abilityEffect(target);
        }
    }
    
    activateShootingAbility(plant, target, gameController) {
        // For shooting plants, we'll call the ability effect on the target
        if (target) {
            plant.abilityEffect(target, gameController);
        }
        
        // Add some visual feedback for shooting
        this.createProjectileEffect(plant, target);
    }
    
    activateManipulationAbility(plant, target) {
        if (target) {
            plant.abilityEffect(target);
        }
    }
    
    createProjectileEffect(plant, target) {
        // This would be a simple visual effect
        console.log(`Projectile fired from ${plant.name} at target`);
    }
    
    // Update plants for cooldowns, etc.
    update() {
        // Cooldown handling is done during activation now
        // This could be expanded to handle other plant behaviors

        // Track last known position for all living plants (used by projectiles)
        for (const plant of this.plants) {
            if (plant.alive) {
                plant.lastX = plant.x;
                plant.lastY = plant.y;
            }
        }

        // Remove dead plants
        this.plants = this.plants.filter(p => p.alive);
    }

    // Plants take damage from enemy defenses
    takeDamage(plantId, amount) {
        const plant = this.plants.find(p => p.id === plantId);
        if (!plant) return false;
        plant.health -= amount;
        if (plant.health <= 0) {
            plant.health = 0;
            plant.alive = false;
            console.log(`Plant ${plant.name} (${plantId}) destroyed!`);
        }
        return true;
    }

    // Get count of living plants
    getAlivePlantCount() {
        return this.plants.filter(p => p.alive).length;
    }

    // Check if all plants are dead
    areAllPlantsDead() {
        return this.plants.every(p => !p.alive);
    }
}

// Initialize plant system
const plantSystem = new PlantSystem();

// Make plantSystem globally accessible for boss system
window.plantSystem = plantSystem;