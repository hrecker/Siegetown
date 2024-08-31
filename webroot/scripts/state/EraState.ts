/** Enum for available game eras */
export enum Era {
    Caveman = "Caveman",
    Medieval = "Medieval"
}

export function getSortedEras(): Era[] {
    return [
        Era.Caveman,
        Era.Medieval
    ];
}