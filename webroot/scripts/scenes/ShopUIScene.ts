import { addActionRunListener, addBuildListener, addGameRestartedListener, addResourceUpdateListener, addUnitBuiltListener, addUnitUnlockedListener } from "../events/EventMessenger";
import { ActiveGame, canAfford, gameEnded, hasBuilding } from "../game/Game";
import { BuildingFrom, UIBuilding, UIState, buildingDisplayName } from "../game/UIState";
import { ActionType, allActions } from "../model/Action";
import { Building } from "../model/Base";
import { config } from "../model/Config";
import { Resources, actionCosts, buildingCosts, unitCosts, zeroResources } from "../model/Resources";
import { Unit, UnitType, allUnits } from "../model/Unit";
import { capitalizeFirstLetter } from "../util/Utils";
import { whiteColor } from "./BaseScene";
import { defaultFontSize, isMinimal, minimalFontSize, statusBarHeight, uiBarWidth } from "./ResourceUIScene";

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

export type Tooltip = {
    background: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;
}

const tooltipPadding = 3;
export function createTooltip(scene: Phaser.Scene, text: string, x: number, y: number, textOriginX: number, textOriginY: number): Tooltip {
    let textObj = scene.add.text(x, y, text, {color: whiteColor }).setWordWrapWidth(x - 10).setOrigin(textOriginX, textOriginY).setVisible(false).setPadding(0, 3);
    let background = scene.add.rectangle(textObj.getTopLeft().x - tooltipPadding, textObj.getTopLeft().y - tooltipPadding,
        textObj.displayWidth + (2 * tooltipPadding), textObj.displayHeight + (2 * tooltipPadding)).
        setFillStyle(0x43436A).setVisible(false).setOrigin(0, 0).setStrokeStyle(1, 0xF2F0E5);
    // Send to front
    background.setDepth(1);
    textObj.setDepth(2);
    return {
        background: background,
        text: textObj
    };
}

export function updateTooltip(tooltip: Tooltip, newText: string) {
    tooltip.text.text = newText;
    tooltip.background.setPosition(tooltip.text.getTopLeft().x - tooltipPadding, tooltip.text.getTopLeft().y - tooltipPadding);
    tooltip.background.setSize(tooltip.text.displayWidth + (2 * tooltipPadding), tooltip.text.displayHeight + (2 * tooltipPadding));
}

export function setTooltipVisible(tooltip: Tooltip, visible: boolean) {
    tooltip.background.setVisible(visible);
    tooltip.text.setVisible(visible);
}

export function moveTooltip(tooltip: Tooltip, yDiff: number) {
    tooltip.background.y += yDiff;
    tooltip.text.y += yDiff;
}

const defaultShopIconScale = 0.1;
const minimalShopIconScale = 0.08;
const availableIconKey = "available_icon";
const unavailableIconKey = "unavailable_icon";
const shopIconAvailable = "shop_icon_border";
const shopIconAvailableSelected = "shop_icon_border_selected";
const shopIconUnavailable = "shop_icon_border_unavailable";
const shopIconUnavailableSelected = "shop_icon_border_selected_unavailable";
const shopIconLocked = "shop_icon_border_locked";
const iconCostMargin = 18;
const iconYMargin = 6;
const buttonXMarginLeft = 65;
const yScrollMargin = 29;
const scrollIndicatorWidth = 5;
const scrollIndicatorMargin = 3;
const scrollSpeedDecay = 1;
const scrollWheelSpeed = 0.4;

export class ShopUIScene extends Phaser.Scene {
    activeGame: ActiveGame;
    uiState: UIState;

    fontSize: number;

    buildButtonBorders: { [type: string] : Phaser.GameObjects.Sprite }
    buildButtonIcons: { [type: string] : Phaser.GameObjects.Sprite }
    buildButtonCostTexts: { [type: string] : Phaser.GameObjects.Text }
    bottomActionBuildIcon: Phaser.GameObjects.Sprite;
    tooltips: { [type: string] : Tooltip }
    costTooltips: { [type: string] : Tooltip }
    removeButtonOutline: Phaser.GameObjects.Rectangle;

    unitLabel: Phaser.GameObjects.Text;
    powerLabel: Phaser.GameObjects.Text;

