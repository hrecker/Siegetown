export enum Building {
    Empty = "empty",
    Townhall = "townhall",
    Field = "field",
    Lumberyard = "lumberyard",
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
        Building.Lumberyard,
        Building.Barracks,
        Building.TrainingGround,
    ]
}