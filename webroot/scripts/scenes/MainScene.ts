import { ActiveGame, createGame } from "../game/Game";
import { Building } from "../model/Base";
import { config } from "../model/Config";

const boardWidth = 400;

export class MainScene extends Phaser.Scene {
    sceneCreated: boolean;
    activeGame: ActiveGame;

    constructor() {
        super({
            key: "MainScene"
        });
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

        this.activeGame = createGame();

        // Draw the board
        let topLeftX = (this.game.renderer.width / 2) - (boardWidth / 2);
        let topLeftY = (this.game.renderer.height / 2) - (boardWidth / 2);

        let graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xaa00aa } });

        for (let i = 0; i <= config()["baseWidth"]; i++) {
            let diff = (boardWidth * i / config()["baseWidth"]);
            graphics.strokeLineShape(new Phaser.Geom.Line(topLeftX, topLeftY + diff, topLeftX + boardWidth, topLeftY + diff));
            graphics.strokeLineShape(new Phaser.Geom.Line(topLeftX + diff, topLeftY, topLeftX + diff, topLeftY + boardWidth));
        }

        // Draw the buildings
        for (let i = 0; i < config()["baseWidth"]; i++) {
            for (let j = 0; j < config()["baseWidth"]; j++) {
                let x = topLeftX + (boardWidth * i / config()["baseWidth"]) + (boardWidth / (config()["baseWidth"] * 2));
                let y = topLeftY + (boardWidth * j / config()["baseWidth"]) + (boardWidth / (config()["baseWidth"] * 2));
                let text;
                switch(this.activeGame.base.grid[i][j]) {
                    case Building.Field:
                        text = "F";
                        break;
                    case Building.Lumberyard:
                        text = "L";
                        break;
                    case Building.Townhall:
                        text = "T";
                        break;
                }
                if (text) {
                    this.add.text(x, y, text).setOrigin(0.5, 0.5).setFontSize(128);
                }
            }
        }

        this.resize(true);
        this.scale.on("resize", this.resize, this);
    }

    reset() {
        this.cameras.main.setBackgroundColor(0x00303B);
    }


    update(time, delta) {
        //TODO
    }
}