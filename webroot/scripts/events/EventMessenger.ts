// Callback types
type EmptyCallback = {
    callback: (scene: Phaser.Scene) => void;
    scene: Phaser.Scene;
}
/*type NumberCallback = {
    callback: (value: number, scene: Phaser.Scene) => void;
    scene: Phaser.Scene;
}*/

// Callback lists
let resourceUpdateCallbacks: EmptyCallback[] = [];

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
