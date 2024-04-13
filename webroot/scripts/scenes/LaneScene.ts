import { resourceUpdateEvent, unitBuiltEvent } from "../events/EventMessenger";
import { ActiveGame, canAfford, chargeCosts, gameEnded, getBuffs, hasBuilding, runAction, updateGame } from "../game/Game";
import { UIState } from "../game/UIState";
import { ActionType } from "../model/Action";
import { Building } from "../model/Base";
import { Buffs } from "../model/Buffs";
import { config } from "../model/Config";
import { actionCosts, unitCosts } from "../model/Resources";
import { allUnits, createUnit, Unit, UnitType, walkAnimation } from "../model/Unit";
import { createAnimation } from "../util/Utils";
import { uiBarWidth } from "./ResourceUIScene";

const enemyColor = 0x911c04;

const healthBarWidth = 64;
const healthBarHeight = 6;
export const healthBarYPos = 36;
const healthBarFillColor = 0x32a852;
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
        
        let graphics = this.add.graphics({ lineStyle: { width: 4 } });

        // Draw the lanes
        this.laneHeight = (this.game.renderer.height - laneSceneTopY) / config()["numLanes"];
        for (let i = 0; i < config()["numLanes"]; i++) {
            let y = laneMargin + (i * this.laneHeight);
            graphics.strokeLineShape(new Phaser.Geom.Line(0, y, this.game.renderer.width, y));
        }

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
        let lane = Math.floor((this.input.activePointer.y - laneSceneTopY - laneMargin) / this.laneHeight);

        if (lane < 0 || lane >= config()["numLanes"]) {
            return;
        }

        // Check to be sure the click wasn't on the overlayed UI bar
        let maxX = this.game.renderer.width - uiBarWidth;
        if (this.input.activePointer.x >= maxX) {
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
        this.activeGame.lanes[lane].playerUnits.push(this.createUnit(this.uiState.selectedUnit, lane, false, false));
        chargeCosts(this.activeGame, costs);
        unitBuiltEvent(this.uiState.selectedUnit);
    }

    createUnit(type: UnitType, lane: number, isEnemy: boolean, ignoreDelays: boolean): Unit {
        let unit = this.add.sprite(isEnemy ? this.game.renderer.width - uiBarWidth : 0,
            laneMargin + (this.laneHeight / 2) + (this.laneHeight * lane), walkAnimation(type)).setScale(0.15).play(walkAnimation(type));
        // Create the Unit's health bar
        let healthBarBackground = this.add.rectangle(unit.x, unit.y,
            healthBarWidth + 2, healthBarHeight + 2, 0, 0.85).setDisplayOrigin(healthBarWidth / 2 + 1, healthBarYPos + 1);
        let healthBar = this.add.rectangle(unit.x - (healthBarWidth / 2), unit.y,
            healthBarWidth, healthBarHeight, healthBarFillColor, 0.85).setDisplayOrigin(0, healthBarYPos);
        // Create the label for the unit
        let label = this.add.text(unit.x, unit.y, String(type).charAt(0)).setOrigin(0.5, 0.5).setFontSize(56).setColor("black").setVisible(false);
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
        return createUnit(type, buffs, unit, label, healthBarBackground, healthBar);
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
        
        // Keep unit health bars and labels in sync with the units
        this.activeGame.lanes.forEach(lane => {
            for (let i = 0; i < lane.playerUnits.length; i++) {
                lane.playerUnits[i].healthBar.x = lane.playerUnits[i].gameObject.x - (healthBarWidth / 2);
                lane.playerUnits[i].healthBarBackground.x = lane.playerUnits[i].gameObject.x;
                lane.playerUnits[i].label.x = lane.playerUnits[i].gameObject.x;
            }
            for (let i = 0; i < lane.enemyUnits.length; i++) {
                lane.enemyUnits[i].healthBar.x = lane.enemyUnits[i].gameObject.x - (healthBarWidth / 2);
                lane.enemyUnits[i].healthBarBackground.x = lane.enemyUnits[i].gameObject.x;
                lane.enemyUnits[i].label.x = lane.enemyUnits[i].gameObject.x;
            }
        });
    }
}