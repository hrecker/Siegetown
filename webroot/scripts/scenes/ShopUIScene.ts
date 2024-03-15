import { addActionRunListener, addBuildListener, addGameRestartedListener, addResourceUpdateListener, addUnitBuiltListener, addUnitUnlockedListener } from "../events/EventMessenger";
import { ActiveGame, canAfford, gameEnded, hasBuilding } from "../game/Game";
import { BuildingFrom, UIBuilding, UIState } from "../game/UIState";
import { ActionType, allActions } from "../model/Action";
import { Building } from "../model/Base";
import { config } from "../model/Config";
import { Resources, actionCosts, buildingCosts, unitCosts, zeroResources } from "../model/Resources";
import { UnitType, allUnits } from "../model/Unit";
import { uiBarWidth } from "./ResourceUIScene";

enum ButtonState {
    Available,
    Unavailable,
    Locked
}

enum ShopButtonType {
    Building,
    Unit,
    Action,
}

export class ShopUIScene extends Phaser.Scene {
    activeGame: ActiveGame;
    uiState: UIState;

    buildButtons: { [type: string] : Phaser.GameObjects.Text }
    buildButtonOutlines: { [type: string] : Phaser.GameObjects.Rectangle }
    tooltips: { [type: string] : Phaser.GameObjects.Text }
    removeButtonOutline: Phaser.GameObjects.Rectangle;

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
            UIBuilding.Field,
            UIBuilding.Forest,
            UIBuilding.Market,
            UIBuilding.Barracks,
            UIBuilding.TrainingGround,
            UIBuilding.Remove,
        ]
    }

    costsText(costs: Resources): string {
        let text = "";
        if (costs.gold > 0) {
            text += "\nGold: " + costs.gold;
        }
        if (costs.food > 0) {
            text += "\nFood: " + costs.food;
        }
        if (costs.wood) {
            text += "\nWood: " + costs.wood;
        }
        return text;
    }

    createBuildButtonText(key: string, y: number, costs: Resources, rightAlign: boolean) {
        let text = key + ":";
        text += this.costsText(costs);
        if (rightAlign) {
            return this.add.text(this.getX(uiBarWidth - 10), this.getY(y), text).setOrigin(1, 0).setAlign("right");
        } else {
            return this.add.text(this.getX(10), this.getY(y), text);
        }
    }

    createBuildBuildingButtonText(buildingType: UIBuilding, y: number): Phaser.GameObjects.Text {
        let costs = zeroResources();
        if (buildingType == UIBuilding.Remove) {
            costs.gold = config()["removeBuildingCost"];
        } else {
            costs = buildingCosts(BuildingFrom(buildingType));
        }
        return this.createBuildButtonText(buildingType, y, costs, false);
    }

    createBuildUnitButtonText(unitType: UnitType, y: number): Phaser.GameObjects.Text {
        let costs = unitCosts(unitType);
        return this.createBuildButtonText(unitType, y, costs, true);
    }

    createBuildActionButtonText(actionType: ActionType, y: number): Phaser.GameObjects.Text {
        let costs = actionCosts(actionType);
        return this.createBuildButtonText(actionType, y, costs, true);
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

    // Returns the gap needed between this button and the next button... a little jank but hey it works
    createShopButton(buttonType: ShopButtonType, typeKey: string, y: number): number {
        let buildButton;
        let tooltipText = "";
        switch (buttonType) {
            case ShopButtonType.Building:
                buildButton = this.createBuildBuildingButtonText(typeKey as UIBuilding, y);
                if (typeKey == UIBuilding.Remove) {
                    tooltipText = config()["removeBuildingTooltip"];
                } else {
                    tooltipText = config()["buildings"][typeKey]["tooltipText"];
                }
                break;
            case ShopButtonType.Unit:
                buildButton = this.createBuildUnitButtonText(typeKey as UnitType, y);
                tooltipText = config()["units"][typeKey]["tooltipText"];
                break;
            case ShopButtonType.Action:
                buildButton = this.createBuildActionButtonText(typeKey as ActionType, y);
                tooltipText = config()["actions"][typeKey]["tooltipText"];
                break;
        }
        let buildButtonOutline = this.createOutline(buildButton);
        buildButton.setInteractive();
        buildButton.setData("selectable", true);
        buildButton.on('pointerdown', () => {
            if (buildButton.getData("selectable")) {
                switch (buttonType) {
                    case ShopButtonType.Building:
                        this.selectBuild(typeKey as UIBuilding);
                        break;
                    case ShopButtonType.Unit:
                        this.selectUnitBuild(typeKey as UnitType);
                        break;
                    case ShopButtonType.Action:
                        this.selectActionBuild(typeKey as ActionType);
                        break;
                }
            }
        });
        buildButton.on('pointerover', () => {
            this.tooltips[typeKey].setVisible(true);
        });
        buildButton.on('pointerout', () => {
            this.tooltips[typeKey].setVisible(false);
        });
        this.buildButtons[typeKey] = buildButton;
        this.buildButtonOutlines[typeKey] = buildButtonOutline;
        this.tooltips[typeKey] = this.createTooltip(tooltipText, buildButtonOutline.getTopLeft().x, this.getY(y)).setVisible(false);
        return buildButtonOutline.height + 5;
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
            y += this.createShopButton(ShopButtonType.Building, building, y);
        });

        y = 30;
        allUnits().forEach(unit => {
            y += this.createShopButton(ShopButtonType.Unit, unit, y);
        });

        this.add.text(this.getX(uiBarWidth - 5), this.getY(y + 5), "One-time Actions").setAlign("right").setOrigin(1, 0);
        y += 30;
        allActions().forEach(action => {
            y += this.createShopButton(ShopButtonType.Action, action, y);
        });

        addGameRestartedListener(this.gameRestartedListener, this);
        addUnitBuiltListener(this.unitBuiltListener, this);
        addUnitUnlockedListener(this.unitUnlockedListener, this);
        addActionRunListener(this.actionRunListener, this);
        addBuildListener(this.buildingBuildListener, this);
        addResourceUpdateListener(this.resourceUpdateListener, this);

        this.scale.on("resize", this.resize, this);
    }

    setButtonState(key: string, state: ButtonState) {
        let alpha: number;
        let selectable: boolean;
        let hideOutline: boolean;
        switch (state) {
            case ButtonState.Available:
                alpha = 1;
                selectable = true;
                break;
            case ButtonState.Unavailable:
                alpha = 0.6;
                selectable = true;
                break;
            case ButtonState.Locked:
                alpha = 0.3;
                selectable = false;
                hideOutline = true;
                break;
        }

        this.buildButtons[key].alpha = alpha;
        if (hideOutline) {
            this.buildButtonOutlines[key].setVisible(false);
        }
        if (selectable) {
            this.buildButtons[key].setData("selectable", true);
        } else {
            this.buildButtons[key].setData("selectable", false);
        }
    }

    buildingBuildListener(scene: ShopUIScene, building: Building) {
        // Check for any unit buttons that need to be enabled
        allUnits().forEach(unit => {
            // Check for building requirements
            scene.updateUnitButtonState(unit);
        });
    }

    unitBuiltListener(scene: ShopUIScene, unit: UnitType, ) {
        scene.setButtonState(unit, ButtonState.Unavailable);
    }

    unitUnlockedListener(scene: ShopUIScene, unit: UnitType) {
        scene.updateUnitButtonState(unit);
    }

    actionRunListener(scene: ShopUIScene, action: ActionType) {
        scene.setButtonState(action, ButtonState.Locked);
        scene.buildButtonOutlines[action].setVisible(false);
        scene.uiState.selectedAction = ActionType.None;
    }

    resourceUpdateListener(scene: ShopUIScene) {
        scene.updateButtonStates();
    }

    updateUnitButtonState(unit: UnitType) {
        let buildingReq: Building = config()["units"][unit]["buildRequirement"];
        if (! hasBuilding(this.activeGame, buildingReq)) {
            this.setButtonState(unit, ButtonState.Locked);
        } else if (canAfford(this.activeGame, unitCosts(unit)) && this.activeGame.unitSpawnDelaysRemaining[unit] <= 0) {
            this.setButtonState(unit, ButtonState.Available);
        } else {
            this.setButtonState(unit, ButtonState.Unavailable);
        }
    }

    updateButtonStates() {
        // Check for affording each item in the shop
        this.allBuildings().forEach(building => {
            let costs = zeroResources();
            if (building == UIBuilding.Remove) {
                costs.gold = config()["removeBuildingCost"];
            } else {
                costs = buildingCosts(BuildingFrom(building));
            }
            if (canAfford(this.activeGame, costs)) {
                this.setButtonState(building, ButtonState.Available);
            } else {
                this.setButtonState(building, ButtonState.Unavailable);
            }
        });
        allUnits().forEach(unit => {
            this.updateUnitButtonState(unit);
        });
        allActions().forEach(action => {
            let used = false;
            for (let i = 0; i < this.activeGame.usedActions.length; i++) {
                if (this.activeGame.usedActions[i] == action) {
                    // Action is used and locked
                    used = true;
                    break;
                }
            }
            if (used) {
                this.setButtonState(action, ButtonState.Locked);
            } else if (canAfford(this.activeGame, actionCosts(action))) {
                this.setButtonState(action, ButtonState.Available);
            } else {
                this.setButtonState(action, ButtonState.Unavailable);
            }
        });
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
        // Deselect actions when selecting units
        if (this.uiState.selectedUnit != UnitType.None) {
            this.selectActionBuild(ActionType.None);
        }
    }

    selectActionBuild(action: ActionType) {
        if (gameEnded(this.activeGame)) {
            return;
        }
        if (this.uiState.selectedAction == action) {
            this.uiState.selectedAction = ActionType.None;
        } else {
            this.uiState.selectedAction = action;
        }
        allActions().forEach(action => {
            this.buildButtonOutlines[action].setVisible(this.uiState.selectedAction == action);
        });
        // Deselect units when selecting actions
        if (this.uiState.selectedAction != ActionType.None) {
            this.selectUnitBuild(UnitType.None);
        }
    }

    gameRestartedListener(scene: ShopUIScene) {
        scene.selectBuild(UIBuilding.Empty);
        scene.selectUnitBuild(UnitType.None);
    }
}
