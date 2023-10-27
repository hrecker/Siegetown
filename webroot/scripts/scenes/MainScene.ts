export class MainScene extends Phaser.Scene {
    sceneCreated: boolean;

    constructor() {
        super({
            key: "MainScene"
        });
    }

    /** Adjust any UI elements that need to change position based on the canvas size */
    resize(force?: boolean) {
        if (! this.scene.isActive() && force !== true) {
            return;
        }
        //TODO
    }

    create() {
        if (! this.sceneCreated) {
            // Add event listeners here
            this.sceneCreated = true;
        }

        this.reset();

        this.resize(true);
        this.scale.on("resize", this.resize, this);
    }

    reset() {
        this.cameras.main.setBackgroundColor(0x00303B);
    }


    update(time, delta) {
        //TODO
    }
}