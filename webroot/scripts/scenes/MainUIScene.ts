import { addResourceUpdateListener } from "../events/EventMessenger";
import { ActiveGame } from "../game/Game";
import { Building } from "../model/Base";
import { config } from "../model/Config";

/** UI displayed over MainScene */
export class MainUIScene extends Phaser.Scene {
    activeGame: ActiveGame;

    goldText: Phaser.GameObjects.Text;
    woodText: Phaser.GameObjects.Text;
    foodText: Phaser.GameObjects.Text;

    fieldBuildButtonOutline: Phaser.GameObjects.Rectangle;
    lumberyardBuildButtonOutline: Phaser.GameObjects.Rectangle;

    selectedBuild: Building;

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

        this.selectedBuild = Building.Empty;

        //TODO handle building that don't just cost gold
        let fieldBuildButton = this.add.text(this.game.renderer.width - 10, 10, "Build Field: " + config()["buildings"][Building.Field]["cost"]["gold"]).setOrigin(1, 0);
        let lumberyardBuildButton = this.add.text(this.game.renderer.width - 10, 30, "Build Lumberyard: " + config()["buildings"][Building.Lumberyard]["cost"]["gold"]).setOrigin(1, 0);
        this.fieldBuildButtonOutline = this.add.rectangle(fieldBuildButton.getTopLeft().x - 1, fieldBuildButton.getTopLeft().y - 1,
            fieldBuildButton.width + 1, fieldBuildButton.height + 1).setOrigin(0, 0);
        this.fieldBuildButtonOutline.isStroked = true;
        this.fieldBuildButtonOutline.setVisible(false);
        this.lumberyardBuildButtonOutline = this.add.rectangle(lumberyardBuildButton.getTopLeft().x - 1, lumberyardBuildButton.getTopLeft().y - 1,
            lumberyardBuildButton.width + 1, lumberyardBuildButton.height + 1).setOrigin(0, 0);
        this.lumberyardBuildButtonOutline.isStroked = true;
        this.lumberyardBuildButtonOutline.setVisible(false);

        fieldBuildButton.setInteractive();
        lumberyardBuildButton.setInteractive();
        
        fieldBuildButton.on('pointerdown', () => {
            this.selectBuild(Building.Field);
        });
        lumberyardBuildButton.on('pointerdown', () => {
            this.selectBuild(Building.Lumberyard);
        });

        addResourceUpdateListener(this.resourceUpdateListener, this);

        this.scale.on("resize", this.resize, this);
    }

    selectBuild(selection: Building) {
        if (this.selectedBuild == selection) {
            this.selectedBuild = Building.Empty;
        } else {
            this.selectedBuild = selection;
        }
        this.fieldBuildButtonOutline.setVisible(this.selectedBuild == Building.Field);
        this.lumberyardBuildButtonOutline.setVisible(this.selectedBuild == Building.Lumberyard);
    }

    resourceUpdateListener(scene: MainUIScene) {
        scene.goldText.text = "Gold: " + scene.activeGame.gold;
        scene.woodText.text = "Wood: " + scene.activeGame.wood;
        scene.foodText.text = "Food: " + scene.activeGame.food;
    }
}
