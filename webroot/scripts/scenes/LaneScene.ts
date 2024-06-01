import { unitBuiltEvent } from "../events/EventMessenger";
import { ActiveGame, canAfford, chargeCosts, gameEnded, getBuffs, hasBuilding, queuePlayerUnit, runAction, updateGame } from "../game/Game";
import { UIState } from "../game/UIState";
import { ActionType } from "../model/Action";
import { Building } from "../model/Base";
import { Buffs } from "../model/Buffs";
import { config } from "../model/Config";
import { actionCosts, unitCosts } from "../model/Resources";
import { createUnit, Unit, UnitType, walkAnimation } from "../model/Unit";
import { capitalizeFirstLetter, createAnimation } from "../util/Utils";
import { uiBarWidth } from "./ResourceUIScene";
import { Tooltip, createTooltip, setTooltipVisible, updateTooltip } from "./ShopUIScene";

const healthBarWidth = 64;
const healthBarHeight = 6;
export const healthBarYPos = 36;
const healthBarFillColor = 0x8AB060;
export const laneSceneTopY = 350;
const laneMargin = 2;
const numberKeyCodes = [
    Phaser.Input.Keyboard.KeyCodes.ONE,
    Phaser.Input.Keyboard.KeyCodes.TWO,
    Phaser.Input.Keyboard.KeyCodes.THREE,
    Phaser.Input.Keyboard.KeyCodes.FOUR,
    Phaser.Input.Keyboard.KeyCodes.FIVE,
    Phaser.Input.Keyboard.KeyCodes.SIX,
    Phaser.Input.Keyboard.KeyCodes.SEVEN,
    Phaser.Input.Keyboard.KeyCodes.EIGHT,
    Phaser.Input.Keyboard.KeyCodes.NINE,
]

export class LaneScene extends Phaser.Scene {
    sceneCreated: boolean;
    activeGame: ActiveGame;
    uiState: UIState;

    laneHeight: number;

    laneButtons: Phaser.Input.Keyboard.Key[];

    playerLaneQueueIndicators: Tooltip[];
    enemyLaneQueueIndicators: Tooltip[];

    previewBackground: Phaser.GameObjects.Rectangle;
    previewText: Phaser.GameObjects.Text;

    constructor() {
        super({
            key: "LaneScene"
        });
    }

    init(data) {
        this.activeGame = data.activeGame;
        this.uiState = data.uiState;
    }

    /** Adjust any UI elements that need to change position based on the canvas size */
    resize(force?: boolean) {
        if (! this.scene.isActive() && force !== true) {
            return;
        }
        //TODO
    }

