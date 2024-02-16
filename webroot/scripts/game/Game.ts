import { baseDamagedEvent, buildEvent, enemyBaseDamagedEvent, resourceUpdateEvent, waveCountdownUpdatedEvent } from "../events/EventMessenger";
import { Base, Building } from "../model/Base";
import { Buffs, buildingBuffs } from "../model/Buffs";
import { config } from "../model/Config";
import { Resources, adjacentBuffProduction, buildingCosts, buildingProduction, zeroResources } from "../model/Resources";
import { destroyUnit, Unit, UnitType, updateHealth } from "../model/Unit";
import { LaneScene } from "../scenes/LaneScene";

export type Lane = {
    playerUnits: Unit[];
    enemyUnits: Unit[];
}

export type ActiveGame = {
    base: Base;
    baseHealth: number;
    enemyBaseHealth: number;
    gold: number;
    wood: number;
    food: number;
    lanes: Lane[];
    secondsUntilWave: number;
    lastEnemySpawn: number;
    lastUpdate: number;
    enemySpawnRate: number;
}

function startingGrid(): Building[][] {
    let grid: Building[][] = [];
    for (let i = 0; i < config()["baseWidth"]; i++) {
        grid[i] = [];
        for (let j = 0; j < config()["baseWidth"]; j++) {
            grid[i][j] = Building.Empty;
        }
    }
    return grid;
}

function startingGrowthByTile(): Resources[][] {
    let grid: Resources[][] = [];
    for (let i = 0; i < config()["baseWidth"]; i++) {
        grid[i] = [];
        for (let j = 0; j < config()["baseWidth"]; j++) {
            grid[i][j] = zeroResources();
        }
    }
    return grid;
}

function startingLanes(): Lane[] {
    let lanes: Lane[] = [];
    for (let i = 0; i < config()["numLanes"]; i++) {
        lanes.push({
            playerUnits: [],
            enemyUnits: []
        });
    }
    return lanes;
}

export function createGame(): ActiveGame {
    return {
        base: {
            grid: startingGrid(),
            growthByTile: startingGrowthByTile(),
            totalGrowth: zeroResources(),
        },
        baseHealth: config()["baseMaxHealth"],
        enemyBaseHealth: config()["enemyBaseMaxHealth"],
        gold: 0,
        wood: 0,
        food: 0,
        lanes: startingLanes(),
        secondsUntilWave: config()["secondsBetweenWaves"],
        lastEnemySpawn: -1,
        lastUpdate: -1,
        enemySpawnRate: config()["baseEnemySpawnRate"]
    };
}

export function resetGame(game: ActiveGame) {
    for (const lane of game.lanes) {
        for (const playerUnit of lane.playerUnits) {
            destroyUnit(playerUnit);
        }
        for (const enemyUnit of lane.enemyUnits) {
            destroyUnit(enemyUnit);
        }
    }
    game.lastUpdate = -1;
    game.lastEnemySpawn = -1;
    game.enemySpawnRate = config()["baseEnemySpawnRate"];
    game.base = {
        grid: startingGrid(),
        growthByTile: startingGrowthByTile(),
        totalGrowth: zeroResources(),
    };
    game.baseHealth = config()["baseMaxHealth"];
    game.enemyBaseHealth = config()["enemyBaseMaxHealth"];
    game.gold = 0;
    game.wood = 0;
    game.food = 0;
    game.lanes = startingLanes();
    game.secondsUntilWave = config()["secondsBetweenWaves"];
}

function playerPastLine(playerX: number, gameWidth: number) {
    return playerX >= gameWidth;
}

function enemyPastLine(enemyX: number) {
    return enemyX <= 0;
}

export function chargeCosts(game: ActiveGame, costs: Resources) {
    game.gold -= costs.gold;
    game.food -= costs.food;
    game.wood -= costs.wood;
}

