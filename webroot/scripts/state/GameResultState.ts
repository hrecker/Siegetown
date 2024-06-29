import { config } from "../model/Config";
import { getCurrentEra } from "./EraState";

export type GameResult = {
    wins: number,
    losses: number,
    time: number
}

const baseResultsKey = "SiegeTownGameResults";
const lifetimeStatsKey = "SiegeTownLifetimeStats";
let latestGameResultIndex = -1;
let latestGameResult: GameResult;

/** Save a player's score on the list of high scores */
export function saveGameResult(gameResult: GameResult): GameResult[] {
    let currentResults = getGameResults();
    latestGameResult = gameResult;
    latestGameResultIndex = -1;
    // Only save wins as high scores
    if (gameResult.wins > 0) {
        for (let i = 0; i <= currentResults.length && i < config()["maxGamesStored"]; i++) {
            if (i == currentResults.length) {
                currentResults.push(latestGameResult);
                latestGameResultIndex = i;
                break;
            } else if (latestGameResult.time <= currentResults[i].time) {
                currentResults.splice(i, 0, latestGameResult);
                latestGameResultIndex = i;
                break;
            }
        }

        // Truncate array to max length
        if (currentResults.length > config()["maxGamesStored"]) {
            currentResults = currentResults.slice(0, config()["maxGamesStored"]);
        }
    }

    //TODO separate stats by era?
    let lifetimeStats = getLifetimeStats();
    lifetimeStats.wins += latestGameResult.wins;
    lifetimeStats.losses += latestGameResult.losses;
    lifetimeStats.time += latestGameResult.time;
    localStorage.setItem(getResultsKey(), JSON.stringify(currentResults));
    // Add all stats from all eras to the same lifetimestats object
    localStorage.setItem(lifetimeStatsKey, JSON.stringify(lifetimeStats));
    return currentResults;
}

/** Get the current high score list for the player */
export function getGameResults(): GameResult[] {
    let results = localStorage.getItem(getResultsKey())
    if (! results) {
        return [];
    }
    let parsed = JSON.parse(results);
    let gameResults: GameResult[] = [];
    parsed.forEach(gameResult => {
        gameResults.push(parseGameResult(gameResult));
    });
    return gameResults;
}

/** Get the key for results for the currently selected challenge (or the main game mode) */
function getResultsKey() {
    return baseResultsKey + getCurrentEra();
}

/** Parse a game result from an object, setting default values for anything undefined */
function parseGameResult(json: any): GameResult {
    let wins = "wins" in json ? json.gemsCollected : 0;
    let losses = "losses" in json ? json.gemsCollected : 0;
    let time = "time" in json ? json.gemsCollected : -1;

    if (typeof wins !== "number") {
        wins = 0;
    }
    if (typeof losses !== "number") {
        losses = 0;
    }
    if (typeof time !== "number") {
        time = 0;
    }

    return {
        wins: wins,
        losses: losses,
        time: time,
    };
}

/** Get lifetime stats for the player */
export function getLifetimeStats(): GameResult {
    let results = localStorage.getItem(lifetimeStatsKey)
    if (! results) {
        return parseGameResult({});
    }
    return parseGameResult(JSON.parse(results));
}

/** Get the index of the latest game result in the stored array */
export function getLatestGameResultIndex() {
    return latestGameResultIndex;
}

/** Get the latest game result */
export function getLatestGameResult() {
    return latestGameResult;
}