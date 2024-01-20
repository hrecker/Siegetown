import { resourceUpdateEvent } from "../events/EventMessenger";
import { ActiveGame, chargeCosts, updateGame } from "../game/Game";
import { UIState } from "../game/UIState";
import { Building } from "../model/Base";
import { config } from "../model/Config";
import { buildingCosts, buildingProduction, unitCosts } from "../model/Resources";
import { createUnit, Unit, UnitType } from "../model/Unit";

const boardWidth = 300;
const boardMargin = 10;
const enemyColor = 0x911c04;

const healthBarWidth = 64;
const healthBarHeight = 6;
export const healthBarYPos = 36;
const healthBarFillColor = 0x32a852;

type GridText = {
    mainText: Phaser.GameObjects.Text;
    growthText: Phaser.GameObjects.Text;
}

export class MainScene extends Phaser.Scene {
    sceneCreated: boolean;
    activeGame: ActiveGame;
    uiState: UIState;

    gridTexts: GridText[][];

    boardTopLeftX: number;
    boardTopLeftY: number;
    laneTopY: number;
    laneHeight: number;

    constructor() {
        super({
            key: "MainScene"
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

        this.reset();

        // Draw the board
        this.boardTopLeftX = (this.game.renderer.width / 2) - (boardWidth / 2);
        this.boardTopLeftY = (this.game.renderer.height / 2) - boardWidth + boardMargin;

        let graphics = this.add.graphics({ lineStyle: { width: 4 } });

        for (let i = 0; i <= config()["baseWidth"]; i++) {
            let diff = (boardWidth * i / config()["baseWidth"]);
            graphics.strokeLineShape(new Phaser.Geom.Line(this.boardTopLeftX, this.boardTopLeftY + diff, this.boardTopLeftX + boardWidth, this.boardTopLeftY + diff));
            graphics.strokeLineShape(new Phaser.Geom.Line(this.boardTopLeftX + diff, this.boardTopLeftY, this.boardTopLeftX + diff, this.boardTopLeftY + boardWidth));
        }

        // Draw the buildings
        this.gridTexts = [];
        for (let i = 0; i < config()["baseWidth"]; i++) {
            this.gridTexts[i] = [];
            for (let j = 0; j < config()["baseWidth"]; j++) {
                let x = this.boardTopLeftX + (boardWidth * i / config()["baseWidth"]) + (boardWidth / (config()["baseWidth"] * 2));
                let y = this.boardTopLeftY + (boardWidth * j / config()["baseWidth"]) + (boardWidth / (config()["baseWidth"] * 2));
                let mainText = this.add.text(x, y - 10, this.getBuildingText(this.activeGame.base.grid[i][j])).setOrigin(0.5, 0.5).setFontSize(64);
                let growthText = this.add.text(x, y + 20, this.getGrowthText(this.activeGame.base.grid[i][j])).setOrigin(0.5, 0.5).setFontSize(14);
                this.gridTexts[i][j] = {
                    mainText: mainText,
                    growthText: growthText
                };
            }
        }

        // Draw the lanes
        this.laneTopY = this.boardTopLeftY + boardWidth + boardMargin;
        this.laneHeight = (this.game.renderer.height - this.laneTopY) / config()["numLanes"];
        for (let i = 0; i < config()["numLanes"]; i++) {
            let y = this.laneTopY + (i * this.laneHeight);
            graphics.strokeLineShape(new Phaser.Geom.Line(0, y, this.game.renderer.width, y));
        }

        // Handle mouse clicks
        this.input.on("pointerup", () => {
            this.handleGridClick();
            this.handleLaneClick();
        });

        this.resize(true);
        this.scale.on("resize", this.resize, this);
    }

    handleGridClick() {
        if (this.uiState.selectedBuilding == Building.Empty) {
            return;
        }

        let gridX = Math.floor((this.input.activePointer.worldX - this.boardTopLeftX) / (boardWidth / config()["baseWidth"]));
        let gridY = Math.floor((this.input.activePointer.worldY - this.boardTopLeftY) / (boardWidth / config()["baseWidth"]));

        if (gridX < 0 || gridX >= config()["baseWidth"] || gridY < 0 || gridY >= config()["baseWidth"]) {
            return;
        }

        if (this.activeGame.base.grid[gridX][gridY] != Building.Empty) {
            return;
        }

        let costs = buildingCosts(this.uiState.selectedBuilding);
        if (this.activeGame.gold < costs.gold || this.activeGame.food < costs.food || this.activeGame.wood < costs.wood) {
            return;
        }

        // Build the building
        this.activeGame.base.grid[gridX][gridY] = this.uiState.selectedBuilding;
        this.gridTexts[gridX][gridY].mainText.text = this.getBuildingText(this.uiState.selectedBuilding);
        this.gridTexts[gridX][gridY].growthText.text = this.getGrowthText(this.uiState.selectedBuilding);
        chargeCosts(this.activeGame, costs);
        resourceUpdateEvent();
    }

    handleLaneClick() {
        if (this.uiState.selectedUnit == UnitType.None) {
            return;
        }

        let lane = Math.floor((this.input.activePointer.worldY - this.laneTopY) / this.laneHeight);

        if (lane < 0 || lane >= config()["numLanes"]) {
            return;
        }

        let costs = unitCosts(this.uiState.selectedUnit);
        if (this.activeGame.gold < costs.gold || this.activeGame.food < costs.food || this.activeGame.wood < costs.wood) {
            return;
        }

        // Build the unit
        this.activeGame.lanes[lane].playerUnits.push(this.createUnit(this.uiState.selectedUnit, lane, false));
        chargeCosts(this.activeGame, costs);
        resourceUpdateEvent();
    }

    createUnit(type: UnitType, lane: number, isEnemy: boolean): Unit {
        let unit = this.add.circle(isEnemy ? this.game.renderer.width : 0,
            this.laneTopY + (this.laneHeight / 2) + (this.laneHeight * lane), this.laneHeight / 3,
            isEnemy ? enemyColor : 0xffffff);
        // Create the Unit's health bar
        let healthBarBackground = this.add.rectangle(unit.x, unit.y,
            healthBarWidth + 2, healthBarHeight + 2, 0, 0.85).setDisplayOrigin(healthBarWidth / 2 + 1, healthBarYPos + 1);
        let healthBar = this.add.rectangle(unit.x - (healthBarWidth / 2), unit.y,
            healthBarWidth, healthBarHeight, healthBarFillColor, 0.85).setDisplayOrigin(0, healthBarYPos);
        return createUnit(type, unit, healthBarBackground, healthBar);
    }

    getBuildingText(building: Building): string {
        switch(building) {
            case Building.Field:
                return "F";
            case Building.Lumberyard:
                return "L";
            case Building.Townhall:
                return "T";
        }
        return "";
    }

    getGrowthText(building: Building): string {
        let production = buildingProduction(building);
        let result = "";
        if (production.gold != 0) {
            result += "+" + production.gold + "G";
        }
        if (production.food != 0) {
            result += "+" + production.food + "F";
        }
        if (production.wood != 0) {
            result += "+" + production.wood + "W";
        }
        return result;
    }

    reset() {
        this.cameras.main.setBackgroundColor(0x00303B);
    }

    update(time, delta) {
        updateGame(this.activeGame, time, this.game.renderer.width, this);

        // Keep unit health bars in sync with the units
        this.activeGame.lanes.forEach(lane => {
            for (let i = 0; i < lane.playerUnits.length; i++) {
                lane.playerUnits[i].healthBar.x = lane.playerUnits[i].gameObject.x - (healthBarWidth / 2);
                lane.playerUnits[i].healthBarBackground.x = lane.playerUnits[i].gameObject.x;
            }
            for (let i = 0; i < lane.enemyUnits.length; i++) {
                lane.enemyUnits[i].healthBar.x = lane.enemyUnits[i].gameObject.x - (healthBarWidth / 2);
                lane.enemyUnits[i].healthBarBackground.x = lane.enemyUnits[i].gameObject.x;
            }
        });
    }
}