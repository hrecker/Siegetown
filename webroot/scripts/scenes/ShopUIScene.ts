import { addBuildListener, addGameRestartedListener } from "../events/EventMessenger";
import { ActiveGame, gameEnded } from "../game/Game";
import { UIState } from "../game/UIState";
import { Building, allBuildings } from "../model/Base";
import { buildingCosts, unitCosts } from "../model/Resources";
import { UnitType } from "../model/Unit";
import { uiBarWidth } from "./ResourceUIScene";

export class ShopUIScene extends Phaser.Scene {
    activeGame: ActiveGame;
    uiState: UIState;

    buildButtons: { [type: string] : Phaser.GameObjects.Text }
    buildButtonOutlines: { [type: string] : Phaser.GameObjects.Rectangle }

    // Unit UI
    warriorBuildButtonOutline: Phaser.GameObjects.Rectangle;
    slingshotterBuildButtonOutline: Phaser.GameObjects.Rectangle;

    constructor() {
        super({
            key: "ShopUIScene"
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
        return this.add.text(10, y, text);
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
        return this.add.text(10, y, text);
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
        this.cameras.main.setPosition(this.game.renderer.width - uiBarWidth, 180);
        this.cameras.main.setBackgroundColor(0x111111);

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
            y += buildButtonOutline.height + 5;
        })

        let warriorBuildButton = this.createBuildUnitButtonText(UnitType.Warrior, y);
        this.warriorBuildButtonOutline = this.add.rectangle(warriorBuildButton.getTopLeft().x - 1, warriorBuildButton.getTopLeft().y - 1,
            warriorBuildButton.width + 1, warriorBuildButton.height + 1).setOrigin(0, 0);
        this.warriorBuildButtonOutline.isStroked = true;
        this.warriorBuildButtonOutline.setVisible(false);
        y += this.warriorBuildButtonOutline.height + 5
        let slingshotterBuildButton = this.createBuildUnitButtonText(UnitType.Slingshotter, y);
        this.slingshotterBuildButtonOutline = this.add.rectangle(slingshotterBuildButton.getTopLeft().x - 1, slingshotterBuildButton.getTopLeft().y - 1,
            slingshotterBuildButton.width + 1, slingshotterBuildButton.height + 1).setOrigin(0, 0);
        this.slingshotterBuildButtonOutline.isStroked = true;
        this.slingshotterBuildButtonOutline.setVisible(false);

        warriorBuildButton.setInteractive();
        slingshotterBuildButton.setInteractive();
        
        warriorBuildButton.on('pointerdown', () => {
            this.selectUnitBuild(UnitType.Warrior);
        });
        slingshotterBuildButton.on('pointerdown', () => {
            this.selectUnitBuild(UnitType.Slingshotter);
        });

        addBuildListener(this.buildListener, this);
        addGameRestartedListener(this.gameRestartedListener, this);

        this.scale.on("resize", this.resize, this);
    }

    selectBuild(selection: Building) {
        if (gameEnded(this.activeGame)) {
            return;
        }
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
        if (gameEnded(this.activeGame)) {
            return;
        }
        if (this.uiState.selectedUnit == unit) {
            this.uiState.selectedUnit = UnitType.None;
        } else {
            this.uiState.selectedUnit = unit;
        }
        this.warriorBuildButtonOutline.setVisible(this.uiState.selectedUnit == UnitType.Warrior);
        this.slingshotterBuildButtonOutline.setVisible(this.uiState.selectedUnit == UnitType.Slingshotter);
    }

    setTownhallInteractable(interactable: boolean) {
        if (interactable) {
            this.buildButtons[Building.Townhall].setInteractive();
        } else {
            this.buildButtons[Building.Townhall].removeInteractive();
            this.buildButtonOutlines[Building.Townhall].setVisible(false);
        }
    }

    buildListener(scene: ShopUIScene, building: Building) {
        scene.selectBuild(Building.Empty);
        if (building == Building.Townhall) {
            // Only can build one townhall in the base
            scene.setTownhallInteractable(false);
        }
    }

    gameRestartedListener(scene: ShopUIScene) {
        scene.selectBuild(Building.Empty);
        scene.selectUnitBuild(UnitType.None);
        scene.setTownhallInteractable(true);
    }
}
