export enum Building {
    Empty,
    Townhall,
    Field,
    Lumberyard
}

export type Base = {
    grid: Building[][];
}