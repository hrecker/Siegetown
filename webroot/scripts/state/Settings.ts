import { settingsEvent } from "../events/EventMessenger";

/** Game settings state */
export type Settings = {
    musicEnabled: boolean;
    sfxEnabled: boolean;
}

const settingsKey = "SiegeTownGameSettings";
let currentSettings: Settings;

/** Load settings from localStorage */
export function loadSavedSettings() {
    currentSettings = {
        musicEnabled: true,
        sfxEnabled: true
    };
    let stored = localStorage.getItem(settingsKey);
    if (stored) {
        let parsed = JSON.parse(stored);
        if ("musicEnabled" in parsed && !parsed.musicEnabled) {
            currentSettings.musicEnabled = false;
        }
        if ("sfxEnabled" in parsed && !parsed.sfxEnabled) {
            currentSettings.sfxEnabled = false;
        }
    }
}

/** Get current settings */
export function getSettings(): Settings {
    if (! currentSettings) {
        loadSavedSettings();
    }
    return currentSettings;
}

/** Enable or disable music */
export function setMusicEnabled(enabled: boolean) {
    if (enabled != currentSettings.musicEnabled) {
        currentSettings.musicEnabled = enabled;
        saveUpdatedSettings();
    }
}

/** Enable or disable sfx */
export function setSfxEnabled(enabled: boolean) {
    if (enabled != currentSettings.sfxEnabled) {
        currentSettings.sfxEnabled = enabled;
        saveUpdatedSettings();
    }
}

/** Save current settings to localStorage */
function saveUpdatedSettings() {
    localStorage.setItem(settingsKey, JSON.stringify(currentSettings));
    settingsEvent(currentSettings);
}