import { addResourceUpdateListener } from "../events/EventMessenger";
import { ActiveGame } from "../game/Game";
import { UIState } from "../game/UIState";
import { Building } from "../model/Base";
import { config } from "../model/Config";
import { UnitType } from "../model/Unit";

/** UI displayed over MainScene */
export class MainUIScene extends Phaser.Scene {
    activeGame: ActiveGame;
    uiState: UIState;

    // Building UI
    goldText: Phaser.GameObjects.Text;
    woodText: Phaser.GameObjects.Text;
    foodText: Phaser.GameObjects.Text;

    fieldBuildButtonOutline: Phaser.GameObjects.Rectangle;
    lumberyardBuildButtonOutline: Phaser.GameObjects.Rectangle;

    // Unit UI
    warriorBuildButtonOutline: Phaser.GameObjects.Rectangle;
    slingshotterBuildButtonOutline: Phaser.GameObjects.Rectangle;

    constructor() {
        super({
            key: "MainUIScene"
        });
    }

    init(data) {
        this.activeGame = data.activeGame;
        this.uiState = data.uiState;
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

        this.uiState.selectedBuilding = Building.Empty;

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

        //TODO handle units that don't just cost gold
        let warriorBuildButton = this.add.text(this.game.renderer.width - 10, 110, "Build Warrior: " + config()["units"][UnitType.Warrior]["cost"]["gold"]).setOrigin(1, 0);
        let slingshotterBuildButton = this.add.text(this.game.renderer.width - 10, 130, "Build Slingshotter: " + config()["units"][UnitType.Slingshotter]["cost"]["gold"]).setOrigin(1, 0);
        this.warriorBuildButtonOutline = this.add.rectangle(warriorBuildButton.getTopLeft().x - 1, warriorBuildButton.getTopLeft().y - 1,
            warriorBuildButton.width + 1, warriorBuildButton.height + 1).setOrigin(0, 0);
        this.warriorBuildButtonOutline.isStroked = true;
        this.warriorBuildButtonOutline.setVisible(false);
        this.slingshotterBuildButtonOutline = this.add.rectangle(slingshotterBuildButton.getTopLeft().x - 1, slingshotterBuildButton.getTopLeft().y - 1,
            slingshotterBuildButton.width + 1, slingshotterBuildButton.height + 1).setOrigin(0, 0);
        this.slingshotterBuildButtonOutline.isStroked = true;
        this.slingshotterBuildButtonOutline.setVisible(false);

        fieldBuildButton.setInteractive();
        lumberyardBuildButton.setInteractive();
        warriorBuildButton.setInteractive();
        slingshotterBuildButton.setInteractive();
        
        fieldBuildButton.on('pointerdown', () => {
            this.selectBuild(Building.Field);
        });
        lumberyardBuildButton.on('pointerdown', () => {
            this.selectBuild(Building.Lumberyard);
        });
        
        warriorBuildButton.on('pointerdown', () => {
            this.selectUnitBuild(UnitType.Warrior);
        });
        slingshotterBuildButton.on('pointerdown', () => {
            this.selectUnitBuild(UnitType.Slingshotter);
        });

        addResourceUpdateListener(this.resourceUpdateListener, this);

        this.scale.on("resize", this.resize, this);
    }

    selectBuild(selection: Building) {
        if (this.uiState.selectedBuilding == selection) {
            this.uiState.selectedBuilding = Building.Empty;
        } else {
            this.uiState.selectedBuilding = selection;
        }
        this.fieldBuildButtonOutline.setVisible(this.uiState.selectedBuilding == Building.Field);
        this.lumberyardBuildButtonOutline.setVisible(this.uiState.selectedBuilding == Building.Lumberyard);
    }

    selectUnitBuild(unit: UnitType) {
        if (this.uiState.selectedUnit == unit) {
            this.uiState.selectedUnit = UnitType.None;
        } else {
            this.uiState.selectedUnit = unit;
        }
        this.warriorBuildButtonOutline.setVisible(this.uiState.selectedUnit == UnitType.Warrior);
        this.slingshotterBuildButtonOutline.setVisible(this.uiState.selectedUnit == UnitType.Slingshotter);
    }

    resourceUpdateListener(scene: MainUIScene) {
        scene.goldText.text = "Gold: " + scene.activeGame.gold;
        scene.woodText.text = "Wood: " + scene.activeGame.wood;
        scene.foodText.text = "Food: " + scene.activeGame.food;
    }
}
