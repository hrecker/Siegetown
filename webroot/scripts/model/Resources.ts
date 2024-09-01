import { ActionType } from "./Action";
import { Building } from "./Base";
import { config } from "./Config";
import { UnitType } from "./Unit";

export type Resources = {
    gold: number;
    food: number;
    wood: number;
    metal: number;
}

export function zeroResources(): Resources {
    return {
        gold: 0,
        food: 0,
        wood: 0,
        metal: 0
    };
}

export function buildingCosts(building: Building): Resources {
    return costs("buildings", building);
}

export function buildingProduction(building: Building): Resources {
    return production("buildings", building);
}

export function adjacentBuffProduction(baseBuilding: Building, adjacentBuilding: Building): Resources {
    if ("adjacentBuff" in config()["buildings"][baseBuilding] && adjacentBuilding in config()["buildings"][baseBuilding]["adjacentBuff"]) {
        return configResources(config()["buildings"][baseBuilding]["adjacentBuff"][adjacentBuilding])
    }
    return zeroResources();
}

export function unitCosts(unit: UnitType): Resources {
    return costs("units", unit);
}

export function actionCosts(action: ActionType): Resources {
    return costs("actions", action);
}

export function configResources(base): Resources {
    return {
        gold: ("gold" in base) ? base["gold"] : 0,
        food: ("food" in base) ? base["food"] : 0,
        wood: ("wood" in base) ? base["wood"] : 0,
        metal: ("metal" in base) ? base["metal"] : 0
    }
}

function costs(baseKey: string, typeKey: string): Resources {
    if ("cost" in config()[baseKey][typeKey]) {
        return configResources(config()[baseKey][typeKey]["cost"])
    }
    return zeroResources();
}

function production(baseKey: string, typeKey: string): Resources {
    if ("produce" in config()[baseKey][typeKey]) {
        return configResources(config()[baseKey][typeKey]["produce"])
    }
    return zeroResources();
}

export function subtractResources(start: Resources, diff: Resources): Resources {
    return {
        gold: start.gold - diff.gold,
        food: start.food - diff.food,
        wood: start.wood - diff.wood,
        metal: start.metal - diff.metal
    }
}

export function addResources(start: Resources, diff: Resources): Resources {
    return {
        gold: start.gold + diff.gold,
        food: start.food + diff.food,
        wood: start.wood + diff.wood,
        metal: start.metal + diff.metal
    }
}