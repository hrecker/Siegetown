import { loadConfig } from "../model/Config";
import { whiteColor } from "./BaseScene";


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
        this.load.image("background", "assets/sprites/background_blur.png");

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
        this.loadSpriteSequence(4, "townhall", "assets/sprites/buildings/townhall");
        this.loadSpriteSequence(3, "field", "assets/sprites/buildings/field");
        this.load.image("field_gray", "assets/sprites/ui/field_gray.png");
        this.loadSpriteSequence(6, "forest", "assets/sprites/buildings/forest");
        this.load.image("forest_gray", "assets/sprites/ui/forest_gray.png");
        this.loadSpriteSequence(3, "market", "assets/sprites/buildings/market");
        this.load.image("market_gray", "assets/sprites/ui/market_gray.png");
        this.loadSpriteSequence(4, "barracks", "assets/sprites/buildings/barracks");
        this.load.image("barracks_gray", "assets/sprites/ui/barracks_gray.png");
        this.loadSpriteSequence(4, "trainingground", "assets/sprites/buildings/trainingground");
        this.load.image("trainingground_gray", "assets/sprites/ui/trainingground_gray.png");

        // ui
        this.load.image("shop_icon_border", "assets/sprites/ui/shop_icon.png");
        this.load.image("shop_icon_border_unavailable", "assets/sprites/ui/shop_icon_unavailable.png");
        this.load.image("shop_icon_border_selected", "assets/sprites/ui/shop_icon_selected.png");
        this.load.image("shop_icon_border_selected_unavailable", "assets/sprites/ui/shop_icon_selected_unavailable.png");
        this.load.image("shop_icon_border_locked", "assets/sprites/ui/shop_icon_locked.png");
        this.load.image("warrior_icon", "assets/sprites/ui/warrior_icon.png");
        this.load.image("warrior_icon_small", "assets/sprites/ui/warrior_icon_small.png");
        this.load.image("warrior_gray", "assets/sprites/ui/warrior_gray.png");
        this.load.image("slingshotter_icon", "assets/sprites/ui/slingshotter_icon.png");
        this.load.image("slingshotter_icon_small", "assets/sprites/ui/slingshotter_icon_small.png");
        this.load.image("slingshotter_gray", "assets/sprites/ui/slingshotter_gray.png");
        this.load.image("clubman_icon", "assets/sprites/ui/clubman_icon.png");
        this.load.image("clubman_icon_small", "assets/sprites/ui/clubman_icon_small.png");
        this.load.image("clubman_gray", "assets/sprites/ui/clubman_gray.png");
        this.load.image("freeze_icon", "assets/sprites/ui/freeze_icon.png");
        this.load.image("freeze_gray", "assets/sprites/ui/freeze_gray.png");
        this.load.image("clear_icon", "assets/sprites/ui/clear_icon.png");
        this.load.image("clear_gray", "assets/sprites/ui/clear_gray.png");
        this.load.image("reinforcements_icon", "assets/sprites/ui/reinforcements_icon.png");
        this.load.image("reinforcements_gray", "assets/sprites/ui/reinforcements_gray.png");
        this.load.image("remove_icon", "assets/sprites/ui/remove_icon.png");
        this.load.image("remove_gray", "assets/sprites/ui/remove_gray.png");
        
        // SFX
        this.load.audio("Build", "assets/sfx/Build.mp3");
        this.load.audio("ButtonClick", "assets/sfx/ButtonClick.mp3");
        this.load.audio("Bulldoze", "assets/sfx/Bulldoze.mp3");
        this.load.audio("NewUnit", "assets/sfx/NewUnit.mp3");
        this.load.audio("Punch", "assets/sfx/Punch.mp3");
        this.load.audio("Slingshot", "assets/sfx/Slingshot.mp3");
        this.load.audio("Club", "assets/sfx/Club.mp3");
        this.load.audio("Death", "assets/sfx/Death.mp3");
        //this.load.audio("PlayerBaseDamaged", "assets/sfx/PlayerBaseDamaged.mp3");
        //this.load.audio("EnemyBaseDamaged", "assets/sfx/EnemyBaseDamaged.mp3");
        this.load.audio("Victory", "assets/sfx/Victory.mp3");
        //this.load.audio("ShopUnlock", "assets/sfx/ShopUnlock.mp3");
        //this.load.audio("Freeze", "assets/sfx/Freeze.mp3");
        //this.load.audio("BombLane", "assets/sfx/BombLane.mp3");
        //this.load.audio("Reinforcements", "assets/sfx/Reinforcements.mp3");
        
        // Load json
        this.load.json("config", "assets/json/config.json");

        this.load.start();
        this.load.on('complete', () => {
            // Start the main menu scene
            loadConfig(this.cache.json.get("config"));
            this.scene.start("MainMenuScene").stop();
        })
    }

    create() {
        // Loading message
        // Have to hard-code this because the config isn't loaded yet
        this.cameras.main.setBackgroundColor("#3A3858");
        this.loadingText = this.add.text(0, 0, "Loading...",
            { font: "bold 64px Verdana",
            stroke: "#212123",
            strokeThickness: 3,
            color: whiteColor }).setOrigin(0.5, 0.5);
        this.loadingFill = this.add.rectangle(0, 0, 0, 0, 0xF2F0E5, 1);
        this.loadingBox = this.add.rectangle(0, 0, 0, 0).setStrokeStyle(3, 0x212123, 1);
        this.loadResources();
    }

    update() {
        this.loadingFill.width = this.loadingBox.width * this.load.progress;
    }
}