    navigationUpButton: Phaser.Input.Keyboard.Key;
    navigationDownButton: Phaser.Input.Keyboard.Key;
    navigationUpButtonWasDown: boolean;
    navigationDownButtonWasDown: boolean;
    lastSelectedType: ShopButtonType;
    selectedIndex: number;
    
    scrollZone: Phaser.GameObjects.Zone;
    scrollIndicator: Phaser.GameObjects.Rectangle;
    canScroll: boolean;
    maxTopY: number;
    minBottomY: number;
    scrollIndicatorYRange: number;
    iconMoveRange: number;
    isScrolling: boolean;
    lastTopIconY: number;
    scrollSpeed: number;
    scrollMaskY: number;

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

    updateScrollIndicatorPosition() {
        if (! this.canScroll) {
            return;
        }

        let totalYDiff = this.maxTopY - this.unitLabel.y;
        let percentage = totalYDiff / this.iconMoveRange;
        this.scrollIndicator.setPosition(this.game.renderer.width - scrollIndicatorWidth,
            this.getY(1) + (this.scrollIndicatorYRange * percentage));
    }

    scrollTools(yDiff: number) {
        if (yDiff == 0 || ! this.canScroll) {
            return;
        }

        let finalTopY = this.unitLabel.y + yDiff;
        let finalBottomY = this.bottomActionBuildIcon.y + yDiff;
        if (yDiff < 0 && finalBottomY < this.minBottomY) {
            yDiff = this.minBottomY - this.bottomActionBuildIcon.y;
        } else if (yDiff > 0 && finalTopY > this.maxTopY) {
            yDiff = this.maxTopY - this.unitLabel.y;
        }

        // Move the icons and boxes
        allUnits().forEach(unit => {
            this.buildButtonBorders[unit].y += yDiff;
            this.buildButtonIcons[unit].y += yDiff;
            this.buildButtonCostTexts[unit].y += yDiff;
            moveTooltip(this.tooltips[unit], yDiff);
            moveTooltip(this.costTooltips[unit], yDiff);
        });
        allActions().forEach(action => {
            this.buildButtonBorders[action].y += yDiff;
            this.buildButtonIcons[action].y += yDiff;
            this.buildButtonCostTexts[action].y += yDiff;
            moveTooltip(this.tooltips[action], yDiff);
            moveTooltip(this.costTooltips[action], yDiff);
        });

        // Move the labels
        this.unitLabel.y += yDiff;
        this.powerLabel.y += yDiff;

        //TODO move tooltips

        // Move the indicator
        this.updateScrollIndicatorPosition();
    }

