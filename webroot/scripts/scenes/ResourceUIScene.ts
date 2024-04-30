import { addBaseDamagedListener, addEnemyBaseDamagedListener, addGameRestartedListener, addResourceUpdateListener } from "../events/EventMessenger";
import { ActiveGame } from "../game/Game";
import { config } from "../model/Config";
import { whiteColor } from "./BaseScene";

export const uiBarWidth = 300;

export class ResourceUIScene extends Phaser.Scene {
    activeGame: ActiveGame;

    // Building UI
    goldText: Phaser.GameObjects.Text;
    woodText: Phaser.GameObjects.Text;
    foodText: Phaser.GameObjects.Text;
    baseHealthText: Phaser.GameObjects.Text;
    enemyBaseHealthText: Phaser.GameObjects.Text;

    constructor() {
        super({
            key: "ResourceUIScene"
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

        this.cameras.main.setPosition(this.game.renderer.width - uiBarWidth, 0);
        this.cameras.main.setBackgroundColor(0x3A3858);

        this.goldText = this.add.text(10, 10, "Gold: 0", {color: whiteColor});
        this.woodText = this.add.text(10, 30, "Wood: 0", {color: whiteColor});
        this.foodText = this.add.text(10, 50, "Food: 0", {color: whiteColor});
        this.updateResourceText();
        this.baseHealthText = this.add.text(10, 70, "", {color: whiteColor});
        this.baseDamagedListener(this, this.activeGame.baseHealth);
        this.enemyBaseHealthText = this.add.text(10, 140, "", {color: whiteColor});
        this.enemyBaseDamagedListener(this, this.activeGame.enemyBaseHealth);

        addResourceUpdateListener(this.resourceUpdateListener, this);
        addBaseDamagedListener(this.baseDamagedListener, this);
        addEnemyBaseDamagedListener(this.enemyBaseDamagedListener, this);
        addGameRestartedListener(this.gameRestartedListener, this);

        this.scale.on("resize", this.resize, this);
    }

    gameRestartedListener(scene: ResourceUIScene) {
        scene.updateResourceText();
        scene.baseDamagedListener(scene, scene.activeGame.baseHealth);
        scene.enemyBaseDamagedListener(scene, scene.activeGame.enemyBaseHealth);
    }

    updateResourceText() {
        this.goldText.text = "Gold (+" + this.activeGame.base.totalGrowth.gold + "): " + this.activeGame.resources.gold;
        this.foodText.text = "Food (+" + this.activeGame.base.totalGrowth.food + "): " + this.activeGame.resources.food;
        this.woodText.text = "Wood (+" + this.activeGame.base.totalGrowth.wood + "): " + this.activeGame.resources.wood;
    }

    resourceUpdateListener(scene: ResourceUIScene) {
        scene.updateResourceText();
    }

    baseDamagedListener(scene: ResourceUIScene, health: number) {
        scene.baseHealthText.text = "Base Health: " + health + " / " + config()["baseMaxHealth"];
    }

    enemyBaseDamagedListener(scene: ResourceUIScene, health: number) {
        scene.enemyBaseHealthText.text = "Enemy Base\nHealth: " + health + " / " + config()["enemyBaseMaxHealth"];
    }
}
