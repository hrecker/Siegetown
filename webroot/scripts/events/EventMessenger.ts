// Callback types
type EmptyCallback = {
    callback: (scene: Phaser.Scene) => void;
    scene: Phaser.Scene;
}
type NumberCallback = {
    callback: (scene: Phaser.Scene, value: number) => void;
    scene: Phaser.Scene;
}

// Callback lists
let resourceUpdateCallbacks: EmptyCallback[] = [];
let baseDamagedCallbacks: NumberCallback[] = [];
let enemyBaseDamagedCallbacks: NumberCallback[] = [];
let gameRestartedCallbacks: EmptyCallback[] = [];

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
