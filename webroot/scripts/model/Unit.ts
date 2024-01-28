import { getNewId } from "../state/IdState"
import { Buffs } from "./Buffs";
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
    maxHealth: number;
    damage: number;
    lastAttackTime: number;
    gameObject: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
    healthBarBackground: Phaser.GameObjects.Rectangle;
    healthBar: Phaser.GameObjects.Rectangle;
}

export function createUnit(type: UnitType, buffs: Buffs, gameObject: Phaser.GameObjects.Arc, label: Phaser.GameObjects.Text, healthBarBackground: Phaser.GameObjects.Rectangle, healthBar: Phaser.GameObjects.Rectangle): Unit {
    let maxHealth = config()["units"][type]["maxHealth"] + buffs.healthBuff;
    return {
        id: getNewId(),
        type: type,
        health: maxHealth,
        maxHealth: maxHealth,
        damage: config()["units"][type]["damage"] + buffs.damageBuff,
        lastAttackTime: 0,
        gameObject: gameObject,
        label: label,
        healthBarBackground: healthBarBackground,
        healthBar: healthBar
    }
}

export function updateHealth(unit: Unit, diff: number): number {
    unit.health += diff;
    let healthFraction = unit.health / unit.maxHealth;
    let barWidth = (unit.healthBarBackground.width - 4) * healthFraction;
    unit.healthBar.setSize(barWidth, 6);
    return unit.health;
}

export function destroyUnit(unit: Unit) {
    unit.gameObject.destroy();
    unit.healthBarBackground.destroy();
    unit.healthBar.destroy();
    unit.label.destroy();
}