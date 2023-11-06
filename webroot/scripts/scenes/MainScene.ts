import { resourceUpdateEvent } from "../events/EventMessenger";
import { ActiveGame, updateGame } from "../game/Game";
import { UIState } from "../game/UIState";
import { Building } from "../model/Base";
import { config } from "../model/Config";
import { createUnit, UnitType } from "../model/Unit";

const boardWidth = 300;
const boardMargin = 10;

export class MainScene extends Phaser.Scene {
    sceneCreated: boolean;
    activeGame: ActiveGame;
    uiState: UIState;

    gridTexts: Phaser.GameObjects.Text[][];

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
                this.gridTexts[i][j] = this.add.text(x, y, this.getBuildingText(this.activeGame.base.grid[i][j])).setOrigin(0.5, 0.5).setFontSize(128);
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

        //TODO costs besides gold
        let cost = config()["buildings"][this.uiState.selectedBuilding]["cost"]["gold"];
        if (this.activeGame.gold < cost) {
            return;
        }

        // Build the building
        this.activeGame.base.grid[gridX][gridY] = this.uiState.selectedBuilding;
        this.gridTexts[gridX][gridY].text = this.getBuildingText(this.uiState.selectedBuilding);
        this.activeGame.gold -= cost;
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

        //TODO costs besides gold
        let cost = config()["units"][this.uiState.selectedUnit]["cost"]["gold"];
        if (this.activeGame.gold < cost) {
            return;
        }

        // Build the unit
        let unit = this.add.circle(0, this.laneTopY + (this.laneHeight / 2) + (this.laneHeight * lane), this.laneHeight / 2, 0xffffff);
        this.activeGame.lanes[lane].playerUnits.push(createUnit(this.uiState.selectedUnit, unit));
        this.activeGame.gold -= cost;
        resourceUpdateEvent();
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

    reset() {
        this.cameras.main.setBackgroundColor(0x00303B);
    }


    update(time, delta) {
        updateGame(this.activeGame, time, this.game.renderer.width);
    }
}