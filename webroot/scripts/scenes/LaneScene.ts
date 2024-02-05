import { resourceUpdateEvent } from "../events/EventMessenger";
import { ActiveGame, chargeCosts, gameEnded, getBuffs, hasBuilding, updateGame } from "../game/Game";
import { UIState } from "../game/UIState";
import { Building } from "../model/Base";
import { Buffs } from "../model/Buffs";
import { config } from "../model/Config";
import { unitCosts } from "../model/Resources";
import { createUnit, Unit, UnitType } from "../model/Unit";
import { uiBarWidth } from "./ResourceUIScene";

const enemyColor = 0x911c04;

const healthBarWidth = 64;
const healthBarHeight = 6;
export const healthBarYPos = 36;
const healthBarFillColor = 0x32a852;
const sceneTopY = 350;
const laneMargin = 2;

export class LaneScene extends Phaser.Scene {
    sceneCreated: boolean;
    activeGame: ActiveGame;
    uiState: UIState;

    laneHeight: number;

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
        this.cameras.main.setPosition(0, sceneTopY);
        
        let graphics = this.add.graphics({ lineStyle: { width: 4 } });

        // Draw the lanes
        this.laneHeight = (this.game.renderer.height - sceneTopY) / config()["numLanes"];
        for (let i = 0; i < config()["numLanes"]; i++) {
            let y = laneMargin + (i * this.laneHeight);
            graphics.strokeLineShape(new Phaser.Geom.Line(0, y, this.game.renderer.width, y));
        }

        // Handle mouse clicks
        this.input.on("pointerup", () => {
            this.handleLaneClick();
        });

        this.resize(true);
        this.scale.on("resize", this.resize, this);
    }

    handleLaneClick() {
        if (this.uiState.selectedUnit == UnitType.None || gameEnded(this.activeGame)) {
            return;
        }

        let lane = Math.floor((this.input.activePointer.worldY - laneMargin) / this.laneHeight);

        if (lane < 0 || lane >= config()["numLanes"]) {
            return;
        }

        let costs = unitCosts(this.uiState.selectedUnit);
        if (this.activeGame.gold < costs.gold || this.activeGame.food < costs.food || this.activeGame.wood < costs.wood) {
            return;
        }

        let buildReq: Building = config()["units"][this.uiState.selectedUnit]["buildRequirement"];
        // Verify that the building requirement is met
        if (! hasBuilding(this.activeGame, buildReq)) {
            return;
        }

        // Build the unit
        this.activeGame.lanes[lane].playerUnits.push(this.createUnit(this.uiState.selectedUnit, lane, false));
        chargeCosts(this.activeGame, costs);
        resourceUpdateEvent();
    }

    createUnit(type: UnitType, lane: number, isEnemy: boolean): Unit {
        let unit = this.add.circle(isEnemy ? this.game.renderer.width - uiBarWidth : 0,
            laneMargin + (this.laneHeight / 2) + (this.laneHeight * lane), this.laneHeight / 3,
            isEnemy ? enemyColor : 0xffffff);
        // Create the Unit's health bar
        let healthBarBackground = this.add.rectangle(unit.x, unit.y,
            healthBarWidth + 2, healthBarHeight + 2, 0, 0.85).setDisplayOrigin(healthBarWidth / 2 + 1, healthBarYPos + 1);
        let healthBar = this.add.rectangle(unit.x - (healthBarWidth / 2), unit.y,
            healthBarWidth, healthBarHeight, healthBarFillColor, 0.85).setDisplayOrigin(0, healthBarYPos);
        // Create the label for the unit
        let label = this.add.text(unit.x, unit.y, String(type).charAt(0)).setOrigin(0.5, 0.5).setFontSize(56).setColor("black");
        // Get any buffs to health or damage
        let buffs: Buffs;
        if (isEnemy) {
            buffs = {
                damageBuff: 0,
                healthBuff: 0,
            }
        } else {
            buffs = getBuffs(this.activeGame);
        }
        return createUnit(type, buffs, unit, label, healthBarBackground, healthBar);
    }

    update(time, delta) {
        updateGame(this.activeGame, time, this.game.renderer.width - uiBarWidth, this);
        
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