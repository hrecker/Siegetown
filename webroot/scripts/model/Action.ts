export enum ActionType {
    None = "none",
    Clear = "clear",
    Reinforcements = "reinforcements",
    Freeze = "freeze"
}

export function allActions(): ActionType[] {
    return [
        ActionType.Freeze,
        ActionType.Reinforcements,
        ActionType.Clear,
    ]
}