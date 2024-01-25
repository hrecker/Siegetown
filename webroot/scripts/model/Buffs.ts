import { Building } from "./Base";
import { config } from "./Config";

export type Buffs = {
    damageBuff: number;
    healthBuff: number;
}

export function buildingBuffs(building: Building): Buffs {
    if ("produce" in config()["buildings"][building]) {
        let base = config()["buildings"][building]["produce"];
        return {
            damageBuff: ("damageBuff" in base) ? base["damageBuff"] : 0,
            healthBuff: ("healthBuff" in base) ? base["healthBuff"] : 0,
        }
    }
    return {
        damageBuff: 0,
        healthBuff: 0,
    }
}
