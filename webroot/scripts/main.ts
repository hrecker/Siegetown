import 'phaser';

import { LoadingScene } from "./scenes/LoadingScene";
import { MainScene } from './scenes/MainScene';
import { MainUIScene } from './scenes/MainUIScene';

var config: Phaser.Types.Core.GameConfig = {
    scale: {
        parent: "game-div",
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // NOTE - With hardware acceleration disabled in Chrome, WEBGL causes enormous CPU usage on my desktop.
    type: Phaser.WEBGL,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [
        LoadingScene,
        MainScene,
        MainUIScene,
    ]
};

new Phaser.Game(config);
