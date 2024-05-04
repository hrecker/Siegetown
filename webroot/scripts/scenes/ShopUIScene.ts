import { addActionRunListener, addBuildListener, addGameRestartedListener, addResourceUpdateListener, addUnitBuiltListener, addUnitUnlockedListener } from "../events/EventMessenger";
import { ActiveGame, canAfford, gameEnded, hasBuilding } from "../game/Game";
import { BuildingFrom, UIBuilding, UIState } from "../game/UIState";
import { ActionType, allActions } from "../model/Action";
import { Building } from "../model/Base";
import { config } from "../model/Config";
import { Resources, actionCosts, buildingCosts, unitCosts, zeroResources } from "../model/Resources";
import { Unit, UnitType, allUnits } from "../model/Unit";
import { whiteColor } from "./BaseScene";
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
    None,
}

const shopIconScale = 0.1;
const availableIconKey = "available_icon";
const unavailableIconKey = "unavailable_icon";
const shopIconAvailable = "shop_icon_border";
const shopIconAvailableSelected = "shop_icon_border_selected";
const shopIconUnavailable = "shop_icon_border_unavailable";
const shopIconUnavailableSelected = "shop_icon_border_selected_unavailable";
const shopIconLocked = "shop_icon_border_locked";
const iconCostMargin = 18;
const iconYMargin = 6;

export class ShopUIScene extends Phaser.Scene {
    activeGame: ActiveGame;
    uiState: UIState;

    buildButtonBorders: { [type: string] : Phaser.GameObjects.Sprite }
    buildButtonIcons: { [type: string] : Phaser.GameObjects.Sprite }
    tooltips: { [type: string] : Phaser.GameObjects.Text }
    removeButtonOutline: Phaser.GameObjects.Rectangle;

