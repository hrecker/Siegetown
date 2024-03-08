import { addGameRestartedListener } from "../events/EventMessenger";
import { ActiveGame, buildBuilding, canAfford, destroyBuilding, gameEnded, resetGame } from "../game/Game";
import { BuildingFrom, UIBuilding, UIState } from "../game/UIState";
import { Building } from "../model/Base";
import { buildingBuffs } from "../model/Buffs";
import { config } from "../model/Config";
import { buildingCosts, zeroResources } from "../model/Resources";
import { uiBarWidth } from "./ResourceUIScene";

const boardWidth = 300;
const boardMargin = 10;

type GridText = {
    mainText: Phaser.GameObjects.Text;
    growthText: Phaser.GameObjects.Text;
}

export class BaseScene extends Phaser.Scene {
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
            key: "BaseScene"
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

        // Draw the board
        this.boardTopLeftX = ((this.game.renderer.width - uiBarWidth) / 2) - (boardWidth / 2);
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
                let growthText = this.add.text(x, y + 20, this.getGrowthText(i, j)).setOrigin(0.5, 0.5).setFontSize(14);
                this.gridTexts[i][j] = {
                    mainText: mainText,
                    growthText: growthText
                };
            }
        }

        // Handle mouse clicks
        this.input.on("pointerup", () => {
            this.handleGridClick();
            //this.handleLaneClick();
        });

        this.resize(true);
        this.scale.on("resize", this.resize, this);

        addGameRestartedListener(this.gameRestartedListener, this);
    }

    handleGridClick() {
        if (this.uiState.selectedBuilding == UIBuilding.Empty || gameEnded(this.activeGame)) {
            return;
        }

        let gridX = Math.floor((this.input.activePointer.worldX - this.boardTopLeftX) / (boardWidth / config()["baseWidth"]));
        let gridY = Math.floor((this.input.activePointer.worldY - this.boardTopLeftY) / (boardWidth / config()["baseWidth"]));

        if (gridX < 0 || gridX >= config()["baseWidth"] || gridY < 0 || gridY >= config()["baseWidth"]) {
            return;
        }

        let isDestroy = this.uiState.selectedBuilding == UIBuilding.Destroy;
        // Ensure we aren't destroying an empty space, or building on a non-empty space
        if (isDestroy == (this.activeGame.base.grid[gridX][gridY] == Building.Empty)) {
            return;
        }

        let costs = zeroResources();
        if (isDestroy) {
            costs.gold = config()["destroyBuildingCost"];
        } else {
            costs = buildingCosts(BuildingFrom(this.uiState.selectedBuilding));
        }
        if (! canAfford(this.activeGame, costs)) {
            return;
        }

        // Don't allow destroying townhall
        if (isDestroy && this.activeGame.base.grid[gridX][gridY] == Building.Townhall) {
            return;
        }
        
        // If destroying, destroy the building
        if (isDestroy) {
            this.gridTexts[gridX][gridY].mainText.text = this.getBuildingText(Building.Empty);
            destroyBuilding(this.activeGame, gridX, gridY);
        } else {
            // Build the building
            this.gridTexts[gridX][gridY].mainText.text = this.getBuildingText(BuildingFrom(this.uiState.selectedBuilding));
            buildBuilding(this.activeGame, BuildingFrom(this.uiState.selectedBuilding), gridX, gridY);
        }
        // Update all growth texts as necessary
        for (let i = 0; i < config()["baseWidth"]; i++) {
            for (let j = 0; j < config()["baseWidth"]; j++) {
                this.gridTexts[i][j].growthText.text = this.getGrowthText(i, j);
            }
        }
    }

    getBuildingText(building: Building): string {
        switch(building) {
            case Building.Field:
                return "F";
            case Building.Forest:
                return "O";
            case Building.Market:
                return "M";
            case Building.Townhall:
                return "T";
            case Building.Barracks:
                return "B";
            case Building.TrainingGround:
                return "G";
        }
        return "";
    }

    getGrowthText(x: number, y: number): string {
        let production = this.activeGame.base.growthByTile[x][y];
        let buffs = buildingBuffs(this.activeGame.base.grid[x][y]);
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
        if (buffs.damageBuff != 0) {
            result += "+" + buffs.damageBuff + "D";
        }
        if (buffs.healthBuff != 0) {
            result += "+" + buffs.healthBuff + "H";
        }
        return result;
    }
    
    gameRestartedListener(scene: BaseScene) {
        resetGame(scene.activeGame);
        // redraw the buildings
        for (let i = 0; i < config()["baseWidth"]; i++) {
            for (let j = 0; j < config()["baseWidth"]; j++) {
                scene.gridTexts[i][j].mainText.text = scene.getBuildingText(scene.activeGame.base.grid[i][j]);
                scene.gridTexts[i][j].growthText.text = scene.getGrowthText(i, j);
            }
        }
    }
}