/** Enum for available game eras */
export enum Era {
    Caveman = "Caveman",
    Medieval = "Medieval"
}

let currentEra: Era = Era.Caveman;

/** Set the currently active era */
export function setEra(era: Era) {
    currentEra = era;
}

/** Get the currently active era */
export function getCurrentEra(): Era {
    return currentEra;
}

export function getSortedEras(): Era[] {
    return [
        Era.Caveman,
        Era.Medieval
    ];
}