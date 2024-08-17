import { addSettingsListener } from "../events/EventMessenger";
import { config } from "../model/Config";
import { stopAllSounds } from "../model/Sound";
import { getSettings, Settings } from "../state/Settings";


/** Shader background shown for menu and for the main game */
export class BackgroundScene extends Phaser.Scene {
    constructor() {
        super({
            key: "BackgroundScene"
        });
    }
    
    bgMusic: Phaser.Sound.BaseSound;

    create() {
        this.bgMusic = this.sound.add('backgroundMusic', {
            loop: true,
            volume: config()["defaultMusicVolume"]
        });
        this.bgMusic.play();
        addSettingsListener(this.settingsListener, this);
    }

    settingsListener(scene: BackgroundScene, newSettings: Settings) {
        if (! newSettings.sfxEnabled) {
            stopAllSounds();
        }
        if (newSettings.musicEnabled) {
            scene.bgMusic.resume();
        } else {
            scene.bgMusic.pause();
        }
    }
}
