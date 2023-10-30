export enum Building {
    Empty = "empty",
    Townhall = "townhall",
    Field = "field",
    Lumberyard = "lumberyard"
}

export type Base = {
    grid: Building[][];
}