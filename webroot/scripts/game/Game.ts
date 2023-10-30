import { resourceUpdateEvent } from "../events/EventMessenger";
import { Base, Building } from "../model/Base";
import { config } from "../model/Config";

export type ActiveGame = {
    base: Base;
    gold: number;
    wood: number;
    food: number;
    //TODO units
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
    return {
        base: {
            grid: grid
        },
        gold: 0,
        wood: 0,
        food: 0
    };
}

let lastUpdate = -1;

export function updateGame(game: ActiveGame, time: number) {
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
}