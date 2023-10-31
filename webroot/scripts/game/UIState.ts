import { Building } from "../model/Base";

export type UIState = {
    selectedBuilding: Building;
}

export function createUIState(): UIState {
    return {
        selectedBuilding: Building.Empty
    }
}