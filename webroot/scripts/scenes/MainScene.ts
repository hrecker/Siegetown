import { ActiveGame, updateGame } from "../game/Game";
import { UIState } from "../game/UIState";
import { Building } from "../model/Base";
import { config } from "../model/Config";

const boardWidth = 400;

export class MainScene extends Phaser.Scene {
    sceneCreated: boolean;
    activeGame: ActiveGame;
    uiState: UIState;

    gridTexts: Phaser.GameObjects.Text[][];

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
        let topLeftX = (this.game.renderer.width / 2) - (boardWidth / 2);
        let topLeftY = (this.game.renderer.height / 2) - (boardWidth / 2);

        let graphics = this.add.graphics({ lineStyle: { width: 4 } });

        for (let i = 0; i <= config()["baseWidth"]; i++) {
            let diff = (boardWidth * i / config()["baseWidth"]);
            graphics.strokeLineShape(new Phaser.Geom.Line(topLeftX, topLeftY + diff, topLeftX + boardWidth, topLeftY + diff));
            graphics.strokeLineShape(new Phaser.Geom.Line(topLeftX + diff, topLeftY, topLeftX + diff, topLeftY + boardWidth));
        }

        // Draw the buildings
        this.gridTexts = [];
        for (let i = 0; i < config()["baseWidth"]; i++) {
            this.gridTexts[i] = [];
            for (let j = 0; j < config()["baseWidth"]; j++) {
                let x = topLeftX + (boardWidth * i / config()["baseWidth"]) + (boardWidth / (config()["baseWidth"] * 2));
                let y = topLeftY + (boardWidth * j / config()["baseWidth"]) + (boardWidth / (config()["baseWidth"] * 2));
                this.gridTexts[i][j] = this.add.text(x, y, this.getBuildingText(this.activeGame.base.grid[i][j])).setOrigin(0.5, 0.5).setFontSize(128);
            }
        }

        // Handle mouse clicks
        this.input.on("pointerup", () => {
            if (this.uiState.selectedBuilding == Building.Empty) {
                return;
            }

            let gridX = Math.floor((this.input.activePointer.worldX - topLeftX) / (boardWidth / config()["baseWidth"]));
            let gridY = Math.floor((this.input.activePointer.worldY - topLeftY) / (boardWidth / config()["baseWidth"]));

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
        });

        this.resize(true);
        this.scale.on("resize", this.resize, this);
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
        updateGame(this.activeGame, time);
    }
}