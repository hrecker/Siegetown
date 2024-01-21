import { baseDamagedEvent, enemyBaseDamagedEvent, resourceUpdateEvent } from "../events/EventMessenger";
import { Base, Building } from "../model/Base";
import { config } from "../model/Config";
import { Resources } from "../model/Resources";
import { destroyUnit, Unit, UnitType, updateHealth } from "../model/Unit";
import { MainScene } from "../scenes/MainScene";

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
}

function startingGrid(): Building[][] {
    let grid: Building[][] = [];
    for (let i = 0; i < config()["baseWidth"]; i++) {
        grid[i] = [];
        for (let j = 0; j < config()["baseWidth"]; j++) {
            grid[i][j] = Building.Empty;
        }
    }
    let center = Math.floor((config()["baseWidth"] - 1) / 2);
    grid[center][center] = Building.Townhall;
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
            grid: startingGrid()
        },
        baseHealth: config()["baseMaxHealth"],
        enemyBaseHealth: config()["enemyBaseMaxHealth"],
        gold: 0,
        wood: 0,
        food: 0,
        lanes: startingLanes()
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
    lastUpdate = -1;
    lastEnemySpawn = -1;
    game.base = {
        grid: startingGrid()
    };
    game.baseHealth = config()["baseMaxHealth"];
    game.enemyBaseHealth = config()["enemyBaseMaxHealth"];
    game.gold = 0;
    game.wood = 0;
    game.food = 0;
    game.lanes = startingLanes();
}

let lastUpdate = -1;
let lastEnemySpawn = -1;

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

export function getGrowth(game: ActiveGame): Resources {
    let result = {
        gold: 0,
        food: 0,
        wood: 0,
    }
    for (let i = 0; i < game.base.grid.length; i++) {
        for (let j = 0; j < game.base.grid[i].length; j++) {
            let building = game.base.grid[i][j];
            result.gold += config()["buildings"][building]["produce"]["gold"];
            result.food += config()["buildings"][building]["produce"]["food"];
            result.wood += config()["buildings"][building]["produce"]["wood"];
        }
    }
    return result;
}

export function updateGame(game: ActiveGame, time: number, gameWidth: number, scene: MainScene) {
    if (game.baseHealth <= 0 || game.enemyBaseHealth <= 0) {
        return;
    }

    if (lastUpdate == -1 || time - lastUpdate >= 1000) {
        lastUpdate = time;
        
        let growth = getGrowth(game);
        game.gold += growth.gold;
        game.food += growth.food;
        game.wood += growth.wood;
        
        // Should always be at least some change in resources due to the default townhall
        resourceUpdateEvent();
    }

    // Spawn enemy units
    if (lastEnemySpawn == -1 || time - lastEnemySpawn >= config()["enemySpawnRate"]) {
        lastEnemySpawn = time;
        let lane = Math.floor(Math.random() * config()["numLanes"]);
        let unitType = UnitType.Warrior;
        // Just use a 50/50 chance of each unit type for now
        if (Math.random() > 0.5) {
            unitType = UnitType.Slingshotter;
        }
        game.lanes[lane].enemyUnits.push(scene.createUnit(unitType, lane, true));
    }

    // Always move units
    game.lanes.forEach(lane => {
        // Move player units
        let playerUnitsToRemove = new Set();
        let enemyUnitsToRemove = new Set();
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
            if (! playerPastLine(lane.playerUnits[0].gameObject.x, gameWidth)) {
                firstPlayerX = lane.playerUnits[0].gameObject.x;
                break;
            }
        }
        for (let i = 0; i < lane.playerUnits.length; i++) {
            let player = lane.playerUnits[i];
            let topLeftX = player.gameObject.getTopLeft().x;

            // Stop when in range of the first enemy
            if (! playerPastLine(player.gameObject.x, gameWidth) &&
                firstEnemyX != -1 && firstEnemyX - player.gameObject.x <= config()["units"][player.type]["range"]) {
                // Attack the enemy
                if (player.lastAttackTime == -1 || time - player.lastAttackTime >= config()["unitAttackRate"]) {
                    player.lastAttackTime = time;
                    if (updateHealth(lane.enemyUnits[0], -config()["units"][player.type]["damage"]) <= 0) {
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
            if (topLeftX > gameWidth) {
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

            // Stop when in range of the first player unit
            if (! enemyPastLine(enemy.gameObject.x) &&
                firstPlayerX != -1 && enemy.gameObject.x - firstPlayerX <= config()["units"][enemy.type]["range"]) {
                // Attack the player unit
                if (enemy.lastAttackTime == -1 || time - enemy.lastAttackTime >= config()["unitAttackRate"]) {
                    enemy.lastAttackTime = time;
                    if (updateHealth(lane.playerUnits[0], -config()["units"][enemy.type]["damage"]) <= 0) {
                        playerUnitsToRemove.add(0);
                    }
                }
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
            let topRightX = enemy.gameObject.getTopRight().x;
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