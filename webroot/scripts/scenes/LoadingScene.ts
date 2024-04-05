import { createGame } from "../game/Game";
import { createUIState } from "../game/UIState";
import { loadConfig } from "../model/Config";


/** Load json and assets */
export class LoadingScene extends Phaser.Scene {
    loadingText: Phaser.GameObjects.Text;
    loadingBox: Phaser.GameObjects.Rectangle;
    loadingFill: Phaser.GameObjects.Rectangle;

    constructor() {
        super({
            key: "LoadingScene"
        });
    }

    /** Adjust any UI elements that need to change position based on the canvas size */
    resize(force?: boolean) {
        if (! this.scene.isActive() && force !== true) {
            return;
        }
        this.loadingText.setPosition(this.game.renderer.width / 2, this.game.renderer.height / 2 - 50);
        
        this.loadingFill.setPosition(this.loadingText.x, this.loadingText.y + 100);
        this.loadingFill.setSize(this.loadingText.width, this.loadingText.height / 2);
        this.loadingBox.setPosition(this.loadingText.x, this.loadingText.y + 100);
        this.loadingBox.setSize(this.loadingText.width, this.loadingText.height / 2);
    }

    loadSpriteSequence(numSprites: number, baseKey: string, basePath: string) {
        for (let i = 1; i <= numSprites; i++) {
            this.load.image(baseKey + i, basePath + i + ".png");
        }
    }

    loadResources() {
        // Ensure the canvas is the right size
        this.scale.refresh();
        this.resize(true);
        this.scale.on("resize", this.resize, this);

        // sprites
        this.loadSpriteSequence(4, "warrior_walk", "assets/sprites/units/warrior_walk");
        this.loadSpriteSequence(5, "warrior_attack", "assets/sprites/units/warrior_attack");
        this.loadSpriteSequence(8, "slingshotter_walk", "assets/sprites/units/slingshotter_walk");
        
        // Load json
        this.load.json("config", "assets/json/config.json");

        this.load.start();
        this.load.on('complete', () => {
            // Start the main menu scene
            loadConfig(this.cache.json.get("config"));
            let activeGame = createGame();
            let uiState = createUIState();
            this.scene.start("BaseScene", { activeGame: activeGame, uiState: uiState })
                      .start("LaneScene", { activeGame: activeGame, uiState: uiState })
                      .start("ResourceUIScene", { activeGame: activeGame, uiState: uiState })
                      .start("ShopUIScene", { activeGame: activeGame, uiState: uiState })
                      .start("OverlayUIScene", { activeGame: activeGame, uiState: uiState })
                      .stop();
        })
    }

    create() {
        // Loading message
        // Have to hard-code this because the config isn't loaded yet
        this.cameras.main.setBackgroundColor("#00303B");
        this.loadingText = this.add.text(0, 0, "Loading...",
            { font: "bold 64px Verdana",
            stroke: "black",
            strokeThickness: 3,
            color: "#F1F2DA" }).setOrigin(0.5, 0.5);
        this.loadingFill = this.add.rectangle(0, 0, 0, 0, 0xF1F2DA, 1);
        this.loadingBox = this.add.rectangle(0, 0, 0, 0).setStrokeStyle(3, 0x000000, 1);
        this.loadResources();
    }

    update() {
        this.loadingFill.width = this.loadingBox.width * this.load.progress;
    }
}