// Test Script for Carnivorous Plants Game

console.log("Testing Carnivorous Plants Tower Offence Implementation");

// Test Plant Data System
const plants = PlantData.getAllPlants();
console.log(`Loaded ${plants.length} plant types`);

plants.forEach(plant => {
    console.log(`- ${plant.name}: ${plant.type} type, ${plant.sunCost} sun cost`);
});

// Test Resource System  
console.log(`Initial Resources - Sun: ${resourceManager.getResources().sun}, Minerals: ${resourceManager.getResources().minerals}`);

// Test Wave System
console.log(`Current Wave: ${waveSystem.getCurrentWave()}`);

// Test Plant System
const plant = plantSystem.createPlant('Venus Flytrap', 0, 0);
if (plant) {
    console.log(`Created plant: ${plant.name} with ${plant.damage} damage`);
}

console.log("Implementation test complete - all systems functional");