    navigationUpButton: Phaser.Input.Keyboard.Key;
    navigationDownButton: Phaser.Input.Keyboard.Key;
    navigationUpButtonWasDown: boolean;
    navigationDownButtonWasDown: boolean;
    lastSelectedType: ShopButtonType;
    selectedIndex: number;

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
        let costTexts = []
        if (costs.gold > 0) {
            costTexts.push(costs.gold + "G");
        }
        if (costs.food > 0) {
            costTexts.push(costs.food + "F");
        }
        if (costs.wood) {
            costTexts.push(costs.wood + "W");
        }
        let text = "";
        for (let i = 0; i < costTexts.length; i++) {
            if (i != 0) {
                text += "\n";
            }
            text += costTexts[i];
        }
        return text;
    }

    createBuildButtonText(key: string, y: number, costs: Resources, rightAlign: boolean) {
        let text = key + ":";
        text += this.costsText(costs);
        if (rightAlign) {
            return this.add.text(this.getX(uiBarWidth - 10), this.getY(y), text, {color: whiteColor}).setOrigin(1, 0).setAlign("right");
        } else {
            return this.add.text(this.getX(10), this.getY(y), text, {color: whiteColor});
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
        return this.add.text(x, y, text, {color: whiteColor, backgroundColor: "#352B42"}).setWordWrapWidth(250).setOrigin(1, 1);
    }

    // Returns the gap needed between this button and the next button... a little jank but hey it works
    createShopButton(buttonType: ShopButtonType, typeKey: string, y: number): number {
        let tooltipText = typeKey + "\n";
        let buttonX = -1;
        let iconTexture;
        let costs = zeroResources();
        switch (buttonType) {
            case ShopButtonType.Building:
                buttonX = uiBarWidth / 4;
                if (typeKey == UIBuilding.Remove) {
                    tooltipText += config()["removeBuildingTooltip"];
                    costs.gold = config()["removeBuildingCost"];
                    iconTexture = typeKey + "_icon";
                } else {
                    tooltipText += config()["buildings"][typeKey]["tooltipText"];
                    costs = buildingCosts(BuildingFrom(typeKey as UIBuilding));
                    iconTexture = typeKey + "1";
                }
                break;
            case ShopButtonType.Unit:
                buttonX = 3 * uiBarWidth / 4;
                tooltipText += config()["units"][typeKey]["tooltipText"];
                iconTexture = typeKey + "_icon";
                costs = unitCosts(typeKey as UnitType);
                break;
            case ShopButtonType.Action:
                buttonX = 3 * uiBarWidth / 4;
                tooltipText += config()["actions"][typeKey]["tooltipText"];
                iconTexture = typeKey + "_icon";
                costs = actionCosts(typeKey as ActionType);
                break;
        }
        let grayIconTexture = typeKey + "_gray";
        let buildButtonIcon = this.add.sprite(this.getX(buttonX - iconCostMargin), this.getY(y), iconTexture).setScale(shopIconScale);
        buildButtonIcon.setData(availableIconKey, iconTexture);
        buildButtonIcon.setData(unavailableIconKey, grayIconTexture);
        let buildButtonBackground = this.add.sprite(this.getX(buttonX - iconCostMargin), this.getY(y), shopIconAvailable).setScale(shopIconScale);
        this.add.text(this.getX(buttonX + iconCostMargin), this.getY(y), this.costsText(costs), {color: whiteColor}).setOrigin(0, 0.5)
        //TODO shop sprites for non buildings
        buildButtonBackground.setInteractive();
        buildButtonBackground.setData("selectable", true);
        buildButtonBackground.on('pointerdown', () => {
            if (buildButtonBackground.getData("selectable")) {
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
        buildButtonBackground.on('pointerover', () => {
            this.tooltips[typeKey].setVisible(true);
        });
        buildButtonBackground.on('pointerout', () => {
            this.tooltips[typeKey].setVisible(false);
        });
        this.buildButtonBorders[typeKey] = buildButtonBackground;
        this.buildButtonIcons[typeKey] = buildButtonIcon;
        this.tooltips[typeKey] = this.createTooltip(tooltipText, buildButtonBackground.getTopLeft().x, this.getY(y)).setVisible(false);
        return buildButtonBackground.displayHeight + iconYMargin;
    }

    getX(localX: number): number {
        return localX + this.game.renderer.width - uiBarWidth;
    }

    getY(localY: number): number {
        return localY + 180;
    }

    setIcon(iconKey: string, isAvailable: boolean) {
        if (isAvailable) {
            this.buildButtonIcons[iconKey].setTexture(this.buildButtonIcons[iconKey].getData(availableIconKey));
        } else {
            this.buildButtonIcons[iconKey].setTexture(this.buildButtonIcons[iconKey].getData(unavailableIconKey));
        }
    }

    create() {
        this.resize(true);

        this.uiState.selectedBuilding = UIBuilding.Empty;

        this.add.text(this.getX(uiBarWidth / 4), this.getY(5), "Buildings", {color: whiteColor}).setOrigin(0.5, 0);
        this.add.text(this.getX(3 * uiBarWidth  / 4), this.getY(5), "Units", {color: whiteColor}).setAlign("right").setOrigin(0.5, 0);

        this.buildButtonBorders = {};
        this.buildButtonIcons = {};
        this.tooltips = {};
        let y = 50;
        this.allBuildings().forEach(building => {
            y += this.createShopButton(ShopButtonType.Building, building, y);
        });

        y = 50;
        allUnits().forEach(unit => {
            y += this.createShopButton(ShopButtonType.Unit, unit, y);
        });

        this.add.text(this.getX(3 * uiBarWidth  / 4), this.getY(y), "Powers", {color: whiteColor}).setAlign("right").setOrigin(0.5, 1);
        y += 30;
        allActions().forEach(action => {
            y += this.createShopButton(ShopButtonType.Action, action, y);
        });

        this.navigationUpButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.navigationDownButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.lastSelectedType = ShopButtonType.None;
        this.selectedIndex = -1;

        addGameRestartedListener(this.gameRestartedListener, this);
        addUnitBuiltListener(this.unitBuiltListener, this);
        addUnitUnlockedListener(this.unitUnlockedListener, this);
        addActionRunListener(this.actionRunListener, this);
        addBuildListener(this.buildingBuildListener, this);
        addResourceUpdateListener(this.resourceUpdateListener, this);

        this.scale.on("resize", this.resize, this);
    }

    isButtonSelected(key: string): boolean {
        return key == this.uiState.selectedAction || key == this.uiState.selectedBuilding || key == this.uiState.selectedUnit;
    }

    setButtonState(key: string, state: ButtonState) {
        let selectable: boolean;
        switch (state) {
            case ButtonState.Available:
                selectable = true;
                if (this.isButtonSelected(key)) {
                    this.buildButtonBorders[key].setTexture(shopIconAvailableSelected);
                } else {
                    this.buildButtonBorders[key].setTexture(shopIconAvailable);
                }
                break;
            case ButtonState.Unavailable:
                selectable = true;
                if (this.isButtonSelected(key)) {
                    this.buildButtonBorders[key].setTexture(shopIconUnavailableSelected);
                } else {
                    this.buildButtonBorders[key].setTexture(shopIconUnavailable);
                }
                break;
            case ButtonState.Locked:
                selectable = false;
                this.buildButtonBorders[key].setTexture(shopIconLocked);
                break;
        }

        this.setIcon(key, state == ButtonState.Available);

        if (selectable) {
            this.buildButtonBorders[key].setData("selectable", true);
        } else {
            this.buildButtonBorders[key].setData("selectable", false);
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
        scene.buildButtonBorders[action].setTexture(shopIconLocked);
        scene.uiState.selectedAction = ActionType.None;
        scene.setIcon(action, false);
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

    setSelectedBorder(icon: Phaser.GameObjects.Sprite, selected: boolean) {
        if (selected) {
            if (icon.texture.key == shopIconAvailable) {
                icon.setTexture(shopIconAvailableSelected);
            } else if (icon.texture.key == shopIconUnavailable) {
                icon.setTexture(shopIconUnavailableSelected);
            }
        } else {
            if (icon.texture.key == shopIconAvailableSelected) {
                icon.setTexture(shopIconAvailable);
            } else if (icon.texture.key == shopIconUnavailableSelected) {
                icon.setTexture(shopIconUnavailable);
            }
        }
    }

    selectBuild(selection: UIBuilding) {
        if (gameEnded(this.activeGame)) {
            return;
        }
        // If we are reselecting empty, then no need to do anything here
        if (selection == UIBuilding.Empty && this.uiState.selectedBuilding == UIBuilding.Empty) {
            return;
        }

        if (this.uiState.selectedBuilding == selection) {
            this.uiState.selectedBuilding = UIBuilding.Empty;
            this.selectedIndex = -1;
            this.lastSelectedType = ShopButtonType.None;
        } else {
            this.uiState.selectedBuilding = selection;
        }
        for (let i = 0; i < this.allBuildings().length; i++) {
            let currentBuilding = this.allBuildings()[i];
            if (this.uiState.selectedBuilding == currentBuilding) {
                this.selectedIndex = i;
                this.lastSelectedType = ShopButtonType.Building;
            }
            this.setSelectedBorder(this.buildButtonBorders[currentBuilding], this.uiState.selectedBuilding == currentBuilding);
        }
    }

    selectUnitBuild(unit: UnitType) {
        if (gameEnded(this.activeGame)) {
            return;
        }
        // If we are reselecting empty, then no need to do anything here
        if (unit == UnitType.None && this.uiState.selectedUnit == UnitType.None) {
            return;
        }
        if (this.uiState.selectedUnit == unit) {
            this.uiState.selectedUnit = UnitType.None;
            this.selectedIndex = -1;
            this.lastSelectedType = ShopButtonType.None;
        } else {
            this.uiState.selectedUnit = unit;
        }
        for (let i = 0; i < allUnits().length; i++) {
            let currentUnit = allUnits()[i];
            this.setSelectedBorder(this.buildButtonBorders[currentUnit], this.uiState.selectedUnit == currentUnit);
            if (this.uiState.selectedUnit == currentUnit) {
                this.selectedIndex = i;
            }
        }
        // Deselect actions when selecting units
        if (this.uiState.selectedUnit != UnitType.None) {
            this.selectActionBuild(ActionType.None);
            this.lastSelectedType = ShopButtonType.Unit;
        }
    }

    selectActionBuild(action: ActionType) {
        if (gameEnded(this.activeGame)) {
            return;
        }
        // If we are reselecting empty, then no need to do anything here
        if (action == ActionType.None && this.uiState.selectedAction == ActionType.None) {
            return;
        }
        if (this.uiState.selectedAction == action) {
            this.uiState.selectedAction = ActionType.None;
            this.selectedIndex = -1;
            this.lastSelectedType = ShopButtonType.None;
        } else {
            this.uiState.selectedAction = action;
        }
        for (let i = 0; i < allActions().length; i++) {
            let currentAction = allActions()[i];
            this.setSelectedBorder(this.buildButtonBorders[currentAction], this.uiState.selectedAction == currentAction);
            if (this.uiState.selectedAction == currentAction) {
                this.selectedIndex = i;
            }
        }
        // Deselect units when selecting actions
        if (this.uiState.selectedAction != ActionType.None) {
            this.selectUnitBuild(UnitType.None);
            this.lastSelectedType = ShopButtonType.Action;
        }
    }

    navigateBuildButtons(up: boolean) {
        if (this.selectedIndex == -1 || gameEnded(this.activeGame)) {
            return;
        }
        let options;
        switch (this.lastSelectedType) {
            case ShopButtonType.Building:
                options = this.allBuildings();
                break;
            case ShopButtonType.Unit:
                options = allUnits();
                break;
            case ShopButtonType.Action:
                options = allActions();
                break;
            case ShopButtonType.None:
                return;
        }

        let index = this.selectedIndex;
        if (up) {
            index = (index + options.length - 1) % options.length;
        } else {
            index = (index + 1) % options.length;
        }
        // Find next selectable option
        while (index != this.selectedIndex) {
            if (this.buildButtonBorders[options[index]].getData("selectable")) {
                break;
            }
            if (up) {
                index = (index + options.length - 1) % options.length;
            } else {
                index = (index + 1) % options.length;
            }
        }

        // If no other selectable option was found, exit
        if (index == this.selectedIndex) {
            return;
        }

        switch (this.lastSelectedType) {
            case ShopButtonType.Building:
                this.selectBuild(options[index]);
                break;
            case ShopButtonType.Unit:
                this.selectUnitBuild(options[index]);
                break;
            case ShopButtonType.Action:
                this.selectActionBuild(options[index]);
                break;
        }
    }

    gameRestartedListener(scene: ShopUIScene) {
        scene.selectBuild(UIBuilding.Empty);
        scene.selectUnitBuild(UnitType.None);
    }

    update(time, delta) {
        // Check for navigation hotkeys
        if (this.navigationUpButton.isDown && ! this.navigationUpButtonWasDown) {
            this.navigateBuildButtons(true);
        }
        if (this.navigationDownButton.isDown && ! this.navigationDownButtonWasDown) {
            this.navigateBuildButtons(false);
        }
        this.navigationUpButtonWasDown = this.navigationUpButton.isDown;
        this.navigationDownButtonWasDown = this.navigationDownButton.isDown;
    }
}
