import { Building } from "./Base";
import { config } from "./Config";
import { UnitType } from "./Unit";

export type Costs = {
    gold: number;
    food: number;
    wood: number;
}

export function buildingCosts(building: Building): Costs {
    return costs("buildings", building);
}

export function unitCosts(unit: UnitType): Costs {
    return costs("units", unit);
}

function costs(baseKey: string, typeKey: string): Costs {
    let costs = config()[baseKey][typeKey]["cost"];
    return {
        gold: costs["gold"],
        food: ("food" in costs) ? costs["food"] : 0,
        wood: ("wood" in costs) ? costs["wood"] : 0
    }
}