function refreshGrowth(game: ActiveGame) {
    let growth = zeroResources();
    for (let i = 0; i < game.base.grid.length; i++) {
        for (let j = 0; j < game.base.grid[i].length; j++) {
            let production = buildingProduction(game.base.grid[i][j]);
            // Look for any adjacent buildings for buffs
            if ("adjacentBuff" in config()["buildings"][game.base.grid[i][j]]) {
                // Build up list of adjacent building types
                let adjacentBuildings = {};
                for (let di = -1; di <= 1; di++) {
                    for (let dj = -1; dj <= 1; dj++) {
                        if (dj == 0 && di == 0) {
                            continue;
                        }
                        let checkI = i + di;
                        let checkJ = j + dj;
                        if (checkI >= 0 && checkI < game.base.grid.length && checkJ >= 0 && checkJ < game.base.grid[checkI].length) {
                            let adjacentBuilding = game.base.grid[checkI][checkJ];
                            if (! (adjacentBuilding in adjacentBuildings)) {
                                adjacentBuildings[adjacentBuilding] = 1;
                            } else {
                                adjacentBuildings[adjacentBuilding]++;
                            }
                        }
                    }
                }
                // Go through found adjacent buildings and add any buffs as appropriate
                for (let adjacentBuilding in adjacentBuildings) {
                    if (adjacentBuilding in config()["buildings"][game.base.grid[i][j]]["adjacentBuff"]) {
                        let buff = adjacentBuffProduction(game.base.grid[i][j], adjacentBuilding as Building)
                        production.gold += buff.gold * adjacentBuildings[adjacentBuilding];
                        production.food += buff.food * adjacentBuildings[adjacentBuilding];
                        production.wood += buff.wood * adjacentBuildings[adjacentBuilding];
                    }
                }
            }
            game.base.growthByTile[i][j] = production;
            growth.gold += production.gold;
            growth.food += production.food;
            growth.wood += production.wood;
        }
    }
    game.base.totalGrowth = growth;
}

export function getBuffs(game: ActiveGame): Buffs {
    let result = {
        damageBuff: 0,
        healthBuff: 0,
    }
    for (let i = 0; i < game.base.grid.length; i++) {
        for (let j = 0; j < game.base.grid[i].length; j++) {
            let buffs = buildingBuffs(game.base.grid[i][j]);
            result.damageBuff += buffs.damageBuff;
            result.healthBuff += buffs.healthBuff;
        }
    }
    return result;
}

export function gameEnded(game: ActiveGame) {
    return game.baseHealth <= 0 || game.enemyBaseHealth <= 0;
}

function selectRandomEnemyType(): UnitType {
    let unitType = UnitType.Warrior;
    // Just use a 50/50 chance of each unit type for now
    if (Math.random() > 0.5) {
        unitType = UnitType.Slingshotter;
    }
    return unitType;
}

export function hasBuilding(game: ActiveGame, buildingType: Building): boolean {
    for (let i = 0; i < game.base.grid.length; i++) {
        for (let j = 0; j < game.base.grid[i].length; j++) {
            if (game.base.grid[i][j] == buildingType) {
                return true;
            }
        }
    }
    return false;
}

export function buildBuilding(game: ActiveGame, buildingType: Building, x: number, y: number) {
    game.base.grid[x][y] = buildingType;
    // Refresh growth per tile
    refreshGrowth(game);
    chargeCosts(game, buildingCosts(buildingType));
    resourceUpdateEvent();
    buildEvent(buildingType);
}

export function destroyBuilding(game: ActiveGame, x: number, y: number) {
    game.base.grid[x][y] = Building.Empty;
    // Refresh growth per tile
    refreshGrowth(game);
    let destroyCosts = zeroResources();
    destroyCosts.gold = config()["destroyBuildingCost"];
    chargeCosts(game, destroyCosts);
    resourceUpdateEvent();
    buildEvent(Building.Empty);
}

const rangePixels = 70;

