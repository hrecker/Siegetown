/** Enum for available game eras */
export enum Era {
    Cavemen = "cavemen"
}

let currentEra: Era = Era.Cavemen;

/** Set the currently active era */
export function setEra(era: Era) {
    currentEra = era;
}

/** Set the currently active era back to the default */
export function resetEra() {
    setEra(Era.Cavemen);
}

/** Get the currently active era */
export function getCurrentEra(): Era {
    return currentEra;
}