    shopIconScale() {
        return isMinimal(this.game) ? minimalShopIconScale : defaultShopIconScale;
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

    costsText(costs: Resources, useEmoji: boolean): string {
        let costTexts = []
        if (costs.gold > 0) {
            if (useEmoji) {
                costTexts.push(costs.gold + "🪙");
            } else {
                costTexts.push(costs.gold + " Gold");
            }
        }
        if (costs.food > 0) {
            if (useEmoji) {
                costTexts.push(costs.food + "🍞");
            } else {
                costTexts.push(costs.food + " Food");
            }
        }
        if (costs.wood) {
            if (useEmoji) {
                costTexts.push(costs.wood + "🪵");
            } else {
                costTexts.push(costs.wood + " Wood");
            }
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

    createOutline(button: Phaser.GameObjects.Text): Phaser.GameObjects.Rectangle {
        let buttonOutline = this.add.rectangle(button.getTopLeft().x - 1, button.getTopLeft().y - 1,
            button.width + 1, button.height + 1).setOrigin(0, 0);
        buttonOutline.isStroked = true;
        buttonOutline.setVisible(false);
        return buttonOutline;
    }

    // Returns the gap needed between this button and the next button... a little jank but hey it works
    createShopButton(buttonType: ShopButtonType, typeKey: string, y: number): number {
        let tooltipText = capitalizeFirstLetter(typeKey) + "\n";
        let buttonX = -1;
        let iconTexture;
        let costs = zeroResources();
        switch (buttonType) {
            case ShopButtonType.Building:
                buttonX = buttonXMarginLeft;
                tooltipText = buildingDisplayName(typeKey as UIBuilding) + "\n";
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
                buttonX = buttonXMarginLeft + uiBarWidth / 2;
                tooltipText += config()["units"][typeKey]["tooltipText"];
                iconTexture = typeKey + "_icon";
                costs = unitCosts(typeKey as UnitType);
                break;
            case ShopButtonType.Action:
                buttonX = buttonXMarginLeft + uiBarWidth / 2;
                tooltipText += config()["actions"][typeKey]["tooltipText"];
                iconTexture = typeKey + "_icon";
                costs = actionCosts(typeKey as ActionType);
                break;
        }
        let grayIconTexture = typeKey + "_gray";
        let buildButtonIcon = this.add.sprite(this.getX(buttonX - iconCostMargin), this.getY(y), iconTexture).setScale(this.shopIconScale());
        buildButtonIcon.setData(availableIconKey, iconTexture);
        buildButtonIcon.setData(unavailableIconKey, grayIconTexture);
        let buildButtonBackground = this.add.sprite(this.getX(buttonX - iconCostMargin), this.getY(y), shopIconAvailable).setScale(this.shopIconScale());
        let costsDisplay = this.add.text(this.getX(buttonX + iconCostMargin), this.getY(y), this.costsText(costs, true), {color: whiteColor}).setOrigin(0, 0.5).setPadding(0, 3).setFontSize(this.fontSize);
        buildButtonBackground.setInteractive();
        costsDisplay.setInteractive();
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
            setTooltipVisible(this.tooltips[typeKey], true);
        });
        buildButtonBackground.on('pointerout', () => {
            setTooltipVisible(this.tooltips[typeKey], false);
        });
        costsDisplay.on('pointerover', () => {
            setTooltipVisible(this.costTooltips[typeKey], true);
        });
        costsDisplay.on('pointerout', () => {
            setTooltipVisible(this.costTooltips[typeKey], false);
        });
        this.buildButtonBorders[typeKey] = buildButtonBackground;
        this.buildButtonIcons[typeKey] = buildButtonIcon;
        this.buildButtonCostTexts[typeKey] = costsDisplay;
        this.tooltips[typeKey] = createTooltip(this, tooltipText, buildButtonBackground.getTopLeft().x, this.getY(y), 1, 1);
        this.costTooltips[typeKey] = createTooltip(this, this.costsText(costs, false), costsDisplay.getTopLeft().x, this.getY(y), 1, 1);
        return buildButtonBackground.displayHeight + iconYMargin;
    }

    getX(localX: number): number {
        return localX + this.game.renderer.width - uiBarWidth;
    }

    getY(localY: number): number {
        return localY + statusBarHeight(this.game);
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
        this.fontSize = defaultFontSize;
        if (isMinimal(this.game)) {
            this.fontSize = minimalFontSize;
        }

        this.uiState.selectedBuilding = UIBuilding.Empty;

        this.scrollZone = this.add.zone(this.game.renderer.width - uiBarWidth, 52,
            uiBarWidth, this.game.renderer.height).setOrigin(0).setInteractive();
        this.scrollZone.on('pointermove', pointer => {
            if (pointer.isDown) {
                // Scroll
                this.scrollTools(pointer.position.y - pointer.prevPosition.y);
                this.isScrolling = true;
            }
        });
        this.scrollZone.on('pointerup', () => {
            this.isScrolling = false;
        });
        this.scrollZone.on('pointerout', () => {
            this.isScrolling = false;
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            //TODO check for which side of the ui bar
            this.scrollTools(-deltaY * scrollWheelSpeed);
        });

        let buildingLabel = this.add.text(this.getX(uiBarWidth / 4), this.getY(5), "🏠 Buildings", {color: whiteColor}).setOrigin(0.5, 0).setPadding(0, 3).setFontSize(this.fontSize);
        this.unitLabel = this.add.text(this.getX(3 * uiBarWidth  / 4), this.getY(5), "⚔️ Units", {color: whiteColor}).setAlign("right").setOrigin(0.5, 0).setPadding(0, 3).setFontSize(this.fontSize);
        this.scrollMaskY = this.unitLabel.y + 30;

        this.buildButtonBorders = {};
        this.buildButtonIcons = {};
        this.buildButtonCostTexts = {};
        this.tooltips = {};
        this.costTooltips = {};
        let initialY = 52;
        let y = initialY;
        this.allBuildings().forEach(building => {
            y += this.createShopButton(ShopButtonType.Building, building, y);
        });
        let buildRectangleTopY = buildingLabel.getTopLeft().y - 8;
        let buildRectangle = this.add.rectangle(this.getX(1), buildRectangleTopY, uiBarWidth / 2, this.game.renderer.height - buildRectangleTopY - 1).setOrigin(0, 0);
        buildRectangle.isStroked = true;

        y = 52;
        allUnits().forEach(unit => {
            y += this.createShopButton(ShopButtonType.Unit, unit, y);
        });
        let unitRectangleTopY = this.unitLabel.getTopLeft().y - 8;
        let unitRectangle = this.add.rectangle(this.getX(uiBarWidth / 2 + 1), unitRectangleTopY, uiBarWidth / 2 - 2, this.game.renderer.height - unitRectangleTopY - 1).setOrigin(0, 0);
        unitRectangle.isStroked = true;

        this.powerLabel = this.add.text(this.getX(3 * uiBarWidth  / 4), this.getY(y), "⚡ Powers", {color: whiteColor}).setAlign("right").setOrigin(0.5, 1).setPadding(0, 3).setFontSize(this.fontSize);
        y += 30;
        allActions().forEach(action => {
            y += this.createShopButton(ShopButtonType.Action, action, y);
        });

        this.scrollIndicator = this.add.rectangle(0, 0, 0, 0, 0x000000).setOrigin(0.5, 0);
        this.scrollSpeed = 0;
        this.bottomActionBuildIcon = this.buildButtonIcons[allActions()[allActions().length - 1]];
        this.maxTopY = this.unitLabel.y;
        this.lastTopIconY = this.unitLabel.y;
        this.minBottomY = this.game.renderer.height - yScrollMargin;

        let viewableRange = this.minBottomY - this.maxTopY;
        this.iconMoveRange = this.bottomActionBuildIcon.y - this.minBottomY;
        let percentage = viewableRange / (this.bottomActionBuildIcon.y - this.maxTopY);
        if (percentage >= 1) {
            this.scrollIndicator.setVisible(false);
            this.canScroll = false;
        } else {
            this.scrollIndicator.setVisible(true);
            this.canScroll = true;
            let scrollIndicatorMaxHeight = this.game.renderer.height - this.getY(1);
            let indicatorHeight = percentage * scrollIndicatorMaxHeight;
            this.scrollIndicatorYRange = scrollIndicatorMaxHeight - indicatorHeight - scrollIndicatorMargin;

            this.scrollIndicator.setPosition(this.game.renderer.width - scrollIndicatorWidth, this.scrollMaskY);
            this.scrollIndicator.setSize(scrollIndicatorWidth, indicatorHeight);
            this.updateScrollIndicatorPosition();
        }

        let shopIconMask = this.add.graphics().setAlpha(0);
        shopIconMask.fillRect(this.game.renderer.width - (uiBarWidth / 2), this.getY(1),
            uiBarWidth, this.game.renderer.height);
        let mask = new Phaser.Display.Masks.GeometryMask(this, shopIconMask);
        // Set the masks
        allUnits().forEach(unit => {
            this.buildButtonBorders[unit].setMask(mask);
            this.buildButtonIcons[unit].setMask(mask);
            this.buildButtonCostTexts[unit].setMask(mask);
        });
        allActions().forEach(action => {
            this.buildButtonBorders[action].setMask(mask);
            this.buildButtonIcons[action].setMask(mask);
            this.buildButtonCostTexts[action].setMask(mask);
        });
        this.unitLabel.setMask(mask);
        this.powerLabel.setMask(mask);

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
        
        // Handle unit/power scrolling
        if (this.canScroll) {
            if (this.isScrolling) {
                this.scrollSpeed = this.unitLabel.y - this.lastTopIconY;
            } else if (this.scrollSpeed != 0) {
                this.scrollTools(this.scrollSpeed);
                if (this.scrollSpeed > 0) {
                    this.scrollSpeed = Math.max(this.scrollSpeed - scrollSpeedDecay, 0);
                } else if (this.scrollSpeed < 0) {
                    this.scrollSpeed = Math.min(this.scrollSpeed + scrollSpeedDecay, 0);
                }
            }
            this.lastTopIconY = this.unitLabel.y;
        }
    }
}
