import { addBombUseListener, addGameResetListener } from "../events/EventMessenger";
import { config } from "../model/Config";


/** UI displayed over MainScene */
export class MainUIScene extends Phaser.Scene {
    constructor() {
        super({
            key: "MainUIScene"
        });
    }

    /** Adjust any UI elements that need to change position based on the canvas size */
    resize(force?: boolean) {
        if (! this.scene.isActive() && ! force) {
            return;
        }
        //TODO
    }

    create() {
        this.resize(true);
        this.scale.on("resize", this.resize, this);
    }
}
