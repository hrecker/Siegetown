import { addActionRunListener, addBuildListener, addGameRestartedListener, addResourceUpdateListener, addUnitBuiltListener, addUnitUnlockedListener } from "../events/EventMessenger";
import { ActiveGame, canAfford, gameEnded, hasBuilding } from "../game/Game";
import { BuildingFrom, UIBuilding, UIState, buildingDisplayName } from "../game/UIState";
import { ActionType, allActions } from "../model/Action";
import { Building } from "../model/Base";
import { config } from "../model/Config";
import { Resources, actionCosts, buildingCosts, unitCosts, zeroResources } from "../model/Resources";
import { SoundEffect, playSound } from "../model/Sound";
import { UnitType, allUnits } from "../model/Unit";
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

type ScrollConfig = {
    scrollZone: Phaser.GameObjects.Zone;
    bottomBuildIcon: Phaser.GameObjects.Sprite;
    scrollIndicator: Phaser.GameObjects.Rectangle;
    topLabel: Phaser.GameObjects.Text;
    canScroll: boolean;
    maxTopY: number;
    minBottomY: number;
    scrollIndicatorYRange: number;
    iconMoveRange: number;
    isScrolling: boolean;
    lastTopIconY: number;
    scrollSpeed: number;
    scrollMaskY: number;
    isUnitConfig: boolean;
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
const iconCostMargin = 16;
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
    tooltips: { [type: string] : Tooltip }
    costTooltips: { [type: string] : Tooltip }
    removeButtonOutline: Phaser.GameObjects.Rectangle;

    buildingLabel: Phaser.GameObjects.Text;
    unitLabel: Phaser.GameObjects.Text;
    powerLabel: Phaser.GameObjects.Text;

    navigationUpButton: Phaser.Input.Keyboard.Key;
    navigationDownButton: Phaser.Input.Keyboard.Key;
    navigationUpButtonWasDown: boolean;
    navigationDownButtonWasDown: boolean;
    lastSelectedType: ShopButtonType;
    selectedIndex: number;
    
    unitScroll: ScrollConfig;
    buildingScroll: ScrollConfig;

    constructor() {
        super({
            key: "ShopUIScene"
        });
    }

    init(data) {
        this.activeGame = data.activeGame;
        this.uiState = data.uiState;
    }

    updateScrollIndicatorPosition(scrollConfig: ScrollConfig) {
        if (! scrollConfig.canScroll) {
            return;
        }

        let totalYDiff = scrollConfig.maxTopY - scrollConfig.topLabel.y;
        let percentage = totalYDiff / scrollConfig.iconMoveRange;
        scrollConfig.scrollIndicator.setPosition(scrollConfig.scrollZone.x + (uiBarWidth / 2) - scrollIndicatorWidth,
            this.getY(1) + (scrollConfig.scrollIndicatorYRange * percentage));
    }

    scrollShopIcons(scrollConfig: ScrollConfig, yDiff: number) {
        if (yDiff == 0 || ! scrollConfig.canScroll) {
            return;
        }

        let finalTopY = scrollConfig.topLabel.y + yDiff;
        let finalBottomY = scrollConfig.bottomBuildIcon.y + yDiff;
        if (yDiff < 0 && finalBottomY < scrollConfig.minBottomY) {
            yDiff = scrollConfig.minBottomY - scrollConfig.bottomBuildIcon.y;
        } else if (yDiff > 0 && finalTopY > scrollConfig.maxTopY) {
            yDiff = scrollConfig.maxTopY - scrollConfig.topLabel.y;
        }

        // Move the icons and boxes
        if (scrollConfig.isUnitConfig) {
            allUnits(this.activeGame.era).forEach(unit => {
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
        } else {
            this.allBuildings().forEach(building => {
                this.buildButtonBorders[building].y += yDiff;
                this.buildButtonIcons[building].y += yDiff;
                this.buildButtonCostTexts[building].y += yDiff;
                moveTooltip(this.tooltips[building], yDiff);
                moveTooltip(this.costTooltips[building], yDiff);
            });

            // Move the labels
            this.buildingLabel.y += yDiff;
        }

        // Move the indicator
        this.updateScrollIndicatorPosition(scrollConfig);
    }

    shopIconScale() {
        return isMinimal(this.game) ? minimalShopIconScale : defaultShopIconScale;
    }

    allBuildings() : UIBuilding[] {
        return config()["eras"][this.activeGame.era]["uiBuildings"]
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
        if (costs.metal) {
            if (useEmoji) {
                costTexts.push(costs.metal + "⛏️");
            } else {
                costTexts.push(costs.metal + " Metal");
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
        return localY + statusBarHeight(this.game, this.activeGame);
    }

    setIcon(iconKey: string, isAvailable: boolean) {
        if (isAvailable) {
            this.buildButtonIcons[iconKey].setTexture(this.buildButtonIcons[iconKey].getData(availableIconKey));
        } else {
            this.buildButtonIcons[iconKey].setTexture(this.buildButtonIcons[iconKey].getData(unavailableIconKey));
        }
    }

    initScrollConfig(): ScrollConfig {
        return {
            scrollZone: null,
            bottomBuildIcon: null,
            scrollIndicator: null,
            topLabel: null,
            canScroll: true,
            maxTopY: 0,
            minBottomY: 0,
            scrollIndicatorYRange: 0,
            iconMoveRange: 0,
            isScrolling: false,
            lastTopIconY: 0,
            scrollSpeed: 0,
            scrollMaskY: 0,
            isUnitConfig: false,
        };
    }

    createScrollZone(x: number, parent: ScrollConfig) {
        parent.scrollZone = this.add.zone(x, 52,
            uiBarWidth / 2, this.game.renderer.height).setOrigin(0).setInteractive();
            parent.scrollZone.on('pointermove', pointer => {
            if (pointer.isDown) {
                // Scroll
                this.scrollShopIcons(parent, pointer.position.y - pointer.prevPosition.y);
                parent.isScrolling = true;
            }
        });
        parent.scrollZone.on('pointerup', () => {
            parent.isScrolling = false;
        });
        parent.scrollZone.on('pointerout', () => {
            parent.isScrolling = false;
        });
    }

    configureScroll(scrollConfig: ScrollConfig, lastShopIcon: Phaser.GameObjects.Sprite) {
        scrollConfig.scrollIndicator = this.add.rectangle(0, 0, 0, 0, 0xF2F0E5).setOrigin(0.5, 0);
        scrollConfig.scrollSpeed = 0;
        scrollConfig.bottomBuildIcon = lastShopIcon;
        scrollConfig.maxTopY = scrollConfig.topLabel.y;
        scrollConfig.lastTopIconY = scrollConfig.topLabel.y;
        scrollConfig.minBottomY = this.game.renderer.height - yScrollMargin;

        let viewableRange = scrollConfig.minBottomY - scrollConfig.maxTopY;
        scrollConfig.iconMoveRange = lastShopIcon.y - scrollConfig.minBottomY;
        let percentage = viewableRange / (lastShopIcon.y - scrollConfig.maxTopY);
        if (percentage >= 1) {
            scrollConfig.scrollIndicator.setVisible(false);
            scrollConfig.canScroll = false;
        } else {
            scrollConfig.scrollIndicator.setVisible(true);
            scrollConfig.canScroll = true;
            let scrollIndicatorMaxHeight = this.game.renderer.height - this.getY(1);
            let indicatorHeight = percentage * scrollIndicatorMaxHeight;
            scrollConfig.scrollIndicatorYRange = scrollIndicatorMaxHeight - indicatorHeight - scrollIndicatorMargin;

            scrollConfig.scrollIndicator.setPosition(scrollConfig.scrollZone.x + (uiBarWidth / 2) - scrollIndicatorWidth, scrollConfig.scrollMaskY);
            scrollConfig.scrollIndicator.setSize(scrollIndicatorWidth, indicatorHeight);
            this.updateScrollIndicatorPosition(scrollConfig);
        }

        let shopIconMask = this.add.graphics().setAlpha(0);
        shopIconMask.fillRect(scrollConfig.scrollZone.x, this.getY(1),
            uiBarWidth / 2, this.game.renderer.height);
        let mask = new Phaser.Display.Masks.GeometryMask(this, shopIconMask);
        // Set the masks
        if (scrollConfig.isUnitConfig) {
            allUnits(this.activeGame.era).forEach(unit => {
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
        } else {
            this.allBuildings().forEach(unit => {
                this.buildButtonBorders[unit].setMask(mask);
                this.buildButtonIcons[unit].setMask(mask);
                this.buildButtonCostTexts[unit].setMask(mask);
            });
            this.buildingLabel.setMask(mask);            
        }
    }

    inZone(x: number, y: number, zone: Phaser.GameObjects.Zone): boolean {
        let topLeft = zone.getTopLeft();
        let bottomRight = zone.getBottomRight();
        return x >= topLeft.x && x <= bottomRight.x && y >= topLeft.y && y <= bottomRight.y;
    }

    create() {
        this.fontSize = defaultFontSize;
        if (isMinimal(this.game)) {
            this.fontSize = minimalFontSize;
        }

        this.uiState.selectedBuilding = UIBuilding.Empty;

        this.buildingScroll = this.initScrollConfig();
        this.unitScroll = this.initScrollConfig();
        this.unitScroll.isUnitConfig = true;
        let buildingScrollX = this.game.renderer.width - uiBarWidth;
        let unitScrollX = this.game.renderer.width - (uiBarWidth / 2);
        this.createScrollZone(buildingScrollX, this.buildingScroll);
        this.createScrollZone(unitScrollX, this.unitScroll);

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Check for which side of the ui bar
            if (this.inZone(pointer.x, pointer.y, this.buildingScroll.scrollZone)) {
                this.scrollShopIcons(this.buildingScroll, -deltaY * scrollWheelSpeed);
            } else if (this.inZone(pointer.x, pointer.y, this.unitScroll.scrollZone)) {
                this.scrollShopIcons(this.unitScroll, -deltaY * scrollWheelSpeed);
            }
        });

        this.buildingLabel = this.add.text(this.getX(uiBarWidth / 4), this.getY(5), "🏠 Buildings", {color: whiteColor}).setOrigin(0.5, 0).setPadding(0, 3).setFontSize(this.fontSize);
        this.unitLabel = this.add.text(this.getX(3 * uiBarWidth  / 4), this.getY(5), "⚔️ Units", {color: whiteColor}).setAlign("right").setOrigin(0.5, 0).setPadding(0, 3).setFontSize(this.fontSize);
        this.buildingScroll.scrollMaskY = this.buildingLabel.y + 30;
        this.buildingScroll.topLabel = this.buildingLabel;
        this.unitScroll.scrollMaskY = this.unitLabel.y + 30;
        this.unitScroll.topLabel = this.unitLabel;

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
        let buildRectangleTopY = this.buildingLabel.getTopLeft().y - 8;
        let buildRectangle = this.add.rectangle(this.getX(1), buildRectangleTopY, uiBarWidth / 2, this.game.renderer.height - buildRectangleTopY - 1).setOrigin(0, 0);
        buildRectangle.isStroked = true;

        y = 52;
        allUnits(this.activeGame.era).forEach(unit => {
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

        this.configureScroll(this.buildingScroll, this.buildButtonIcons[UIBuilding.Remove]);
        this.configureScroll(this.unitScroll, this.buildButtonIcons[allActions()[allActions().length - 1]]);

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
        allUnits(scene.activeGame.era).forEach(unit => {
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
        allUnits(this.activeGame.era).forEach(unit => {
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
        if (gameEnded(this.activeGame) || this.activeGame.isPaused) {
            return;
        }
        // If we are reselecting empty, then no need to do anything here
        if (selection == UIBuilding.Empty && this.uiState.selectedBuilding == UIBuilding.Empty) {
            return;
        }

        playSound(this, SoundEffect.ButtonClick);
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
        if (gameEnded(this.activeGame) || this.activeGame.isPaused) {
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
        for (let i = 0; i < allUnits(this.activeGame.era).length; i++) {
            let currentUnit = allUnits(this.activeGame.era)[i];
            this.setSelectedBorder(this.buildButtonBorders[currentUnit], this.uiState.selectedUnit == currentUnit);
            if (this.uiState.selectedUnit == currentUnit) {
                this.selectedIndex = i;
            }
        }
        // Deselect actions when selecting units
        if (this.uiState.selectedUnit != UnitType.None) {
            playSound(this, SoundEffect.ButtonClick);
            this.selectActionBuild(ActionType.None);
            this.lastSelectedType = ShopButtonType.Unit;
        }
    }

    selectActionBuild(action: ActionType) {
        if (gameEnded(this.activeGame) || this.activeGame.isPaused) {
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
            playSound(this, SoundEffect.ButtonClick);
            this.selectUnitBuild(UnitType.None);
            this.lastSelectedType = ShopButtonType.Action;
        }
    }

    navigateBuildButtons(up: boolean) {
        if (this.selectedIndex == -1 || gameEnded(this.activeGame) || this.activeGame.isPaused) {
            return;
        }
        let options;
        switch (this.lastSelectedType) {
            case ShopButtonType.Building:
                options = this.allBuildings();
                break;
            case ShopButtonType.Unit:
                options = allUnits(this.activeGame.era);
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

    updateScroll(scrollConfig: ScrollConfig) {
        if (scrollConfig.canScroll) {
            if (scrollConfig.isScrolling) {
                scrollConfig.scrollSpeed = scrollConfig.topLabel.y - scrollConfig.lastTopIconY;
            } else if (scrollConfig.scrollSpeed != 0) {
                this.scrollShopIcons(scrollConfig, scrollConfig.scrollSpeed);
                if (scrollConfig.scrollSpeed > 0) {
                    scrollConfig.scrollSpeed = Math.max(scrollConfig.scrollSpeed - scrollSpeedDecay, 0);
                } else if (scrollConfig.scrollSpeed < 0) {
                    scrollConfig.scrollSpeed = Math.min(scrollConfig.scrollSpeed + scrollSpeedDecay, 0);
                }
            }
            scrollConfig.lastTopIconY = scrollConfig.topLabel.y;
        }
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
        
        // Handle scrolling
        this.updateScroll(this.buildingScroll);
        this.updateScroll(this.unitScroll);
    }
}
