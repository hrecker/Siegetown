import { actionRunEvent, baseDamagedEvent, buildEvent, enemyBaseDamagedEvent, resourceUpdateEvent, unitUnlockedEvent, waveCountdownUpdatedEvent } from "../events/EventMessenger";
import { ActionType } from "../model/Action";
import { Base, Building } from "../model/Base";
import { Buffs, buildingBuffs } from "../model/Buffs";
import { config } from "../model/Config";
import { Resources, addResources, adjacentBuffProduction, buildingCosts, buildingProduction, configResources, subtractResources, zeroResources } from "../model/Resources";
import { SoundEffect, playSound } from "../model/Sound";
import { allUnits, attackAnimation, destroyUnit, idleAnimation, Unit, unitAttackSound, UnitType, updateHealth, walkAnimation } from "../model/Unit";
import { LaneScene, defaultGameWidth } from "../scenes/LaneScene";
import { uiBarWidth } from "../scenes/ResourceUIScene";
import { Era } from "../state/EraState";
import { saveGameResult } from "../state/GameResultState";
import { shuffleArray } from "../util/Utils";

export type Lane = {
    playerUnits: Unit[];
    playerQueuedUnits: Unit[];
    enemyUnits: Unit[];
    enemyQueuedUnits: Unit[];
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
    laneSceneWidth: number;
    isPaused: boolean;
    time: number;
    era: Era;
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
            playerQueuedUnits: [],
            enemyUnits: [],
            enemyQueuedUnits: [],
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
        lastEnemySpawn: -1 * config()["baseEnemySpawnRate"],
        lastUpdate: -1,
        enemySpawnRate: config()["baseEnemySpawnRate"],
        unitSpawnDelaysRemaining: startingUnitSpawnDelays(),
        usedActions: [],
        laneSceneWidth: -1,
        isPaused: false,
        time: 0,
        era: Era.Caveman
    };
}

export function resetGame(game: ActiveGame) {
    for (const lane of game.lanes) {
        for (const playerUnit of lane.playerUnits) {
            destroyUnit(playerUnit);
        }
        for (const playerUnit of lane.playerQueuedUnits) {
            destroyUnit(playerUnit);
        }
        for (const enemyUnit of lane.enemyUnits) {
            destroyUnit(enemyUnit);
        }
        for (const enemyUnit of lane.enemyQueuedUnits) {
            destroyUnit(enemyUnit);
        }
    }
    game.lastUpdate = -1;
    game.lastEnemySpawn = -1 * config()["baseEnemySpawnRate"];
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
    game.isPaused = false;
    game.time = 0;
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
    let enemyWaves = config()["enemyWaves"];
    allUnits(game.era).forEach(unit => {
        if (game.currentWave >= enemyWaves.length || unit in enemyWaves[game.currentWave]) {
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
                destroyUnit(unit, scene, false);
            });
            game.lanes[lane].enemyUnits.forEach(unit => {
                destroyUnit(unit, scene, true);
            });
            if (game.lanes[lane].playerUnits.length > 0 || game.lanes[lane].enemyUnits.length > 0) {
                playSound(scene, SoundEffect.Death);
            }
            game.lanes[lane].playerUnits = [];
            game.lanes[lane].enemyUnits = [];
            playSound(scene, SoundEffect.BombLane);
            break;
        case ActionType.Reinforcements:
            // Spawn three clubmen
            for (let i = 0; i < config()["numLanes"]; i++) {
                game.lanes[i].playerQueuedUnits.push(scene.createUnit(UnitType.Clubman, i, false, true));
            }
            playSound(scene, SoundEffect.Reinforcements);
            break;
        case ActionType.Freeze:
            // Freeze enemies in this lane for a time
            game.lanes[lane].playerUnits.forEach(unit => {
                unit.frozenTimeRemaining = config()["freezeDuration"]
            });
            game.lanes[lane].enemyUnits.forEach(unit => {
                unit.frozenTimeRemaining = config()["freezeDuration"]
            });
            playSound(scene, SoundEffect.Freeze);
            break;
    }
    game.usedActions.push(action);
    actionRunEvent(action);
}

export function queuePlayerUnit(game: ActiveGame, lane: number, unit: Unit) {
    game.lanes[lane].playerQueuedUnits.push(unit);
}

function unitSpeed(game: ActiveGame, unitType: UnitType): number {
    return config()["units"][unitType]["speed"] / 4.0 * (game.laneSceneWidth / (defaultGameWidth - uiBarWidth));
}

