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
        // caveman
        this.loadSpriteSequence(2, "warrior_idle", "assets/sprites/units/warrior_idle");
        this.loadSpriteSequence(4, "warrior_walk", "assets/sprites/units/warrior_walk");
        this.loadSpriteSequence(5, "warrior_attack", "assets/sprites/units/warrior_attack");
        this.loadSpriteSequence(2, "slingshotter_idle", "assets/sprites/units/slingshotter_idle");
        this.loadSpriteSequence(8, "slingshotter_walk", "assets/sprites/units/slingshotter_walk");
        this.loadSpriteSequence(4, "slingshotter_attack", "assets/sprites/units/slingshotter_attack");
        this.loadSpriteSequence(2, "clubman_idle", "assets/sprites/units/clubman_idle");
        this.loadSpriteSequence(8, "clubman_walk", "assets/sprites/units/clubman_walk");
        this.loadSpriteSequence(4, "clubman_attack", "assets/sprites/units/clubman_attack");
        // medieval
        this.loadSpriteSequence(2, "infantry_idle", "assets/sprites/units/infantry_idle");
        this.loadSpriteSequence(8, "infantry_walk", "assets/sprites/units/infantry_walk");
        this.loadSpriteSequence(7, "infantry_attack", "assets/sprites/units/infantry_attack");
        this.loadSpriteSequence(2, "archer_idle", "assets/sprites/units/archer_idle");
        this.loadSpriteSequence(8, "archer_walk", "assets/sprites/units/archer_walk");
        this.loadSpriteSequence(4, "archer_attack", "assets/sprites/units/archer_attack");
        this.loadSpriteSequence(2, "knight_idle", "assets/sprites/units/knight_idle");
        this.loadSpriteSequence(8, "knight_walk", "assets/sprites/units/knight_walk");
        this.loadSpriteSequence(5, "knight_attack", "assets/sprites/units/knight_attack");
        this.loadSpriteSequence(2, "catapult_idle", "assets/sprites/units/catapult_idle");
        this.loadSpriteSequence(2, "catapult_walk", "assets/sprites/units/catapult_walk");
        this.loadSpriteSequence(4, "catapult_attack", "assets/sprites/units/catapult_attack");

        // buildings
        this.loadSpriteSequence(4, "townhall", "assets/sprites/buildings/townhall");
        // caveman
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
        // medieval
        this.loadSpriteSequence(4, "farm", "assets/sprites/buildings/farm");
        this.load.image("farm_gray", "assets/sprites/ui/farm_gray.png");
        this.loadSpriteSequence(2, "lumberyard", "assets/sprites/buildings/lumberyard");
        this.load.image("lumberyard_gray", "assets/sprites/ui/lumberyard_gray.png");
        this.loadSpriteSequence(2, "bazaar", "assets/sprites/buildings/bazaar");
        this.load.image("bazaar_gray", "assets/sprites/ui/bazaar_gray.png");
        this.loadSpriteSequence(3, "blacksmith", "assets/sprites/buildings/blacksmith");
        this.load.image("blacksmith_gray", "assets/sprites/ui/blacksmith_gray.png");
        this.loadSpriteSequence(2, "workshop", "assets/sprites/buildings/workshop");
        this.load.image("workshop_gray", "assets/sprites/ui/workshop_gray.png");

        // ui
        this.load.image("shop_icon_border", "assets/sprites/ui/shop_icon.png");
        this.load.image("shop_icon_border_unavailable", "assets/sprites/ui/shop_icon_unavailable.png");
        this.load.image("shop_icon_border_selected", "assets/sprites/ui/shop_icon_selected.png");
        this.load.image("shop_icon_border_selected_unavailable", "assets/sprites/ui/shop_icon_selected_unavailable.png");
        this.load.image("shop_icon_border_locked", "assets/sprites/ui/shop_icon_locked.png");
        // caveman
        this.load.image("warrior_icon", "assets/sprites/ui/warrior_icon.png");
        this.load.image("warrior_icon_small", "assets/sprites/ui/warrior_icon_small.png");
        this.load.image("warrior_gray", "assets/sprites/ui/warrior_gray.png");
        this.load.image("slingshotter_icon", "assets/sprites/ui/slingshotter_icon.png");
        this.load.image("slingshotter_icon_small", "assets/sprites/ui/slingshotter_icon_small.png");
        this.load.image("slingshotter_gray", "assets/sprites/ui/slingshotter_gray.png");
        this.load.image("clubman_icon", "assets/sprites/ui/clubman_icon.png");
        this.load.image("clubman_icon_small", "assets/sprites/ui/clubman_icon_small.png");
        this.load.image("clubman_gray", "assets/sprites/ui/clubman_gray.png");
        // medieval
        this.load.image("infantry_icon", "assets/sprites/ui/infantry_icon.png");
        this.load.image("infantry_icon_small", "assets/sprites/ui/infantry_icon_small.png");
        this.load.image("infantry_gray", "assets/sprites/ui/infantry_gray.png");
        this.load.image("archer_icon", "assets/sprites/ui/archer_icon.png");
        this.load.image("archer_icon_small", "assets/sprites/ui/archer_icon_small.png");
        this.load.image("archer_gray", "assets/sprites/ui/archer_gray.png");
        this.load.image("knight_icon", "assets/sprites/ui/knight_icon.png");
        this.load.image("knight_icon_small", "assets/sprites/ui/knight_icon_small.png");
        this.load.image("knight_gray", "assets/sprites/ui/knight_gray.png");
        this.load.image("catapult_icon", "assets/sprites/ui/catapult_icon.png");
        this.load.image("catapult_icon_small", "assets/sprites/ui/catapult_icon_small.png");
        this.load.image("catapult_gray", "assets/sprites/ui/catapult_gray.png");
        // others
        this.load.image("freeze_icon", "assets/sprites/ui/freeze_icon.png");
        this.load.image("freeze_gray", "assets/sprites/ui/freeze_gray.png");
        this.load.image("clear_icon", "assets/sprites/ui/clear_icon.png");
        this.load.image("clear_gray", "assets/sprites/ui/clear_gray.png");
        this.load.image("reinforcements_icon", "assets/sprites/ui/reinforcements_icon.png");
        this.load.image("reinforcements_gray", "assets/sprites/ui/reinforcements_gray.png");
        this.load.image("remove_icon", "assets/sprites/ui/remove_icon.png");
        this.load.image("remove_gray", "assets/sprites/ui/remove_gray.png");
        this.load.image('musicOffButton', 'assets/sprites/ui/music_off_button.png');
        this.load.image('musicOffButtonDown', 'assets/sprites/ui/music_off_button_down.png');
        this.load.image('musicOnButton', 'assets/sprites/ui/music_on_button.png');
        this.load.image('musicOnButtonDown', 'assets/sprites/ui/music_on_button_down.png');
        this.load.image('soundOffButton', 'assets/sprites/ui/sound_off_button.png');
        this.load.image('soundOffButtonDown', 'assets/sprites/ui/sound_off_button_down.png');
        this.load.image('soundOnButton', 'assets/sprites/ui/sound_on_button.png');
        this.load.image('soundOnButtonDown', 'assets/sprites/ui/sound_on_button_down.png');

        // Music
        this.load.audio('backgroundMusic', 'assets/music/Fantasy-Forest-Battle.mp3');
        
        // SFX
        this.load.audio("Build", "assets/sfx/Build.mp3");
        this.load.audio("ButtonClick", "assets/sfx/ButtonClick.mp3");
        this.load.audio("Bulldoze", "assets/sfx/Bulldoze.mp3");
        this.load.audio("NewUnit", "assets/sfx/NewUnit.mp3");
        this.load.audio("Punch", "assets/sfx/Punch.mp3");
        this.load.audio("Slingshot", "assets/sfx/Slingshot.mp3");
        this.load.audio("Club", "assets/sfx/Club.mp3");
        this.load.audio("Death", "assets/sfx/Death.mp3");
        this.load.audio("BaseDamaged", "assets/sfx/BaseDamaged.mp3");
        this.load.audio("Victory", "assets/sfx/Victory.mp3");
        this.load.audio("Loss", "assets/sfx/Loss.mp3");
        this.load.audio("Freeze", "assets/sfx/Freeze.mp3");
        this.load.audio("BombLane", "assets/sfx/BombLane.mp3");
        this.load.audio("Reinforcements", "assets/sfx/Reinforcements.mp3");
        
        // Load json
        this.load.json("config", "assets/json/config.json");

        this.load.start();
        this.load.on('complete', () => {
            // Start the main menu scene
            loadConfig(this.cache.json.get("config"));
            this.scene.start("BackgroundScene")
                      .start("MainMenuScene")
                      .stop();
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