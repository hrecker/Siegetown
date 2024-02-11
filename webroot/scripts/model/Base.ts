import { Resources } from "./Resources";

export enum Building {
    Empty = "empty",
    Townhall = "townhall",
    Field = "field",
    Forest = "forest",
    Barracks = "barracks",
    TrainingGround = "trainingground"
}

export type Base = {
    grid: Building[][];
    growthByTile: Resources[][];
    totalGrowth: Resources;
}
