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
}

export function allBuildings() : Building[] {
    return [
        Building.Townhall,
        Building.Field,
        Building.Forest,
        Building.Barracks,
        Building.TrainingGround,
    ]
}
