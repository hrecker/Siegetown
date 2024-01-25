import { addBaseDamagedListener, addBuildListener, addEnemyBaseDamagedListener, addResourceUpdateListener, gameRestartedEvent } from "../events/EventMessenger";
import { ActiveGame, getGrowth } from "../game/Game";
import { UIState } from "../game/UIState";
import { Building, allBuildings } from "../model/Base";
import { config } from "../model/Config";
import { buildingCosts, unitCosts } from "../model/Resources";
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

    buildButtons: { [type: string] : Phaser.GameObjects.Text }
    buildButtonOutlines: { [type: string] : Phaser.GameObjects.Rectangle }

    // Unit UI
    warriorBuildButtonOutline: Phaser.GameObjects.Rectangle;
    slingshotterBuildButtonOutline: Phaser.GameObjects.Rectangle;

    // Game result UI
    resultBackground: Phaser.GameObjects.Rectangle;
    gameResultText: Phaser.GameObjects.Text;
    restartButton: Phaser.GameObjects.Text;
    restartButtonOutline: Phaser.GameObjects.Rectangle;

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
        let text = "Build " + buildingType ;
        if (buildingType != Building.Townhall) {
            // Assume that everything at least costs gold
            let costs = buildingCosts(buildingType);
            text += ":\nGold: " + costs.gold;
            if (costs.wood > 0) {
                text += "\nWood: " + costs.wood;
            }
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

    setGameEndVisible(visible: boolean) {
        this.resultBackground.visible = visible;
        this.gameResultText.visible = visible;
        this.restartButton.visible = visible;
        this.restartButtonOutline.visible = visible;
    }

    createBuildingBuildButton(building: Building, y: number) {
        let buildButton = this.createBuildBuildingButtonText(building, y);
        let buildButtonOutline = this.add.rectangle(buildButton.getTopLeft().x - 1, buildButton.getTopLeft().y - 1,
            buildButton.width + 1, buildButton.height + 1).setOrigin(0, 0);
        buildButtonOutline.isStroked = true;
        buildButtonOutline.setVisible(false);
        buildButton.on('pointerdown', () => {
            this.selectBuild(building);
        });
    }

    create() {
        this.resize(true);

        this.goldText = this.add.text(10, 10, "Gold: 0");
        this.woodText = this.add.text(10, 30, "Wood: 0");
        this.foodText = this.add.text(10, 50, "Food: 0");
        this.updateResourceText();
        this.baseHealthText = this.add.text(10, 70, "");
        this.baseDamagedListener(this, this.activeGame.baseHealth);
        this.enemyBaseHealthText = this.add.text(10, 140, "");
        this.enemyBaseDamagedListener(this, this.activeGame.enemyBaseHealth);

        this.uiState.selectedBuilding = Building.Empty;

        this.buildButtons = {};
        this.buildButtonOutlines = {};
        let y = 10;
        allBuildings().forEach(building => {
            let buildButton = this.createBuildBuildingButtonText(building, y);
            let buildButtonOutline = this.add.rectangle(buildButton.getTopLeft().x - 1, buildButton.getTopLeft().y - 1,
                buildButton.width + 1, buildButton.height + 1).setOrigin(0, 0);
            buildButtonOutline.isStroked = true;
            buildButtonOutline.setVisible(false);
            buildButton.setInteractive();
            buildButton.on('pointerdown', () => {
                this.selectBuild(building);
            });
            this.buildButtons[building] = buildButton;
            this.buildButtonOutlines[building] = buildButtonOutline;
            y += buildButtonOutline.height;
        })

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

        this.resultBackground = this.add.rectangle(0, 0, this.game.renderer.width, this.game.renderer.height, 0, 0.8).setOrigin(0, 0);
        this.gameResultText = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 - 50, "Victory!").setFontSize(64).setOrigin(0.5, 0.5);
        this.restartButton = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 + 50, "Restart").setFontSize(48).setOrigin(0.5, 0.5);
        this.restartButtonOutline = this.add.rectangle(this.restartButton.getTopLeft().x - 1, this.restartButton.getTopLeft().y - 1,
            this.restartButton.width + 1, this.restartButton.height + 1).setOrigin(0, 0);
        this.restartButtonOutline.isStroked = true;
        this.setGameEndVisible(false);

        warriorBuildButton.setInteractive();
        slingshotterBuildButton.setInteractive();
        this.restartButton.setInteractive();
        
        warriorBuildButton.on('pointerdown', () => {
            this.selectUnitBuild(UnitType.Warrior);
        });
        slingshotterBuildButton.on('pointerdown', () => {
            this.selectUnitBuild(UnitType.Slingshotter);
        });

        this.restartButton.on('pointerdown', () => {
            gameRestartedEvent();
            this.setGameEndVisible(false);
            this.updateResourceText();
            this.baseDamagedListener(this, this.activeGame.baseHealth);
            this.enemyBaseDamagedListener(this, this.activeGame.enemyBaseHealth);
            this.selectBuild(Building.Empty);
            this.selectUnitBuild(UnitType.None);
        });

        addResourceUpdateListener(this.resourceUpdateListener, this);
        addBaseDamagedListener(this.baseDamagedListener, this);
        addEnemyBaseDamagedListener(this.enemyBaseDamagedListener, this);
        addBuildListener(this.buildListener, this);

        this.scale.on("resize", this.resize, this);
    }

    selectBuild(selection: Building) {
        if (this.uiState.selectedBuilding == selection) {
            this.uiState.selectedBuilding = Building.Empty;
        } else {
            this.uiState.selectedBuilding = selection;
        }
        allBuildings().forEach(building => {
            this.buildButtonOutlines[building].setVisible(this.uiState.selectedBuilding == building);
        });
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

    updateResourceText() {
        let growth = getGrowth(this.activeGame);
        this.goldText.text = "Gold (+" + growth.gold + "): " + this.activeGame.gold;
        this.foodText.text = "Food (+" + growth.food + "): " + this.activeGame.food;
        this.woodText.text = "Wood (+" + growth.wood + "): " + this.activeGame.wood;
    }

    resourceUpdateListener(scene: MainUIScene) {
        scene.updateResourceText();
    }

    baseDamagedListener(scene: MainUIScene, health: number) {
        scene.baseHealthText.text = "Base Health: " + health + " / " + config()["baseMaxHealth"];
        if (health <= 0) {
            scene.gameResultText.text = "Defeat!";
            scene.setGameEndVisible(true);
        }
    }

    enemyBaseDamagedListener(scene: MainUIScene, health: number) {
        scene.enemyBaseHealthText.text = "Enemy Base\nHealth: " + health + " / " + config()["enemyBaseMaxHealth"];
        if (health <= 0) {
            scene.gameResultText.text = "Victory!";
            scene.setGameEndVisible(true);
        }
    }

    buildListener(scene: MainUIScene, building: Building) {
        scene.selectBuild(Building.Empty);
        if (building == Building.Townhall) {
            scene.buildButtons[Building.Townhall].removeInteractive();
            scene.buildButtonOutlines[Building.Townhall].setVisible(false);
        }
    }
}
