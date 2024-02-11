import { Building } from "../model/Base";
import { UnitType } from "../model/Unit";

// Destroy is its own "building" in the UI, so use a separate enum here
export enum UIBuilding {
    Empty = "empty",
    Townhall = "townhall",
    Field = "field",
    Forest = "forest",
    Barracks = "barracks",
    TrainingGround = "trainingground",
    Destroy = "destroy"
}

export type UIState = {
    selectedBuilding: UIBuilding;
    selectedUnit: UnitType;
}

export function UIBuildingFrom(building: Building): UIBuilding {
    return building as unknown as UIBuilding;
}

export function BuildingFrom(uiBuilding: UIBuilding): Building {
    if (uiBuilding == UIBuilding.Destroy) {
        // Maybe not the best behavior?
        return Building.Empty;
    }
    return uiBuilding as unknown as Building;
}

export function createUIState(): UIState {
    return {
        selectedBuilding: UIBuilding.Empty,
        selectedUnit: UnitType.None,
    }
}