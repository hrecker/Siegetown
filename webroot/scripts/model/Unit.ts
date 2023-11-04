import { getNewId } from "../state/IdState"
import { config } from "./Config"

export enum UnitType {
    None = "none",
    Warrior = "warrior",
    Slingshotter = "slingshotter"
}

export type Unit = {
    id: number;
    type: UnitType;
    health: number;
    timeSinceLastAttack: number;
    gameObject: Phaser.GameObjects.Arc;
}

export function createUnit(type: UnitType, gameObject: Phaser.GameObjects.Arc) {
    return {
        id: getNewId(),
        type: type,
        health: config()["units"][type]["maxHealth"],
        timeSinceLastAttack: 0,
        gameObject: gameObject,
    }
}