    create() {
        if (! this.sceneCreated) {
            // Add event listeners here
            this.sceneCreated = true;
        }

        // Position the scene
        this.cameras.main.setPosition(0, laneSceneTopY);
        
        // Add background rectangle to make lanes more visible
        this.add.rectangle(0, 0, this.game.renderer.width, this.game.renderer.height - laneSceneTopY, 0, 0.75).setOrigin(0, 0);
        
        let graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xF2F0E5 } });

        // Draw the lanes
        this.laneHeight = (this.game.renderer.height - laneSceneTopY) / config()["numLanes"];
        this.playerLaneQueueIndicators = [];
        this.enemyLaneQueueIndicators = [];
        for (let i = 0; i < config()["numLanes"]; i++) {
            let y = laneMargin + (i * this.laneHeight);
            graphics.strokeLineShape(new Phaser.Geom.Line(0, y, this.game.renderer.width, y));
            // Prepare the lane queue indicators
            this.playerLaneQueueIndicators.push(createTooltip(this, "+0", 8, y + 8, 0, 0));
            this.playerLaneQueueIndicators[i].background.alpha = 0.7;
            this.playerLaneQueueIndicators[i].text.alpha = 0.7
            this.enemyLaneQueueIndicators.push(createTooltip(this, "+0", this.game.renderer.width - uiBarWidth - 8, y + 8, 1, 0));
            this.enemyLaneQueueIndicators[i].background.alpha = 0.7;
            this.enemyLaneQueueIndicators[i].text.alpha = 0.7;
        }

        this.previewBackground = this.add.rectangle(this.game.renderer.width - uiBarWidth - 6, 10, 100, 10).
            setFillStyle(0x43436A).setOrigin(1, 0).setStrokeStyle(1, 0xF2F0E5).setVisible(false);
        this.previewText = this.add.text(this.game.renderer.width - uiBarWidth - 7, 10, "asdf").setOrigin(1, 0).setVisible(false);
        // Send to front
        this.previewBackground.setDepth(1);
        this.previewText.setDepth(2);

        // Handle mouse clicks
        this.input.on("pointerup", () => {
            this.handleLaneClick();
        });

        // Handle lane hotkeys
        this.laneButtons = [];
        for (let i = 0; i < config()["numLanes"]; i++) {
            this.laneButtons.push(this.input.keyboard.addKey(numberKeyCodes[i]));
        }
        
        // Create animations
        createAnimation(this, "warrior_idle", 2);
        createAnimation(this, "warrior_walk", 4);
        createAnimation(this, "warrior_attack", 5);
        createAnimation(this, "slingshotter_idle", 2);
        createAnimation(this, "slingshotter_walk", 8);
        createAnimation(this, "slingshotter_attack", 4);
        createAnimation(this, "clubman_idle", 2);
        createAnimation(this, "clubman_walk", 8);
        createAnimation(this, "clubman_attack", 4);

        this.resize(true);
        this.scale.on("resize", this.resize, this);
    }

    handleLaneClick() {
        let lane = this.getLaneMousePosition();

        if (! this.isValidLane(lane)) {
            return;
        }

        this.handleLaneActivate(lane);
    }

    handleLaneActivate(lane: number) {
        if (gameEnded(this.activeGame)) {
            return;
        }

        if (! this.handleActionActivate(lane)) {
            this.handleUnitPlacement(lane);
        }
    }

    handleActionActivate(lane: number): boolean {
        if (this.uiState.selectedAction == ActionType.None) {
            return false;
        }

        let costs = actionCosts(this.uiState.selectedAction);
        if (! canAfford(this.activeGame, costs)) {
            return false;
        }

        runAction(this.activeGame, this.uiState.selectedAction, lane, this);
        chargeCosts(this.activeGame, costs);
        return true;
    }

    handleUnitPlacement(lane: number) {
        if (this.uiState.selectedUnit == UnitType.None) {
            return;
        }

        let costs = unitCosts(this.uiState.selectedUnit);
        if (! canAfford(this.activeGame, costs)) {
            return;
        }

        let buildReq: Building = config()["units"][this.uiState.selectedUnit]["buildRequirement"];
        // Verify that the building requirement is met
        if (! hasBuilding(this.activeGame, buildReq)) {
            return;
        }

        // Verify that a spawn delay isn't active
        if (this.activeGame.unitSpawnDelaysRemaining[this.uiState.selectedUnit] > 0) {
            return;
        }

        // Build the unit
        queuePlayerUnit(this.activeGame, lane, this.createUnit(this.uiState.selectedUnit, lane, false, false));
        chargeCosts(this.activeGame, costs);
        unitBuiltEvent(this.uiState.selectedUnit);
    }

    createUnit(type: UnitType, lane: number, isEnemy: boolean, ignoreDelays: boolean): Unit {
        let unit = this.add.sprite(-2000,
            laneMargin + (this.laneHeight / 2) + (this.laneHeight * lane), walkAnimation(type)).setScale(0.15).play(walkAnimation(type));
        // Create the Unit's health bar
        let healthBarBackground = this.add.rectangle(unit.x, unit.y,
            healthBarWidth + 2, healthBarHeight + 2, 0, 0.85).setDisplayOrigin(healthBarWidth / 2 + 1, healthBarYPos + 1);
        let healthBar = this.add.rectangle(unit.x - (healthBarWidth / 2), unit.y,
            healthBarWidth, healthBarHeight, healthBarFillColor, 0.85).setDisplayOrigin(0, healthBarYPos);
        // Get any buffs to health or damage
        let buffs: Buffs;
        if (isEnemy) {
            buffs = {
                damageBuff: 0,
                healthBuff: 0,
            }
            unit.setFlipX(true);
        } else {
            buffs = getBuffs(this.activeGame);
            if (! ignoreDelays) {
                this.activeGame.unitSpawnDelaysRemaining[type] = config()["units"][type]["spawnDelay"];
            }
        }
        return createUnit(type, buffs, unit, healthBarBackground, healthBar);
    }

    updatePreviewText(text: string, lane: number) {
        let newY = laneMargin + (lane * this.laneHeight) + 8;
        if (text == this.previewText.text && this.previewText.y == newY) {
            return;
        }
        this.previewText.text = text;
        if (text == "") {
            this.previewBackground.setVisible(false);
            this.previewText.setVisible(false);
        } else {
            this.previewText.setVisible(true);
            this.previewBackground.setVisible(true);
            this.previewBackground.setSize(this.previewText.width + 2, this.previewText.height + 2);
            this.previewText.y = newY;
            this.previewBackground.y = newY;
        }
    }
    
    getLaneMousePosition(): number {
        // Check to be sure the mouse wasn't on the overlayed UI bar
        let maxX = this.game.renderer.width - uiBarWidth;
        if (this.input.activePointer.x >= maxX) {
            return -1;
        }
        return Math.floor((this.input.activePointer.y - laneSceneTopY - laneMargin) / this.laneHeight)
    }

    isValidLane(lane: number): boolean {
        return lane >= 0 && lane < config()["numLanes"];
    }

    update(time, delta) {
        updateGame(this.activeGame, time, delta, this.game.renderer.width - uiBarWidth, this);

        // Check for lane hotkeys
        for (let i = 0; i < this.laneButtons.length; i++) {
            if (this.laneButtons[i].isDown) {
                this.handleLaneActivate(i);
                break;
            }
        }
        
        for (let i = 0; i < this.activeGame.lanes.length; i++) {
            let lane = this.activeGame.lanes[i]
            // Keep unit health bars and labels in sync with the units
            for (let j = 0; j < lane.playerUnits.length; j++) {
                lane.playerUnits[j].healthBar.x = lane.playerUnits[j].gameObject.x - (healthBarWidth / 2);
                lane.playerUnits[j].healthBarBackground.x = lane.playerUnits[j].gameObject.x;
            }
            for (let j = 0; j < lane.enemyUnits.length; j++) {
                lane.enemyUnits[j].healthBar.x = lane.enemyUnits[j].gameObject.x - (healthBarWidth / 2);
                lane.enemyUnits[j].healthBarBackground.x = lane.enemyUnits[j].gameObject.x;
            }
            // Update queued units indicators
            if (lane.playerQueuedUnits.length > 0) {
                updateTooltip(this.playerLaneQueueIndicators[i], "+" + lane.playerQueuedUnits.length);
                setTooltipVisible(this.playerLaneQueueIndicators[i], true);
            } else {
                setTooltipVisible(this.playerLaneQueueIndicators[i], false);
            }
            if (lane.enemyQueuedUnits.length > 0) {
                updateTooltip(this.enemyLaneQueueIndicators[i], "+" + lane.enemyQueuedUnits.length);
                setTooltipVisible(this.enemyLaneQueueIndicators[i], true);
            } else {
                setTooltipVisible(this.enemyLaneQueueIndicators[i], false);
            }
        }

        // If mousing over an open tile with a selected building, show preview text
        let anyPreview = false;
        if (this.uiState.selectedUnit != UnitType.None || this.uiState.selectedAction != ActionType.None) {
            let laneIndex = this.getLaneMousePosition();
            if (this.isValidLane(laneIndex)) {
                let text: string;
                if (this.uiState.selectedAction != ActionType.None) {
                    text = capitalizeFirstLetter(this.uiState.selectedAction);
                } else {
                    text = "Create " + this.uiState.selectedUnit;
                }
                //console.log(laneIndex)
                this.updatePreviewText(text, laneIndex);
                anyPreview = true;
            }
        } 
        if (! anyPreview) {
            this.updatePreviewText("", 0);
        }
    }
}