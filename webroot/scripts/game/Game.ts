import { resourceUpdateEvent } from "../events/EventMessenger";
import { Base, Building } from "../model/Base";
import { config } from "../model/Config";
import { Unit } from "../model/Unit";

export type Lane = {
    playerUnits: Unit[];
    enemyUnits: Unit[];
}

export type ActiveGame = {
    base: Base;
    gold: number;
    wood: number;
    food: number;
    lanes: Lane[];
}

export function createGame(): ActiveGame {
    let grid: Building[][] = [];
    for (let i = 0; i < config()["baseWidth"]; i++) {
        grid[i] = [];
        for (let j = 0; j < config()["baseWidth"]; j++) {
            grid[i][j] = Building.Empty;
        }
    }
    let center = (config()["baseWidth"] - 1) / 2;
    grid[center][center] = Building.Townhall;

    let lanes: Lane[] = [];
    for (let i = 0; i < config()["numLanes"]; i++) {
        lanes.push({
            playerUnits: [],
            enemyUnits: []
        });
    }
    return {
        base: {
            grid: grid
        },
        gold: 0,
        wood: 0,
        food: 0,
        lanes: lanes
    };
}

let lastUpdate = -1;

export function updateGame(game: ActiveGame, time: number, gameWidth: number) {
    if (lastUpdate == -1 || time - lastUpdate >= 1000) {
        lastUpdate = time;
        
        for (let i = 0; i < game.base.grid.length; i++) {
            for (let j = 0; j < game.base.grid[i].length; j++) {
                let building = game.base.grid[i][j];
                game.gold += config()["buildings"][building]["produce"]["gold"];
                game.food += config()["buildings"][building]["produce"]["food"];
                game.wood += config()["buildings"][building]["produce"]["wood"];
            }
        }
        
        // Should always be at least some change in resources due to the default townhall
        resourceUpdateEvent();
    }

    // Always move units
    game.lanes.forEach(lane => {
        // Move player units
        let playerUnitsToRemove = [];
        let xLimit = -1;
        for (let i = 0; i < lane.playerUnits.length; i++) {
            let player = lane.playerUnits[i];
            player.gameObject.x += config()["units"][player.type]["speed"];
            //TODO stop when seeing an enemy in range
            // Don't pass other units that are in front
            if (xLimit != -1) {
                let topRightX = player.gameObject.getTopRight().x;
                let overlap = topRightX - xLimit;
                if (overlap > 0) {
                    player.gameObject.x -= overlap;
                }
            }
            let topLeftX = player.gameObject.getTopLeft().x;
            if (topLeftX > gameWidth) {
                //TODO damaging enemy base
                player.gameObject.destroy();
                playerUnitsToRemove.push(i);
                xLimit = -1;
            } else {
                xLimit = topLeftX;
            }
        }
        // Move enemy units
        let enemyUnitsToRemove = [];
        xLimit = -1;
        for (let i = 0; i < lane.enemyUnits.length; i++) {
            let enemy = lane.enemyUnits[i];
            enemy.gameObject.x -= config()["units"][enemy.type]["speed"];
            //TODO stop when seeing an enemy in range
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
                //TODO damaging player base
                enemy.gameObject.destroy();
                enemyUnitsToRemove.push(i);
                xLimit = -1;
            } else {
                xLimit = topRightX;
            }
        }

        // Remove units that should be removed
        for (let i = playerUnitsToRemove.length - 1; i >= 0; i--) {
            console.log("removed");
            lane.playerUnits.splice(playerUnitsToRemove[i], 1);
        }
        for (let i = enemyUnitsToRemove.length - 1; i >= 0; i--) {
            lane.enemyUnits.splice(enemyUnitsToRemove[i], 1);
        }
    })
}