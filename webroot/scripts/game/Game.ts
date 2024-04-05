import { actionRunEvent, baseDamagedEvent, buildEvent, enemyBaseDamagedEvent, resourceUpdateEvent, unitUnlockedEvent, waveCountdownUpdatedEvent } from "../events/EventMessenger";
import { ActionType } from "../model/Action";
import { Base, Building } from "../model/Base";
import { Buffs, buildingBuffs } from "../model/Buffs";
import { config } from "../model/Config";
import { Resources, addResources, adjacentBuffProduction, buildingCosts, buildingProduction, configResources, subtractResources, zeroResources } from "../model/Resources";
import { allUnits, destroyUnit, Unit, unitSpeed, UnitType, updateHealth } from "../model/Unit";
import { LaneScene } from "../scenes/LaneScene";
import { shuffleArray } from "../util/Utils";

export type Lane = {
    playerUnits: Unit[];
    enemyUnits: Unit[];
}

export type ActiveGame = {
    base: Base;
    baseHealth: number;
    enemyBaseHealth: number;
    resources: Resources;
    lanes: Lane[];
    secondsUntilWave: number;
    currentWave: number;
    lastEnemySpawn: number;
    lastUpdate: number;
    enemySpawnRate: number;
    unitSpawnDelaysRemaining: { [type: string] : number }
    usedActions: ActionType[];
}

function townhallCoordinate(): number {
    return Math.floor((config()["baseWidth"] - 1) / 2);
}

function startingGrid(): Building[][] {
    let grid: Building[][] = [];
    let baseWidth = config()["baseWidth"];
    let townhallCoord = townhallCoordinate();
    for (let i = 0; i < baseWidth; i++) {
        grid[i] = [];
        for (let j = 0; j < baseWidth; j++) {
            if (i == townhallCoord && j == townhallCoord) {
                grid[i][j] = Building.Townhall;
            } else {
                grid[i][j] = Building.Empty;
            }
        }
    }
    return grid;
}