export function updateGame(game: ActiveGame, time: number, laneWidth: number, scene: LaneScene) {
    if (gameEnded(game)) {
        return;
    }

    if (game.lastUpdate == -1 || time - game.lastUpdate >= 1000) {
        game.lastUpdate = time;
        
        game.gold += game.base.totalGrowth.gold;
        game.food += game.base.totalGrowth.food;
        game.wood += game.base.totalGrowth.wood;
        
        // Should always be at least some change in resources due to the default townhall
        resourceUpdateEvent();
        
        game.secondsUntilWave -= 1;
        if (game.secondsUntilWave > 0) {
            waveCountdownUpdatedEvent(game.secondsUntilWave);
        }
    }

    // Start wave of enemies if necessary
    if (game.secondsUntilWave == 0) {
        // For now, just spawn two enemies in each lane always as a wave, with no randomization
        for (let i = 0; i < config()["numLanes"]; i++) {
            game.lanes[i].enemyUnits.push(scene.createUnit(UnitType.Warrior, i, true));
            game.lanes[i].enemyUnits.push(scene.createUnit(UnitType.Slingshotter, i, true));
        }

        game.lastEnemySpawn = time;
        //TODO some randomization here?
        game.secondsUntilWave = config()["secondsBetweenWaves"];
        waveCountdownUpdatedEvent(game.secondsUntilWave);
    } else if (game.lastEnemySpawn == -1 || time - game.lastEnemySpawn >= game.enemySpawnRate) {
        // Spawn enemy units
        game.lastEnemySpawn = time;
        let lane = Math.floor(Math.random() * config()["numLanes"]);
        let unitType = selectRandomEnemyType();
        game.lanes[lane].enemyUnits.push(scene.createUnit(unitType, lane, true));
        // Accelerate enemy spawns
        game.enemySpawnRate = Math.max(game.enemySpawnRate - config()["enemySpawnRateAcceleration"], config()["maxEnemySpawnRate"]);
    }

    // Always move units
    game.lanes.forEach(lane => {
        // Move player units
        let playerUnitsToRemove = new Set<number>();
        let enemyUnitsToRemove = new Set<number>();
        let xLimit = -1;
        let firstEnemyX = -1;
        let firstPlayerX = -1;
        // Find the first enemy that can be interacted with; once an enemy is halfway across the line it can't be fought
        for (let i = 0; i < lane.enemyUnits.length; i++) {
            if (! enemyPastLine(lane.enemyUnits[0].gameObject.x)) {
                firstEnemyX = lane.enemyUnits[0].gameObject.x;
                break;
            }
        }
        // Find the first player that can be interacted with; once a player is halfway across the line it can't be fought
        for (let i = 0; i < lane.playerUnits.length; i++) {
            if (! playerPastLine(lane.playerUnits[0].gameObject.x, laneWidth)) {
                firstPlayerX = lane.playerUnits[0].gameObject.x;
                break;
            }
        }
        for (let i = 0; i < lane.playerUnits.length; i++) {
            let player = lane.playerUnits[i];
            let topLeftX = player.gameObject.getTopLeft().x;

            // Stop when in range of the first enemy
            if (! playerPastLine(player.gameObject.x, laneWidth) &&
                firstEnemyX != -1 && firstEnemyX - player.gameObject.x <= config()["units"][player.type]["range"] * rangePixels) {
                // Attack the enemy
                if (player.lastAttackTime == -1 || time - player.lastAttackTime >= config()["unitAttackRate"]) {
                    player.lastAttackTime = time;
                    if (updateHealth(lane.enemyUnits[0], -player.damage) <= 0) {
                        enemyUnitsToRemove.add(0);
                    }
                }
                xLimit = topLeftX;
                continue;
            }

            player.gameObject.x += config()["units"][player.type]["speed"];

            // Don't pass other units that are in front
            if (xLimit != -1) {
                let topRightX = player.gameObject.getTopRight().x;
                let overlap = topRightX - xLimit;
                if (overlap > 0) {
                    player.gameObject.x -= overlap;
                }
            }
            if (topLeftX > laneWidth) {
                game.enemyBaseHealth = Math.max(0, game.enemyBaseHealth - 1);
                enemyBaseDamagedEvent(game.enemyBaseHealth);
                playerUnitsToRemove.add(i);
                xLimit = -1;
            } else {
                xLimit = topLeftX;
            }
        }
        // Move enemy units
        xLimit = -1;
        for (let i = 0; i < lane.enemyUnits.length; i++) {
            let enemy = lane.enemyUnits[i];
            let topRightX = enemy.gameObject.getTopRight().x;

            // Stop when in range of the first player unit
            if (! enemyPastLine(enemy.gameObject.x) &&
                firstPlayerX != -1 && enemy.gameObject.x - firstPlayerX <= config()["units"][enemy.type]["range"] * rangePixels) {
                // Attack the player unit
                if (enemy.lastAttackTime == -1 || time - enemy.lastAttackTime >= config()["unitAttackRate"]) {
                    enemy.lastAttackTime = time;
                    if (updateHealth(lane.playerUnits[0], -enemy.damage) <= 0) {
                        playerUnitsToRemove.add(0);
                    }
                }
                xLimit = topRightX;
                continue;
            }

            enemy.gameObject.x -= config()["units"][enemy.type]["speed"];
            
            // Don't pass other units
            if (xLimit != -1) {
                let topLeftX = enemy.gameObject.getTopLeft().x;
                let overlap = xLimit - topLeftX;
                if (overlap > 0) {
                    enemy.gameObject.x += overlap;
                }
            }
            if (topRightX < 0) {
                game.baseHealth = Math.max(0, game.baseHealth - 1);
                baseDamagedEvent(game.baseHealth);
                enemyUnitsToRemove.add(i);
                xLimit = -1;
            } else {
                xLimit = topRightX;
            }
        }

        // Remove units that should be removed
        for (const i of playerUnitsToRemove) {
            destroyUnit(lane.playerUnits[i]);
            lane.playerUnits.splice(i, 1);
        }
        for (const i of enemyUnitsToRemove) {
            destroyUnit(lane.enemyUnits[i]);
            lane.enemyUnits.splice(i, 1);
        }
    })
}