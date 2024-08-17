import 'phaser';

import { LoadingScene } from "./scenes/LoadingScene";
import { BackgroundScene } from './scenes/BackgroundScene';
import { BaseScene } from './scenes/BaseScene';
import { OverlayUIScene } from './scenes/OverlayUIScene';
import { LaneScene } from './scenes/LaneScene';
import { ResourceUIScene } from './scenes/ResourceUIScene';
import { ShopUIScene } from './scenes/ShopUIScene';
import { MainMenuScene } from './scenes/MainMenuScene';

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
        BackgroundScene,
        MainMenuScene,
        BaseScene,
        LaneScene,
        ResourceUIScene,
        ShopUIScene,
        OverlayUIScene,
    ]
};

new Phaser.Game(config);
