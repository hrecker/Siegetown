import { getNewId } from "../state/IdState"
import { Buffs } from "./Buffs";
import { config } from "./Config"

export enum UnitType {
    None = "none",
    Warrior = "warrior",
    Slingshotter = "slingshotter",
    Clubman = "clubman"
}

export type Unit = {
    id: number;
    type: UnitType;
    health: number;
    maxHealth: number;
    damage: number;
    attackRate: number;
    lastAttackTime: number;
    frozenTimeRemaining: number;
    gameObject: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
    healthBarBackground: Phaser.GameObjects.Rectangle;
    healthBar: Phaser.GameObjects.Rectangle;
}

export function allUnits(): UnitType[] {
    return [
        UnitType.Warrior,
        UnitType.Slingshotter,
        UnitType.Clubman
    ]
}

export function createUnit(type: UnitType, buffs: Buffs, gameObject: Phaser.GameObjects.Arc, label: Phaser.GameObjects.Text, healthBarBackground: Phaser.GameObjects.Rectangle, healthBar: Phaser.GameObjects.Rectangle): Unit {
    let maxHealth = config()["units"][type]["maxHealth"] + buffs.healthBuff;
    return {
        id: getNewId(),
        type: type,
        health: maxHealth,
        maxHealth: maxHealth,
        damage: config()["units"][type]["damage"] + buffs.damageBuff,
        attackRate: config()["units"][type]["attackRate"],
        lastAttackTime: 0,
        gameObject: gameObject,
        label: label,
        healthBarBackground: healthBarBackground,
        healthBar: healthBar,
        frozenTimeRemaining: 0,
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