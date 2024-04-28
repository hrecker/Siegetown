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
        // units
        this.loadSpriteSequence(2, "warrior_idle", "assets/sprites/units/warrior_idle");
        this.loadSpriteSequence(4, "warrior_walk", "assets/sprites/units/warrior_walk");
        this.loadSpriteSequence(5, "warrior_attack", "assets/sprites/units/warrior_attack");
        this.loadSpriteSequence(2, "slingshotter_idle", "assets/sprites/units/slingshotter_idle");
        this.loadSpriteSequence(8, "slingshotter_walk", "assets/sprites/units/slingshotter_walk");
        this.loadSpriteSequence(4, "slingshotter_attack", "assets/sprites/units/slingshotter_attack");
        this.loadSpriteSequence(2, "clubman_idle", "assets/sprites/units/clubman_idle");
        this.loadSpriteSequence(8, "clubman_walk", "assets/sprites/units/clubman_walk");
        this.loadSpriteSequence(4, "clubman_attack", "assets/sprites/units/clubman_attack");

        // buildings
        this.loadSpriteSequence(2, "townhall", "assets/sprites/buildings/townhall");
        this.loadSpriteSequence(2, "field", "assets/sprites/buildings/field");
        this.load.image("field_gray", "assets/sprites/ui/field_gray.png");
        this.loadSpriteSequence(2, "forest", "assets/sprites/buildings/forest");
        this.load.image("forest_gray", "assets/sprites/ui/forest_gray.png");
        this.loadSpriteSequence(2, "market", "assets/sprites/buildings/market");
        this.load.image("market_gray", "assets/sprites/ui/market_gray.png");
        this.loadSpriteSequence(2, "barracks", "assets/sprites/buildings/barracks");
        this.load.image("barracks_gray", "assets/sprites/ui/barracks_gray.png");
        this.loadSpriteSequence(2, "trainingground", "assets/sprites/buildings/trainingground");
        this.load.image("trainingground_gray", "assets/sprites/ui/trainingground_gray.png");

        // ui
        this.load.image("shop_icon_border", "assets/sprites/ui/shop_icon.png");
        this.load.image("shop_icon_border_unavailable", "assets/sprites/ui/shop_icon_unavailable.png");
        this.load.image("shop_icon_border_selected", "assets/sprites/ui/shop_icon_selected.png");
        this.load.image("shop_icon_border_selected_unavailable", "assets/sprites/ui/shop_icon_selected_unavailable.png");
        this.load.image("shop_icon_border_locked", "assets/sprites/ui/shop_icon_locked.png");
        this.load.image("warrior_icon", "assets/sprites/ui/warrior_icon.png");
        this.load.image("warrior_gray", "assets/sprites/ui/warrior_gray.png");
        this.load.image("slingshotter_icon", "assets/sprites/ui/slingshotter_icon.png");
        this.load.image("slingshotter_gray", "assets/sprites/ui/slingshotter_gray.png");
        this.load.image("clubman_icon", "assets/sprites/ui/clubman_icon.png");
        this.load.image("clubman_gray", "assets/sprites/ui/clubman_gray.png");
        
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