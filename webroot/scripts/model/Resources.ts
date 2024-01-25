import { Building } from "./Base";
import { config } from "./Config";
import { UnitType } from "./Unit";

export type Resources = {
    gold: number;
    food: number;
    wood: number;
}

export function buildingCosts(building: Building): Resources {
    return costs("buildings", building);
}

export function buildingProduction(building: Building): Resources {
    return production("buildings", building);
}

export function unitCosts(unit: UnitType): Resources {
    return costs("units", unit);
}

function values(base): Resources {
    return {
        gold: ("gold" in base) ? base["gold"] : 0,
        food: ("food" in base) ? base["food"] : 0,
        wood: ("wood" in base) ? base["wood"] : 0
    }
}

function costs(baseKey: string, typeKey: string): Resources {
    if ("cost" in config()[baseKey][typeKey]) {
        return values(config()[baseKey][typeKey]["cost"])
    }
    return {
        gold: 0,
        food: 0,
        wood: 0
    }
}

function production(baseKey: string, typeKey: string): Resources {
    if ("produce" in config()[baseKey][typeKey]) {
        return values(config()[baseKey][typeKey]["produce"])
    }
    return {
        gold: 0,
        food: 0,
        wood: 0
    }
}