export function updateGame(game: ActiveGame, delta: number, laneWidth: number, scene: LaneScene) {
    if (gameEnded(game) || game.isPaused) {
        return;
    }
    game.time += delta;

    if (game.lastUpdate == -1 || game.time - game.lastUpdate >= 1000) {
        game.lastUpdate = game.time;
        
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
    });

    // Start wave of enemies if necessary
    if (game.secondsUntilWave == 0) {
        // Get the appropriate defined wave if it exists. If not, just add clubmen to the final defined wave to reach the desired enemy count.
        //TODO
        let definedWaves = config()["enemyWaves"];
        let wave: { [name: string] : number } 
        if (game.currentWave < definedWaves.length) {
            wave = definedWaves[game.currentWave];
        } else {
            wave = definedWaves[definedWaves.length - 1];
            wave["clubman"] += (game.currentWave - definedWaves.length) + 1;
        }

        // Build up a list of all the enemies to spawn and shuffle it
        let toSpawn = [];
        allUnits().forEach(unit => {
            if (unit in wave) {
                for (let i = 0; i < wave[unit]; i++) {
                    toSpawn.push(unit);
                }
            }
        });
        shuffleArray(toSpawn);

        // Shuffle the order of lanes
        let laneOrder = [];
        for (let i = 0; i < config()["numLanes"]; i++) {
            laneOrder.push(i);
        }
        shuffleArray(laneOrder);

        // Spawn enemies
        for (let i = 0; i < toSpawn.length; i++) {
            let lane = laneOrder[i % config()["numLanes"]];
            game.lanes[lane].enemyQueuedUnits.push(scene.createUnit(toSpawn[i], lane, true, false));
        }

        game.currentWave++;
        game.lastEnemySpawn = game.time;
        game.secondsUntilWave = config()["secondsBetweenWaves"];
        waveCountdownUpdatedEvent(game.secondsUntilWave);
    } else if (game.time - game.lastEnemySpawn >= game.enemySpawnRate) {
        // Spawn enemy units
        game.lastEnemySpawn = game.time;
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
        game.lanes[lane].enemyQueuedUnits.push(scene.createUnit(unitType, lane, true, false));
        // Accelerate enemy spawns
        game.enemySpawnRate = Math.max(game.enemySpawnRate - config()["enemySpawnRateAcceleration"], config()["maxEnemySpawnRate"]);
    }

    let rangePixels = scene.unitRangePixels();

    // Add units from player unit queue if there is space
    game.lanes.forEach(lane => {
        if (lane.playerQueuedUnits.length > 0) {
            // Check if there is space for the next unit
            let isSpace = true;
            if (lane.playerUnits.length > 0) {
                // Only spawn if the spawn location would be interactable
                isSpace = unitInteractable(lane.playerUnits[lane.playerUnits.length - 1].gameObject.x - (rangePixels / 2), laneWidth);
            }

            if (isSpace) {
                lane.playerQueuedUnits[0].gameObject.x = 0;
                lane.playerUnits.push(lane.playerQueuedUnits[0]);
                lane.playerQueuedUnits.splice(0, 1);
            }
        }
        if (lane.enemyQueuedUnits.length > 0) {
            // Check if there is space for the next unit
            let isSpace = true;
            if (lane.enemyUnits.length > 0) {
                // Only spawn if the spawn location would be interactable
                isSpace = unitInteractable(lane.enemyUnits[lane.enemyUnits.length - 1].gameObject.x + (rangePixels / 2), laneWidth);
            }

            if (isSpace) {
                lane.enemyQueuedUnits[0].gameObject.x = laneWidth;
                lane.enemyUnits.push(lane.enemyQueuedUnits[0]);
                lane.enemyQueuedUnits.splice(0, 1);
            }
        }
    });

    // Always move units
    let soundEffectsToPlay = {};
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
            let topLeftX = player.gameObject.x - (rangePixels / 2);

            // If frozen, don't do anything
            if (player.frozenTimeRemaining > 0) {
                player.frozenTimeRemaining -= delta;
                xLimit = topLeftX;
                player.gameObject.play(idleAnimation(player.type), true);
                continue;
            }

            // Stop when in range of the first enemy
            if (unitInteractable(player.gameObject.x, laneWidth) &&
                firstEnemyX != -1 && firstEnemyX - player.gameObject.x <= config()["units"][player.type]["range"] * rangePixels) {
                // Attack the enemy
                if (player.lastAttackTime == -1 || game.time - player.lastAttackTime >= player.attackRate) {
                    player.lastAttackTime = game.time;
                    if (updateHealth(lane.enemyUnits[0], -player.damage) <= 0) {
                        enemyUnitsToRemove.add(0);
                        soundEffectsToPlay[SoundEffect.Death] = true;
                    }
                    soundEffectsToPlay[unitAttackSound(player.type)] = true;
                }
                player.gameObject.play(attackAnimation(player.type), true);
                xLimit = topLeftX;
                continue;
            }

            let originalX = player.gameObject.x;
            player.gameObject.x += unitSpeed(game, player.type);

            // Don't pass other units that are in front
            if (xLimit != -1) {
                let topRightX = player.gameObject.x + (rangePixels / 2);
                let overlap = topRightX - xLimit;
                if (overlap > 0) {
                    player.gameObject.x -= overlap;
                }
            }
            // If the unit didn't actually move, run the idle animation
            if (player.gameObject.x == originalX) {
                player.gameObject.play(idleAnimation(player.type), true);
            } else {
                player.gameObject.play(walkAnimation(player.type), true);
            }

            if (topLeftX > laneWidth) {
                game.enemyBaseHealth = Math.max(0, game.enemyBaseHealth - 1);
                enemyBaseDamagedEvent(game.enemyBaseHealth);
                soundEffectsToPlay[SoundEffect.BaseDamaged] = true;
                playerUnitsToRemove.add(i);
                xLimit = -1;
            } else {
                xLimit = topLeftX;
            }
        }
        // Move enemy units
        //TODO reduce the duplication here
        xLimit = -1;
        for (let i = 0; i < lane.enemyUnits.length; i++) {
            let enemy = lane.enemyUnits[i];
            let topRightX = enemy.gameObject.x + (rangePixels / 2);

            // If frozen, don't do anything
            if (enemy.frozenTimeRemaining > 0) {
                enemy.frozenTimeRemaining -= delta;
                xLimit = topRightX;
                enemy.gameObject.play(idleAnimation(enemy.type), true);
                continue;
            }

            // Stop when in range of the first player unit
            if (unitInteractable(enemy.gameObject.x, laneWidth) &&
                firstPlayerX != -1 && enemy.gameObject.x - firstPlayerX <= config()["units"][enemy.type]["range"] * rangePixels) {
                // Attack the player unit
                if (enemy.lastAttackTime == -1 || game.time - enemy.lastAttackTime >= enemy.attackRate) {
                    enemy.lastAttackTime = game.time;
                    if (updateHealth(lane.playerUnits[0], -enemy.damage) <= 0) {
                        playerUnitsToRemove.add(0);
                        soundEffectsToPlay[SoundEffect.Death] = true;
                    }
                    soundEffectsToPlay[unitAttackSound(enemy.type)] = true;
                }
                xLimit = topRightX;
                enemy.gameObject.play(attackAnimation(enemy.type), true);
                continue;
            }

            let originalX = enemy.gameObject.x;
            enemy.gameObject.x -= unitSpeed(game, enemy.type);
            
            // Don't pass other units
            if (xLimit != -1) {
                let topLeftX = enemy.gameObject.x - (rangePixels / 2);
                let overlap = xLimit - topLeftX;
                if (overlap > 0) {
                    enemy.gameObject.x += overlap;
                }
            }
            // If the unit didn't actually move, run the idle animation
            if (enemy.gameObject.x == originalX) {
                enemy.gameObject.play(idleAnimation(enemy.type), true);
            } else {
                enemy.gameObject.play(walkAnimation(enemy.type), true);
            }

            if (topRightX < 0) {
                game.baseHealth = Math.max(0, game.baseHealth - 1);
                baseDamagedEvent(game.baseHealth);
                soundEffectsToPlay[SoundEffect.BaseDamaged] = true;
                enemyUnitsToRemove.add(i);
                xLimit = -1;
            } else {
                xLimit = topRightX;
            }
        }

        // Remove units that should be removed
        for (const i of playerUnitsToRemove) {
            destroyUnit(lane.playerUnits[i], scene, false);
            lane.playerUnits.splice(i, 1);
        }
        for (const i of enemyUnitsToRemove) {
            destroyUnit(lane.enemyUnits[i], scene, true);
            lane.enemyUnits.splice(i, 1);
        }
    });

    // Play any sounds
    for (const sound in soundEffectsToPlay) {
        playSound(scene, sound as SoundEffect);
    }

    // If game is over, save game result
    if (gameEnded(game)) {
        let isWin = game.baseHealth > 0;
        saveGameResult({
            win: isWin,
            time: game.time,
        });
    }
}