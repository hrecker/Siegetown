import { addBuildListener, addGameRestartedListener } from "../events/EventMessenger";
import { ActiveGame, gameEnded } from "../game/Game";
import { UIState } from "../game/UIState";
import { Building, allBuildings } from "../model/Base";
import { buildingCosts, unitCosts } from "../model/Resources";
import { UnitType, allUnits } from "../model/Unit";
import { uiBarWidth } from "./ResourceUIScene";

export class ShopUIScene extends Phaser.Scene {
    activeGame: ActiveGame;
    uiState: UIState;

    buildButtons: { [type: string] : Phaser.GameObjects.Text }
    buildButtonOutlines: { [type: string] : Phaser.GameObjects.Rectangle }

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
        let text = buildingType.toString();
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
        let text = unitType + ":\n";
        // Assume that everything at least costs gold
        let costs = unitCosts(unitType);
        text += "Gold: " + costs.gold;
        if (costs.food > 0) {
            text += "\nFood: " + costs.food;
        }
        if (costs.wood) {
            text += "\nWood: " + costs.wood;
        }
        return this.add.text(uiBarWidth - 10, y, text).setOrigin(1, 0).setAlign("right");
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

        this.add.text(5, 5, "Buildings");
        this.add.text(uiBarWidth - 5, 5, "Units").setAlign("right").setOrigin(1, 0);

        this.buildButtons = {};
        this.buildButtonOutlines = {};
        let y = 30;
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
        });

        y = 30;
        allUnits().forEach(unit => {
            let buildButton = this.createBuildUnitButtonText(unit, y);
            let buildButtonOutline = this.add.rectangle(buildButton.getTopLeft().x - 1, buildButton.getTopLeft().y - 1,
                buildButton.width + 1, buildButton.height + 1).setOrigin(0, 0);
            buildButtonOutline.isStroked = true;
            buildButtonOutline.setVisible(false);
            buildButton.setInteractive();
            buildButton.on('pointerdown', () => {
                this.selectUnitBuild(unit);
            });
            this.buildButtons[unit] = buildButton;
            this.buildButtonOutlines[unit] = buildButtonOutline;
            y += buildButtonOutline.height + 5
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
        allUnits().forEach(unit => {
            this.buildButtonOutlines[unit].setVisible(this.uiState.selectedUnit == unit);
        });
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
