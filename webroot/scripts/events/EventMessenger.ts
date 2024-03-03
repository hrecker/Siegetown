import { Building } from "../model/Base";
import { UnitType } from "../model/Unit";

// Callback types
type EmptyCallback = {
    callback: (scene: Phaser.Scene) => void;
    scene: Phaser.Scene;
}
type NumberCallback = {
    callback: (scene: Phaser.Scene, value: number) => void;
    scene: Phaser.Scene;
}
type BuildingCallback = {
    callback: (scene: Phaser.Scene, building: Building) => void;
    scene: Phaser.Scene;
}
type UnitCallback = {
    callback: (scene: Phaser.Scene, unit: UnitType) => void;
    scene: Phaser.Scene;
}

// Callback lists
let resourceUpdateCallbacks: EmptyCallback[] = [];
let baseDamagedCallbacks: NumberCallback[] = [];
let enemyBaseDamagedCallbacks: NumberCallback[] = [];
let gameRestartedCallbacks: EmptyCallback[] = [];
let buildCallbacks: BuildingCallback[] = [];
let waveCountdownUpdatedCallbacks: NumberCallback[] = [];
let unitBuiltCallbacks: UnitCallback[] = [];
let unitUnlockedCallbacks: UnitCallback[] = [];

export function addResourceUpdateListener(callback: (scene: Phaser.Scene) => void, scene: Phaser.Scene) {
    resourceUpdateCallbacks.push({ 
        callback: callback,
        scene: scene
    });
}

export function resourceUpdateEvent() {
    resourceUpdateCallbacks.forEach(callback =>
        callback.callback(callback.scene));
}

export function addBaseDamagedListener(callback: (scene: Phaser.Scene, healthRemaining: number) => void, scene: Phaser.Scene) {
    baseDamagedCallbacks.push({ 
        callback: callback,
        scene: scene
    });
}

export function baseDamagedEvent(healthRemaining: number) {
    baseDamagedCallbacks.forEach(callback =>
        callback.callback(callback.scene, healthRemaining));
}

export function addEnemyBaseDamagedListener(callback: (scene: Phaser.Scene, healthRemaining: number) => void, scene: Phaser.Scene) {
    enemyBaseDamagedCallbacks.push({ 
        callback: callback,
        scene: scene
    });
}

export function enemyBaseDamagedEvent(healthRemaining: number) {
    enemyBaseDamagedCallbacks.forEach(callback =>
        callback.callback(callback.scene, healthRemaining));
}

export function addGameRestartedListener(callback: (scene: Phaser.Scene) => void, scene: Phaser.Scene) {
    gameRestartedCallbacks.push({ 
        callback: callback,
        scene: scene
    });
}

export function gameRestartedEvent() {
    gameRestartedCallbacks.forEach(callback =>
        callback.callback(callback.scene));
}

export function addBuildListener(callback: (scene: Phaser.Scene, building: Building) => void, scene: Phaser.Scene) {
    buildCallbacks.push({ 
        callback: callback,
        scene: scene
    });
}

export function buildEvent(building: Building) {
    buildCallbacks.forEach(callback =>
        callback.callback(callback.scene, building));
}

export function addWaveCountdownUpdatedListener(callback: (scene: Phaser.Scene, secondsRemaining: number) => void, scene: Phaser.Scene) {
    waveCountdownUpdatedCallbacks.push({ 
        callback: callback,
        scene: scene
    });
}

export function waveCountdownUpdatedEvent(secondsRemaining: number) {
    waveCountdownUpdatedCallbacks.forEach(callback =>
        callback.callback(callback.scene, secondsRemaining));
}

export function addUnitBuiltListener(callback: (scene: Phaser.Scene, unit: UnitType) => void, scene: Phaser.Scene) {
    unitBuiltCallbacks.push({ 
        callback: callback,
        scene: scene
    });
}

export function unitBuiltEvent(unit: UnitType) {
    unitBuiltCallbacks.forEach(callback =>
        callback.callback(callback.scene, unit));
}

export function addUnitUnlockedListener(callback: (scene: Phaser.Scene, unit: UnitType) => void, scene: Phaser.Scene) {
    unitUnlockedCallbacks.push({ 
        callback: callback,
        scene: scene
    });
}

export function unitUnlockedEvent(unit: UnitType) {
    unitUnlockedCallbacks.forEach(callback =>
        callback.callback(callback.scene, unit));
}
