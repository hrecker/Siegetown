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