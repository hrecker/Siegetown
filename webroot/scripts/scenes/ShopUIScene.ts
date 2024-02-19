import { addBuildListener, addGameRestartedListener } from "../events/EventMessenger";
import { ActiveGame, gameEnded } from "../game/Game";
import { BuildingFrom, UIBuilding, UIState } from "../game/UIState";
import { Building } from "../model/Base";
import { config } from "../model/Config";
import { buildingCosts, unitCosts, zeroResources } from "../model/Resources";
import { UnitType, allUnits } from "../model/Unit";
import { uiBarWidth } from "./ResourceUIScene";

export class ShopUIScene extends Phaser.Scene {
    activeGame: ActiveGame;
    uiState: UIState;

    buildButtons: { [type: string] : Phaser.GameObjects.Text }
    buildButtonOutlines: { [type: string] : Phaser.GameObjects.Rectangle }
    tooltips: { [type: string] : Phaser.GameObjects.Text }
    destroyButtonOutline: Phaser.GameObjects.Rectangle;

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

    allBuildings() : UIBuilding[] {
        return [
            UIBuilding.Townhall,
            UIBuilding.Field,
            UIBuilding.Forest,
            UIBuilding.Market,
            UIBuilding.Barracks,
            UIBuilding.TrainingGround,
            UIBuilding.Destroy,
        ]
    }

    createBuildBuildingButtonText(buildingType: UIBuilding, y: number): Phaser.GameObjects.Text {
        let text = buildingType.toString();
        if (buildingType != UIBuilding.Townhall) {
            // Assume that everything at least costs gold
            let costs = zeroResources();
            if (buildingType == UIBuilding.Destroy) {
                costs.gold = config()["destroyBuildingCost"];
            } else {
                costs = buildingCosts(BuildingFrom(buildingType));
            }
            text += ":\nGold: " + costs.gold;
            if (costs.wood > 0) {
                text += "\nWood: " + costs.wood;
            }
        }
        return this.add.text(this.getX(10), this.getY(y), text);
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
        return this.add.text(this.getX(uiBarWidth - 10), this.getY(y), text).setOrigin(1, 0).setAlign("right");
    }

    createBuildingBuildButton(building: UIBuilding, y: number) {
        let buildButton = this.createBuildBuildingButtonText(building, y);
        let buildButtonOutline = this.add.rectangle(buildButton.getTopLeft().x - 1, buildButton.getTopLeft().y - 1,
            buildButton.width + 1, buildButton.height + 1).setOrigin(0, 0);
        buildButtonOutline.isStroked = true;
        buildButtonOutline.setVisible(false);
        buildButton.on('pointerdown', () => {
            this.selectBuild(building);
        });
    }

    createOutline(button: Phaser.GameObjects.Text): Phaser.GameObjects.Rectangle {
        let buttonOutline = this.add.rectangle(button.getTopLeft().x - 1, button.getTopLeft().y - 1,
            button.width + 1, button.height + 1).setOrigin(0, 0);
        buttonOutline.isStroked = true;
        buttonOutline.setVisible(false);
        return buttonOutline;
    }

    createTooltip(text: string, x: number, y: number): Phaser.GameObjects.Text {
        return this.add.text(x, y, text).setBackgroundColor("blue").setWordWrapWidth(250).setOrigin(1, 1);
    }

    getX(localX: number): number {
        return localX + this.game.renderer.width - uiBarWidth;
    }

    getY(localY: number): number {
        return localY + 180;
    }

    create() {
        this.resize(true);
        //this.cameras.main.setPosition(this.game.renderer.width - uiBarWidth, 180);
        //this.cameras.main.setBackgroundColor(0x111111);

        this.uiState.selectedBuilding = UIBuilding.Empty;

        this.add.text(this.getX(5), this.getY(5), "Buildings");
        this.add.text(this.getX(uiBarWidth - 5), this.getY(5), "Units").setAlign("right").setOrigin(1, 0);

        this.buildButtons = {};
        this.buildButtonOutlines = {};
        this.tooltips = {};
        let y = 30;
        this.allBuildings().forEach(building => {
            let buildButton = this.createBuildBuildingButtonText(building, y);
            let buildButtonOutline = this.createOutline(buildButton);
            buildButton.setInteractive();
            buildButton.on('pointerdown', () => {
                this.selectBuild(building);
            });
            buildButton.on('pointerover', () => {
                this.tooltips[building].setVisible(true);
            });
            buildButton.on('pointerout', () => {
                this.tooltips[building].setVisible(false);
            });
            this.buildButtons[building] = buildButton;
            this.buildButtonOutlines[building] = buildButtonOutline;
            let tooltipText = "";
            if (building == UIBuilding.Destroy) {
                tooltipText = config()["destroyBuildingTooltip"];
            } else {
                tooltipText = config()["buildings"][building]["tooltipText"];
            }
            this.tooltips[building] = this.createTooltip(tooltipText, buildButtonOutline.getTopLeft().x, this.getY(y)).setVisible(false);
            y += buildButtonOutline.height + 5;
        });

        y = 30;
        allUnits().forEach(unit => {
            let buildButton = this.createBuildUnitButtonText(unit, y);
            let buildButtonOutline = this.createOutline(buildButton);
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

    selectBuild(selection: UIBuilding) {
        if (gameEnded(this.activeGame)) {
            return;
        }
        if (this.uiState.selectedBuilding == selection) {
            this.uiState.selectedBuilding = UIBuilding.Empty;
        } else {
            this.uiState.selectedBuilding = selection;
        }
        this.allBuildings().forEach(building => {
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
        // Only can build one townhall in the base
        if (building == Building.Townhall) {
            scene.selectBuild(UIBuilding.Empty);
            scene.setTownhallInteractable(false);
        }
    }

    gameRestartedListener(scene: ShopUIScene) {
        scene.selectBuild(UIBuilding.Empty);
        scene.selectUnitBuild(UnitType.None);
        scene.setTownhallInteractable(true);
    }
}
