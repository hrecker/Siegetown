import { Resources } from "./Resources";

export enum Building {
    Empty = "empty",
    Townhall = "townhall",
    Field = "field",
    Forest = "forest",
    Market = "market",
    Barracks = "barracks",
    TrainingGround = "trainingground",
    Farm = "farm",
    Lumberyard = "lumberyard",
    Bazaar = "bazaar",
    Blacksmith = "blacksmith",
    Workshop = "workshop"
}

export type Base = {
    grid: Building[][];
    growthByTile: Resources[][];
    totalGrowth: Resources;
}
