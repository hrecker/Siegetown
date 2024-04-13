//https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
/** Randomize array in-place using Durstenfeld shuffle algorithm */
export function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

export function vector2Str(vector: Phaser.Types.Math.Vector2Like) {
    return "(" + vector.x + ", " + vector.y + ")";
}

export function createAnimation(scene: Phaser.Scene, key: string, numFrames: number) {
    let frames = [];
    for (let i = 1; i <= numFrames; i++) {
        frames.push({ key: key + i });
    }
    scene.anims.create({
        key: key,
        frames: frames,
        frameRate: 8,
        repeat: -1
    });
}