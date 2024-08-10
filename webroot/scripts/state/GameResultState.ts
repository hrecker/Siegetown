import { config } from "../model/Config";
import { getCurrentEra } from "./EraState";

export type GameResult = {
    win: boolean,
    time: number
}

export type GameStats = {
    wins: number;
    losses: number;
    recordTime: number;
}

export type TotalGameStats = {
    stats?: { [era: string]: GameStats };
}

const gameStatsKey = "SiegeTownGameStats";

/** Save a player's score on the list of high scores */
export function saveGameResult(gameResult: GameResult): TotalGameStats {
    let lifetimeStats = getStats();
    let era = getCurrentEra();
    if (lifetimeStats && lifetimeStats.stats && lifetimeStats.stats[era]) {
        if (gameResult.win) {
            lifetimeStats.stats[era].wins += 1;
        } else {
            lifetimeStats.stats[era].losses += 1;
        }
        if (gameResult.win && gameResult.time != -1 && (lifetimeStats.stats[era].recordTime == -1 || gameResult.time < lifetimeStats.stats[era].recordTime)) {
            lifetimeStats.stats[era].recordTime = gameResult.time;
        }
    } else {
        lifetimeStats.stats[era] = {
            wins: 0,
            losses: 0,
            recordTime: -1
        }
        if (gameResult.win) {
            lifetimeStats.stats[era].wins = 1;
            lifetimeStats.stats[era].recordTime = gameResult.time;
        } else {
            lifetimeStats.stats[era].losses = 1;
        }
    }
    localStorage.setItem(gameStatsKey, JSON.stringify(lifetimeStats));
    return lifetimeStats;
}

/** Get the current stats for the player */
export function getStats(): TotalGameStats {
    let results = localStorage.getItem(gameStatsKey);
    if (! results) {
        return {
            stats: {}
        };
    }
    let parsed = JSON.parse(results);
    let gameStats: { [era: string]: GameStats } = {};
    if (parsed && parsed.stats) {
        for (let era in parsed.stats) {
            gameStats[era] = parseStats(parsed.stats[era])
        }
    }
    return {
        stats: gameStats
    };
}

/** Parse game stats from an object, setting default values for anything undefined */
function parseStats(json: any): GameStats {
    let wins = "wins" in json ? json.wins : 0;
    let losses = "losses" in json ? json.losses : 0;
    let recordTime = "recordTime" in json ? json.recordTime : -1;

    if (typeof wins !== "number") {
        wins = 0;
    }
    if (typeof losses !== "number") {
        losses = 0;
    }
    if (typeof recordTime !== "number") {
        recordTime = 0;
    }

    return {
        wins: wins,
        losses: losses,
        recordTime: recordTime,
    };
}
