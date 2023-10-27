export enum UnitType {
    Warrior,
    Slingshotter
}

export type Unit = {
    id: number;
    type: UnitType;
    health: number;
    timeSinceLastAttack: number;
}