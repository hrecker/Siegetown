import { Era } from "../state/EraState";
import { getNewId } from "../state/IdState"
import { Buffs } from "./Buffs";
import { config } from "./Config"
import { SoundEffect } from "./Sound";

export enum UnitType {
    None = "none",
    Warrior = "warrior",
    Slingshotter = "slingshotter",
    Clubman = "clubman",
    Infantry = "infantry",
    Archer = "archer",
    Knight = "knight",
    Catapult = "catapult"
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
    gameObject: Phaser.GameObjects.Sprite;
    healthBarBackground: Phaser.GameObjects.Rectangle;
    healthBar: Phaser.GameObjects.Rectangle;
}

export function allUnits(era?: Era): UnitType[] {
    if (era) {
        return config()["eras"][era]["units"];
    } else {
        // Return all units
        return [
            UnitType.Warrior,
            UnitType.Slingshotter,
            UnitType.Clubman,
            UnitType.Infantry,
            UnitType.Archer,
            UnitType.Knight,
            UnitType.Catapult
        ]
    }
}

export function createUnit(type: UnitType, buffs: Buffs, gameObject: Phaser.GameObjects.Sprite, healthBarBackground: Phaser.GameObjects.Rectangle, healthBar: Phaser.GameObjects.Rectangle): Unit {
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
        healthBarBackground: healthBarBackground,
        healthBar: healthBar,
        frozenTimeRemaining: 0,
    }
}

export function updateHealth(unit: Unit, diff: number): number {
    unit.health += diff;
    let healthFraction = unit.health / unit.maxHealth;
    let barWidth = (unit.healthBarBackground.width - 4) * healthFraction;
    unit.healthBar.setSize(barWidth, unit.healthBar.height);
    return unit.health;
}

export function destroyUnit(unit: Unit, scene?: Phaser.Scene, isEnemy?: boolean) {
    if (scene) {
        let targetAngle = -180;
        if (isEnemy) {
            targetAngle *= -1;
        }
        scene.tweens.add({
            targets: unit.gameObject,
            scale: 0,
            alpha: 0,
            angle: targetAngle,
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => { unit.gameObject.destroy() },
        })
    } else {
        unit.gameObject.destroy();
    }
    unit.healthBarBackground.destroy();
    unit.healthBar.destroy();
}

export function idleAnimation(type: UnitType): string {
    return type + "_idle";
}

export function walkAnimation(type: UnitType): string {
    return type + "_walk";
}

export function attackAnimation(type: UnitType): string {
    return type + "_attack";
}

export function unitAttackSound(type: UnitType): SoundEffect {
    switch(type) {
        case UnitType.None:
            return SoundEffect.None;
        case UnitType.Warrior:
            return SoundEffect.Punch;
        case UnitType.Slingshotter:
            return SoundEffect.Slingshot;
        case UnitType.Clubman:
            return SoundEffect.Club;
    }
}