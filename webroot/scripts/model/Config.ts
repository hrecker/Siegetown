let gameConfig;

/** Get the config JSON object for the game */
export function config() {
    return gameConfig;
}

/** Store game config json */
export function loadConfig(configJson) {
    gameConfig = configJson;
}
