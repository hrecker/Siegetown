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
    lastAttackTime: number;
    gameObject: Phaser.GameObjects.Arc;
    healthBarBackground: Phaser.GameObjects.Rectangle;
    healthBar: Phaser.GameObjects.Rectangle;
}

export function createUnit(type: UnitType, gameObject: Phaser.GameObjects.Arc, healthBarBackground: Phaser.GameObjects.Rectangle, healthBar: Phaser.GameObjects.Rectangle): Unit {
    return {
        id: getNewId(),
        type: type,
        health: config()["units"][type]["maxHealth"],
        lastAttackTime: 0,
        gameObject: gameObject,
        healthBarBackground: healthBarBackground,
        healthBar: healthBar
    }
}

export function updateHealth(unit: Unit, diff: number): number {
    unit.health += diff;
    let healthFraction = unit.health / config()["units"][unit.type]["maxHealth"];
    let barWidth = (unit.healthBarBackground.width - 4) * healthFraction;
    unit.healthBar.setSize(barWidth, 6);
    return unit.health;
}

export function destroyUnit(unit: Unit) {
    unit.gameObject.destroy();
    unit.healthBarBackground.destroy();
    unit.healthBar.destroy();
}