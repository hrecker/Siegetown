// Callback types
type EmptyCallback = {
    callback: (scene: Phaser.Scene) => void;
    scene: Phaser.Scene;
}
type NumberCallback = {
    callback: (value: number, scene: Phaser.Scene) => void;
    scene: Phaser.Scene;
}

// Callback lists
//let gameResetCallbacks: EmptyCallback[] = [];

/*export function addGameResetListener(callback: (scene: Phaser.Scene) => void, scene: Phaser.Scene) {
    gameResetCallbacks.push({ 
        callback: callback,
        scene: scene
    });
}

export function gameResetEvent() {
    gameResetCallbacks.forEach(callback =>
        callback.callback(callback.scene));
}*/
