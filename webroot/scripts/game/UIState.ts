import { Building } from "../model/Base";
import { UnitType } from "../model/Unit";

export type UIState = {
    selectedBuilding: Building;
    selectedUnit: UnitType;
}

export function createUIState(): UIState {
    return {
        selectedBuilding: Building.Empty,
        selectedUnit: UnitType.None,
    }
}