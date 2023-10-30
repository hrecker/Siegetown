import { addResourceUpdateListener } from "../events/EventMessenger";
import { ActiveGame } from "../game/Game";

/** UI displayed over MainScene */
export class MainUIScene extends Phaser.Scene {
    activeGame: ActiveGame;

    goldText: Phaser.GameObjects.Text;
    woodText: Phaser.GameObjects.Text;
    foodText: Phaser.GameObjects.Text;

    constructor() {
        super({
            key: "MainUIScene"
        });
    }

    init(data) {
        this.activeGame = data.activeGame;
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

        this.goldText = this.add.text(10, 10, "Gold: 0");
        this.woodText = this.add.text(10, 30, "Wood: 0");
        this.foodText = this.add.text(10, 50, "Food: 0");

        addResourceUpdateListener(this.resourceUpdateListener, this);

        this.scale.on("resize", this.resize, this);
    }

    resourceUpdateListener(scene: MainUIScene) {
        scene.goldText.text = "Gold: " + scene.activeGame.gold;
        scene.woodText.text = "Wood: " + scene.activeGame.wood;
        scene.foodText.text = "Food: " + scene.activeGame.food;
    }
}
