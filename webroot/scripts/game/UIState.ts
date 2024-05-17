import { ActionType } from "../model/Action";
import { Building } from "../model/Base";
import { config } from "../model/Config";
import { UnitType } from "../model/Unit";
import { capitalizeFirstLetter } from "../util/Utils";

// Remove is its own "building" in the UI, so use a separate enum here
export enum UIBuilding {
    Empty = "empty",
    Townhall = "townhall",
    Field = "field",
    Forest = "forest",
    Market = "market",
    Barracks = "barracks",
    TrainingGround = "trainingground",
    Remove = "remove"
}

export type UIState = {
    selectedBuilding: UIBuilding;
    selectedUnit: UnitType;
    selectedAction: ActionType;
}

export function UIBuildingFrom(building: Building): UIBuilding {
    return building as unknown as UIBuilding;
}

export function BuildingFrom(uiBuilding: UIBuilding): Building {
    if (uiBuilding == UIBuilding.Remove) {
        // Maybe not the best behavior?
        return Building.Empty;
    }
    return uiBuilding as unknown as Building;
}

export function createUIState(): UIState {
    return {
        selectedBuilding: UIBuilding.Empty,
        selectedUnit: UnitType.None,
        selectedAction: ActionType.None,
    }
}

export function buildingDisplayName(building: UIBuilding) {
    if (building in config()["buildings"] && "displayName" in config()["buildings"][building]) {
        return config()["buildings"][building]["displayName"];
    } else {
        return capitalizeFirstLetter(building);
    }
}
