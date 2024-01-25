export enum Building {
    Empty = "empty",
    Townhall = "townhall",
    Field = "field",
    Lumberyard = "lumberyard",
    Barracks = "barracks",
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
    ]
}