function startingGrowthByTile(): Resources[][] {
    let grid: Resources[][] = [];
    let townhallCoord = townhallCoordinate();
    for (let i = 0; i < config()["baseWidth"]; i++) {
        grid[i] = [];
        for (let j = 0; j < config()["baseWidth"]; j++) {
            if (i == townhallCoord && j == townhallCoord) {
                grid[i][j] = buildingProduction(Building.Townhall);
            } else {
                grid[i][j] = zeroResources();
            }
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

function startingUnitSpawnDelays(): { [type: string] : number } {
    let delays = {};
    allUnits().forEach(unit => {
        delays[unit] = 0;
    })
    return delays;
}

export function createGame(): ActiveGame {
    return {
        base: {
            grid: startingGrid(),
            growthByTile: startingGrowthByTile(),
            totalGrowth: buildingProduction(Building.Townhall),
        },
        baseHealth: config()["baseMaxHealth"],
        enemyBaseHealth: config()["enemyBaseMaxHealth"],
        resources: startingResources(),
        lanes: startingLanes(),
        secondsUntilWave: config()["secondsBetweenWaves"],
        currentWave: 0,
        lastEnemySpawn: -1,
        lastUpdate: -1,
        enemySpawnRate: config()["baseEnemySpawnRate"],
        unitSpawnDelaysRemaining: startingUnitSpawnDelays(),
        usedActions: [],
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
        totalGrowth: buildingProduction(Building.Townhall),
    };
    game.baseHealth = config()["baseMaxHealth"];
    game.enemyBaseHealth = config()["enemyBaseMaxHealth"];
    game.resources = startingResources();
    game.lanes = startingLanes();
    game.secondsUntilWave = config()["secondsBetweenWaves"];
    game.currentWave = 0;
    game.unitSpawnDelaysRemaining = startingUnitSpawnDelays();
    game.usedActions = [];
}

function startingResources(): Resources {
    return configResources(config()["startingResources"]);
}

function unitInteractable(unitX: number, gameWidth: number) {
    return unitX > 0 && unitX < gameWidth;
}

export function chargeCosts(game: ActiveGame, costs: Resources) {
    game.resources = subtractResources(game.resources, costs);
    resourceUpdateEvent();
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
                        // Only look at orthogonally adjacent tiles
                        if ((dj == 0 && di == 0) || (dj != 0 && di != 0)) {
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

export function canAfford(game: ActiveGame, costs: Resources) {
    return game.resources.gold >= costs.gold && game.resources.food >= costs.food && game.resources.wood >= costs.wood;
}

function selectRandomEnemyType(game: ActiveGame): UnitType {
    let possibleUnits = [];
    allUnits().forEach(unit => {
        if (config()["enemyUnitsInitialWave"][unit] <= game.currentWave) {
            possibleUnits.push(unit);
        }
    });

    // Assume there is always at least one possible unit
    shuffleArray(possibleUnits);
    return possibleUnits[0];
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
    buildEvent(buildingType);
}

export function removeBuilding(game: ActiveGame, x: number, y: number) {
    game.base.grid[x][y] = Building.Empty;
    // Refresh growth per tile
    refreshGrowth(game);
    let removeCosts = zeroResources();
    removeCosts.gold = config()["removeBuildingCost"];
    chargeCosts(game, removeCosts);
    buildEvent(Building.Empty);
}

export function runAction(game: ActiveGame, action: ActionType, lane: number, scene: LaneScene) {
    switch (action) {
        case ActionType.Clear:
            // Clear all units from the given lane
            game.lanes[lane].playerUnits.forEach(unit => {
                destroyUnit(unit);
            });
            game.lanes[lane].enemyUnits.forEach(unit => {
                destroyUnit(unit);
            });
            game.lanes[lane].playerUnits = [];
            game.lanes[lane].enemyUnits = [];
            break;
        case ActionType.Reinforcements:
            // Spawn three clubmen
            for (let i = 0; i < config()["numLanes"]; i++) {
                game.lanes[i].playerUnits.push(scene.createUnit(UnitType.Clubman, i, false, true));
            }
            break;
        case ActionType.Freeze:
            // Freeze enemies in this lane for a time
            game.lanes[lane].playerUnits.forEach(unit => {
                unit.frozenTimeRemaining = config()["freezeDuration"]
            });
            game.lanes[lane].enemyUnits.forEach(unit => {
                unit.frozenTimeRemaining = config()["freezeDuration"]
            });
            break;
    }
    game.usedActions.push(action);
    actionRunEvent(action);
}

const rangePixels = 70;

export function updateGame(game: ActiveGame, time: number, delta: number, laneWidth: number, scene: LaneScene) {
    if (gameEnded(game)) {
        return;
    }

    if (game.lastUpdate == -1 || time - game.lastUpdate >= 1000) {
        game.lastUpdate = time;
        
        game.resources = addResources(game.resources, game.base.totalGrowth);
        
        // Should always be at least some change in resources due to the default townhall
        resourceUpdateEvent();
        
        game.secondsUntilWave -= 1;
        if (game.secondsUntilWave > 0) {
            waveCountdownUpdatedEvent(game.secondsUntilWave);
        }
    }

    // Tick down timers for unit spawn delays
    allUnits().forEach(unit => {
        if (game.unitSpawnDelaysRemaining[unit] > 0) {
            game.unitSpawnDelaysRemaining[unit] -= delta;
            if (game.unitSpawnDelaysRemaining[unit] <= 0) {
                unitUnlockedEvent(unit);
            }
        }
    })

    // Start wave of enemies if necessary
    if (game.secondsUntilWave == 0) {
        // Spawn 1 random enemy per lane, plus one extra for each previous completed wave (up to a maximum)
        let totalEnemiesToSpawn = Math.min(config()["numLanes"] + game.currentWave, config()["maxEnemiesPerWave"]);
        let laneOrder = [];
        for (let i = 0; i < config()["numLanes"]; i++) {
            laneOrder.push(i);
        }
        game.currentWave++;
        // Randomize the lanes to spawn in
        shuffleArray(laneOrder);
        for (let i = 0; i < totalEnemiesToSpawn; i++) {
            let lane = laneOrder[i % config()["numLanes"]];
            game.lanes[lane].enemyUnits.push(scene.createUnit(selectRandomEnemyType(game), lane, true, false));
        }

        game.lastEnemySpawn = time;
        //TODO some randomization here?
        game.secondsUntilWave = config()["secondsBetweenWaves"];
        waveCountdownUpdatedEvent(game.secondsUntilWave);
    } else if (game.lastEnemySpawn == -1) {
        // Wait the full spawn time for the first spawn
        game.lastEnemySpawn = time;
    } else if (time - game.lastEnemySpawn >= game.enemySpawnRate) {
        // Spawn enemy units
        game.lastEnemySpawn = time;
        // Pick lane with most or tied for the most player units
        let possibleLanes = [];
        let maxUnits = 0;
        for (let i = 0; i < game.lanes.length; i++) {
            if (game.lanes[i].playerUnits.length > maxUnits) {
                maxUnits = game.lanes[i].playerUnits.length;
                possibleLanes = [i];
            } else if (game.lanes[i].playerUnits.length == maxUnits) {
                possibleLanes.push(i);
            }
        }
        let lane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
        let unitType = selectRandomEnemyType(game);
        game.lanes[lane].enemyUnits.push(scene.createUnit(unitType, lane, true, false));
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
            if (unitInteractable(lane.enemyUnits[0].gameObject.x, laneWidth)) {
                firstEnemyX = lane.enemyUnits[0].gameObject.x;
                break;
            }
        }
        // Find the first player that can be interacted with; once a player is halfway across the line it can't be fought
        for (let i = 0; i < lane.playerUnits.length; i++) {
            if (unitInteractable(lane.playerUnits[0].gameObject.x, laneWidth)) {
                firstPlayerX = lane.playerUnits[0].gameObject.x;
                break;
            }
        }
        for (let i = 0; i < lane.playerUnits.length; i++) {
            let player = lane.playerUnits[i];
            let topLeftX = player.gameObject.getTopLeft().x;

            // If frozen, don't do anything
            if (player.frozenTimeRemaining > 0) {
                player.frozenTimeRemaining -= delta;
                xLimit = topLeftX;
                continue;
            }

            // Stop when in range of the first enemy
            if (unitInteractable(player.gameObject.x, laneWidth) &&
                firstEnemyX != -1 && firstEnemyX - player.gameObject.x <= config()["units"][player.type]["range"] * rangePixels) {
                // Attack the enemy
                if (player.lastAttackTime == -1 || time - player.lastAttackTime >= player.attackRate) {
                    player.lastAttackTime = time;
                    if (updateHealth(lane.enemyUnits[0], -player.damage) <= 0) {
                        enemyUnitsToRemove.add(0);
                    }
                }
                player.gameObject.play("warrior_attack", true);
                xLimit = topLeftX;
                continue;
            }

            player.gameObject.x += unitSpeed(player.type);
            player.gameObject.play("warrior_walk", true);

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

            // If frozen, don't do anything
            if (enemy.frozenTimeRemaining > 0) {
                enemy.frozenTimeRemaining -= delta;
                xLimit = topRightX;
                continue;
            }

            // Stop when in range of the first player unit
            if (unitInteractable(enemy.gameObject.x, laneWidth) &&
                firstPlayerX != -1 && enemy.gameObject.x - firstPlayerX <= config()["units"][enemy.type]["range"] * rangePixels) {
                // Attack the player unit
                if (enemy.lastAttackTime == -1 || time - enemy.lastAttackTime >= enemy.attackRate) {
                    enemy.lastAttackTime = time;
                    if (updateHealth(lane.playerUnits[0], -enemy.damage) <= 0) {
                        playerUnitsToRemove.add(0);
                    }
                }
                xLimit = topRightX;
                enemy.gameObject.play("warrior_attack", true);
                continue;
            }

            enemy.gameObject.x -= unitSpeed(enemy.type);
            enemy.gameObject.play("warrior_walk", true);
            
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