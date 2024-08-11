/** Enum for available game eras */
export enum Era {
    Caveman = "Caveman"
}

let currentEra: Era = Era.Caveman;

/** Set the currently active era */
export function setEra(era: Era) {
    currentEra = era;
}

/** Set the currently active era back to the default */
export function resetEra() {
    setEra(Era.Caveman);
}

/** Get the currently active era */
export function getCurrentEra(): Era {
    return currentEra;
}

export function getSortedEras(): Era[] {
    return [
        Era.Caveman
    ];
}