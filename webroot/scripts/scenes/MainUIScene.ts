import { addBaseDamagedListener, addEnemyBaseDamagedListener, addResourceUpdateListener } from "../events/EventMessenger";
import { ActiveGame } from "../game/Game";
import { UIState } from "../game/UIState";
import { Building } from "../model/Base";
import { config } from "../model/Config";
import { buildingCosts, unitCosts } from "../model/Cost";
import { UnitType } from "../model/Unit";

/** UI displayed over MainScene */
export class MainUIScene extends Phaser.Scene {
    activeGame: ActiveGame;
    uiState: UIState;

    // Building UI
    goldText: Phaser.GameObjects.Text;
    woodText: Phaser.GameObjects.Text;
    foodText: Phaser.GameObjects.Text;
    baseHealthText: Phaser.GameObjects.Text;
    enemyBaseHealthText: Phaser.GameObjects.Text;

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

    createBuildBuildingButtonText(buildingType: Building, y: number): Phaser.GameObjects.Text {
        let text = "Build " + buildingType + ":\n";
        // Assume that everything at least costs gold
        let costs = buildingCosts(buildingType);
        text += "Gold: " + costs.gold;
        if (costs.wood > 0) {
            text += "\nWood: " + costs.wood;
        }
        return this.add.text(this.game.renderer.width - 10, y, text, {align: "right"}).setOrigin(1, 0);
    }

    createBuildUnitButtonText(unitType: UnitType, y: number): Phaser.GameObjects.Text {
        let text = "Build " + unitType + ":\n";
        // Assume that everything at least costs gold
        let costs = unitCosts(unitType);
        text += "Gold: " + costs.gold;
        if (costs.food > 0) {
            text += "\nFood: " + costs.food;
        }
        if (costs.wood) {
            text += "\nWood: " + costs.wood;
        }
        return this.add.text(this.game.renderer.width - 10, y, text, {align: "right"}).setOrigin(1, 0);
    }

    create() {
        this.resize(true);

        this.goldText = this.add.text(10, 10, "Gold: 0");
        this.woodText = this.add.text(10, 30, "Wood: 0");
        this.foodText = this.add.text(10, 50, "Food: 0");
        this.baseHealthText = this.add.text(10, 70, "");
        this.baseDamagedListener(this, this.activeGame.baseHealth);
        this.enemyBaseHealthText = this.add.text(10, 140, "");
        this.enemyBaseDamagedListener(this, this.activeGame.enemyBaseHealth);

        this.uiState.selectedBuilding = Building.Empty;

        //TODO handle building that don't just cost gold
        let fieldBuildButton = this.createBuildBuildingButtonText(Building.Field, 10);
        let lumberyardBuildButton = this.createBuildBuildingButtonText(Building.Lumberyard, 60);
        this.fieldBuildButtonOutline = this.add.rectangle(fieldBuildButton.getTopLeft().x - 1, fieldBuildButton.getTopLeft().y - 1,
            fieldBuildButton.width + 1, fieldBuildButton.height + 1).setOrigin(0, 0);
        this.fieldBuildButtonOutline.isStroked = true;
        this.fieldBuildButtonOutline.setVisible(false);
        this.lumberyardBuildButtonOutline = this.add.rectangle(lumberyardBuildButton.getTopLeft().x - 1, lumberyardBuildButton.getTopLeft().y - 1,
            lumberyardBuildButton.width + 1, lumberyardBuildButton.height + 1).setOrigin(0, 0);
        this.lumberyardBuildButtonOutline.isStroked = true;
        this.lumberyardBuildButtonOutline.setVisible(false);

        //TODO handle units that don't just cost gold
        let warriorBuildButton = this.createBuildUnitButtonText(UnitType.Warrior, 130);
        let slingshotterBuildButton = this.createBuildUnitButtonText(UnitType.Slingshotter, 180);
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
        addBaseDamagedListener(this.baseDamagedListener, this);
        addEnemyBaseDamagedListener(this.enemyBaseDamagedListener, this);

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

    baseDamagedListener(scene: MainUIScene, health: number) {
        scene.baseHealthText.text = "Base Health: " + health + " / " + config()["baseMaxHealth"];
    }

    enemyBaseDamagedListener(scene: MainUIScene, health: number) {
        scene.enemyBaseHealthText.text = "Enemy Base\nHealth: " + health + " / " + config()["enemyBaseMaxHealth"];
    }
}
