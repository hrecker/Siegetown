import { createGame } from "../game/Game";
import { createUIState } from "../game/UIState";
import { SoundEffect, playSound } from "../model/Sound";
import { allUnits, walkAnimation } from "../model/Unit";
import { Era, getSortedEras } from "../state/EraState";
import { GameStats, getStats } from "../state/GameResultState";
import { getSettings, setMusicEnabled, setSfxEnabled } from "../state/Settings";
import { createAnimation, shuffleArray, timeString } from "../util/Utils";
import { whiteColor } from "./BaseScene";
import { unitScale } from "./LaneScene";
import { OverlayButton } from "./OverlayUIScene";

export function fadeIn(scene: Phaser.Scene, targets, fadeY: boolean) {
    targets.forEach(target => {
        target.alpha = 0;
        if (fadeY) {
            scene.tweens.add({
                targets: target,
                ease: "Quad",
                alpha: 1,
                y: {
                    from: target.y + 50,
                    to: target.y
                },
                duration: 750
            });
        } else {
            scene.tweens.add({
                targets: target,
                ease: "Quad",
                alpha: 1,
                duration: 750
            });
        }
    });
}

export function fadeInGroup(scene: Phaser.Scene, group: Phaser.GameObjects.Group, fadeY: boolean) {
    fadeIn(scene, group.children.getArray(), fadeY);
}

export function setButtonInteractive(scene: Phaser.Scene, background: Phaser.GameObjects.Rectangle, pointerDownFunction: Function) {
    background.setInteractive();
    background.on('pointerout', () => {
        if (background.visible) {
            background.fillColor = defaultButtonColor;
            background.setData("isDown", false);
        }
    });
    background.on('pointerdown', () => {
        background.fillColor = buttonDownColor;
        background.setData("isDown", true);
    });
    background.on('pointerup', () => {
        if (background.getData("isDown")) {
            playSound(scene, SoundEffect.ButtonClick);
            pointerDownFunction(scene);
        }
        background.fillColor = defaultButtonColor;
        background.setData("isDown", false);
    });
}

function setToggleButtonInteractive(scene: Phaser.Scene, button: Phaser.GameObjects.Image, textureNameFunction: Function, pointerDownFunction: Function) {
    button.setInteractive();
    button.on('pointerout', () => {
        button.setTexture(textureNameFunction());
        button.setData("isDown", false);
    });
    button.on('pointerdown', () => {
        button.setTexture(textureNameFunction() + "Down"); 
        button.setData("isDown", true);
    });
    button.on('pointerup', () => {
        if (button.getData("isDown")) {
            playSound(scene, SoundEffect.ButtonClick);
            pointerDownFunction(scene);
        }
        button.setTexture(textureNameFunction());
        button.setData("isDown", false);
    });
}

const timePerUnit = 2000;
const defaultButtonColor = 0x5F556A;
const buttonDownColor = 0x45444F;
const outlinePadding = 8;
const statsTitleFormat = { font: "bold 35px Verdana", color: whiteColor };
const statsEntryFormat = { font: "bold 30px Verdana", color: whiteColor };
export class MainMenuScene extends Phaser.Scene {
    timeSinceLastUnit: number;
    units: Phaser.GameObjects.Sprite[];
    playSelected: boolean;

    mainMenuGroup: Phaser.GameObjects.Group;

    statsGroup: Phaser.GameObjects.Group;

    selectedEra: Era;
    selectedEraButton: Phaser.GameObjects.Image;

    constructor() {
        super({
            key: "MainMenuScene"
        });
    }

    getMusicButtonTexture() {
        return getSettings().musicEnabled ? "musicOnButton" : "musicOffButton";
    }

    getSfxButtonTexture() {
        return getSettings().sfxEnabled ? "soundOnButton" : "soundOffButton";
    }

    createButton(x: number, y: number, text: string, pointerDownFunction: Function): OverlayButton {
        let buttonText = this.add.text(x, y, text, { font: "bold 50px Verdana", color: whiteColor }).setOrigin(0.5, 0.5).setAlpha(0);
        let outline = this.add.rectangle(buttonText.getTopLeft().x - outlinePadding, buttonText.getTopLeft().y - outlinePadding,
            buttonText.width + (outlinePadding * 2), buttonText.height + (outlinePadding * 2)).setOrigin(0, 0).setFillStyle(0x5F556A).setStrokeStyle(1, 0xF2F0E5).setAlpha(0);
        
        setButtonInteractive(this, outline, pointerDownFunction);
        outline.setDepth(2);
        buttonText.setDepth(3);
        return {
            button: buttonText,
            outline: outline
        }
    }

    create() {
        this.game.hasFocus = true;
        let background = this.add.image(0, 0, "background_caveman").setOrigin(0, 0);
        background.setScale(this.game.renderer.width / background.displayWidth, this.game.renderer.height / background.displayHeight);
        
        // Main menu group
        let title = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 - this.game.renderer.height / 3, "SIEGETOWN", { font: "bold 90px Verdana", color: whiteColor }).setOrigin(0.5, 0.5).setAlpha(0);
        let playButton = this.createButton(this.game.renderer.width / 2, title.getBottomCenter().y + 30, "PLAY", this.startGame);
        // Era selection
        let cavemanRadioButton = this.add.image(this.game.renderer.width / 2 - 70, playButton.outline.getBottomCenter().y + 15, "radioButtonSelected").setName(Era.Caveman);
        let medievalRadioButton = this.add.image(this.game.renderer.width / 2 + 70, playButton.outline.getBottomCenter().y + 15, "radioButtonUnselected").setName(Era.Medieval);
        this.selectedEra = Era.Caveman;
        this.selectedEraButton = cavemanRadioButton;
        this.configureDifficultyRadioButton(cavemanRadioButton);
        this.configureDifficultyRadioButton(medievalRadioButton);
        let cavemanLabel = this.add.text(cavemanRadioButton.x, cavemanRadioButton.getBottomCenter().y + 10, "Caveman",
            { font: "bold 20px Verdana", color: whiteColor }).setOrigin(0.5);
        let medievalLabel = this.add.text(medievalRadioButton.x, medievalRadioButton.getBottomCenter().y + 10, "Medieval",
            { font: "bold 20px Verdana", color: whiteColor }).setOrigin(0.5);
        let statsButton = this.createButton(this.game.renderer.width / 2, cavemanLabel.getBottomCenter().y + 47, "STATS", this.viewStats);
        this.playSelected = false;

        this.mainMenuGroup = this.add.group();
        this.mainMenuGroup.add(title);
        this.mainMenuGroup.add(playButton.button);
        this.mainMenuGroup.add(playButton.outline);
        this.mainMenuGroup.add(cavemanLabel);
        this.mainMenuGroup.add(medievalLabel);
        this.mainMenuGroup.add(cavemanRadioButton);
        this.mainMenuGroup.add(medievalRadioButton);
        this.mainMenuGroup.add(statsButton.button);
        this.mainMenuGroup.add(statsButton.outline);

        // Stats page group
        let eraTitle = this.add.text(this.game.renderer.width / 2 - 250, 80, "ERA", statsTitleFormat).setOrigin(0.5, 0.5).setAlpha(0);
        let winsTitle = this.add.text(this.game.renderer.width / 2 - 85, 80, "WINS", statsTitleFormat).setOrigin(0.5, 0.5).setAlpha(0);
        let lossesTitle = this.add.text(this.game.renderer.width / 2 + 85, 80, "LOSSES", statsTitleFormat).setOrigin(0.5, 0.5).setAlpha(0);
        let bestTitle = this.add.text(this.game.renderer.width / 2 + 250, 80, "BEST", statsTitleFormat).setOrigin(0.5, 0.5).setAlpha(0);
        
        this.statsGroup = this.add.group();
        this.statsGroup.add(eraTitle);
        this.statsGroup.add(winsTitle);
        this.statsGroup.add(lossesTitle);
        this.statsGroup.add(bestTitle);

        // Stats values
        let stats = getStats();
        let y = 125;
        for (let era of getSortedEras()) {
            let eraText = this.add.text(eraTitle.x, y, era, statsEntryFormat).setOrigin(0.5, 0.5).setAlpha(0);
            let eraStats: GameStats = {
                wins: 0,
                losses: 0,
                recordTime: -1
            }
            if (stats && stats.stats && era in stats.stats) {
                eraStats = stats.stats[era];
            }
            let winsText = this.add.text(winsTitle.x, y, eraStats.wins.toString(), statsEntryFormat).setOrigin(0.5, 0.5).setAlpha(0);
            let lossesText = this.add.text(lossesTitle.x, y, eraStats.losses.toString(), statsEntryFormat).setOrigin(0.5, 0.5).setAlpha(0);
            let time = "none"
            if (eraStats.recordTime > 0) {
                time = timeString(eraStats.recordTime);
            }
            let timeText = this.add.text(bestTitle.x, y, time, statsEntryFormat).setOrigin(0.5, 0.5).setAlpha(0);
            this.statsGroup.add(eraText);
            this.statsGroup.add(winsText);
            this.statsGroup.add(lossesText);
            this.statsGroup.add(timeText);
            y += 40;
        }

        let backButton = this.createButton(this.game.renderer.width / 2, y + 40, "BACK", this.backToMainMenu);
        this.statsGroup.add(backButton.button);
        this.statsGroup.add(backButton.outline);
        
        // Audio control buttons
        let musicControlButton = this.add.image(5, 5, this.getMusicButtonTexture()).setOrigin(0, 0);
        setToggleButtonInteractive(this, musicControlButton, this.getMusicButtonTexture, () => {
            setMusicEnabled(!getSettings().musicEnabled);
        });
        let sfxControlButton = this.add.image(5, musicControlButton.getBottomCenter().y + 5, this.getSfxButtonTexture()).setOrigin(0, 0);
        setToggleButtonInteractive(this, sfxControlButton, this.getSfxButtonTexture, () => {
            setSfxEnabled(!getSettings().sfxEnabled);
        }); 

        // Credits text
        this.add.text(this.game.renderer.width - 5, this.game.renderer.height - 5, "Music by Eric Matyas:\nsoundimage.org", { font: "16px Verdana", color: whiteColor, align: "center" }).setOrigin(1, 1);

        // Fade in main menu
        this.statsGroup.setVisible(false);
        fadeInGroup(this, this.mainMenuGroup, true);

        // Add some units walking in the background
        this.units = [];
        this.timeSinceLastUnit = timePerUnit;
        createAnimation(this, "warrior_walk", 4);
        createAnimation(this, "slingshotter_walk", 8);
        createAnimation(this, "clubman_walk", 8);
        createAnimation(this, "infantry_walk", 8);
        createAnimation(this, "archer_walk", 8);
        createAnimation(this, "knight_walk", 8);
        createAnimation(this, "catapult_walk", 2);
    }

    configureDifficultyRadioButton(button: Phaser.GameObjects.Image) {
        button.setInteractive();
        button.on('pointerdown', () => {
            if (button.name != this.selectedEra) {
                this.selectedEra = Era[button.name];
                button.setTexture("radioButtonSelected");
                if (this.selectedEraButton) {
                    this.selectedEraButton.setTexture("radioButtonUnselected");
                }
                this.selectedEraButton = button;
                playSound(this, SoundEffect.ButtonClick);
            }
        });
    }

    startGame(scene: MainMenuScene) {
        let activeGame = createGame(scene.selectedEra);
        let uiState = createUIState();
        scene.scene.start("BaseScene", { activeGame: activeGame, uiState: uiState })
                  .start("LaneScene", { activeGame: activeGame, uiState: uiState })
                  .start("ResourceUIScene", { activeGame: activeGame, uiState: uiState })
                  .start("ShopUIScene", { activeGame: activeGame, uiState: uiState })
                  .start("OverlayUIScene", { activeGame: activeGame, uiState: uiState })
                  .stop();
    }

    viewStats(scene: MainMenuScene) {
        scene.statsGroup.setVisible(true);
        scene.statsGroup.setAlpha(0);
        scene.mainMenuGroup.setVisible(false);
        fadeInGroup(scene, scene.statsGroup, true);
    }

    backToMainMenu(scene: MainMenuScene) {
        scene.mainMenuGroup.setVisible(true);
        scene.mainMenuGroup.setAlpha(0);
        scene.statsGroup.setVisible(false);
        fadeInGroup(scene, scene.mainMenuGroup, true);
    }

    createRandomUnit() {
        let x = -100;
        let flipX = false;
        if (Math.random() > 0.5) {
            x = this.game.renderer.width + 100;
            flipX = true;
        }
        let possibleUnits = [];
        allUnits().forEach(unit => {
            possibleUnits.push(unit);
        })
        shuffleArray(possibleUnits);

        let type = possibleUnits[0];
        this.units.push(this.add.sprite(x, this.game.renderer.height - 50, walkAnimation(type)).setScale(unitScale(this.game)).play(walkAnimation(type)).setFlipX(flipX));
    }

    update(time, delta) {
        // Move existing units
        let indicesToRemove = [];
        for (let i = 0; i < this.units.length; i++) {
            if (this.units[i].flipX) {
                this.units[i].x -= 1;
                if (this.units[i].x < -100) {
                    this.units[i].destroy();
                    indicesToRemove.push(i);
                }
            } else {
                this.units[i].x += 1;
                if (this.units[i].x > this.game.renderer.width + 100) {
                    this.units[i].destroy();
                    indicesToRemove.push(i);
                }
            }
        }
        // Delete the destroyed units from the units array, going back to front
        for (let i = indicesToRemove.length - 1; i >= 0; i--) {
            this.units.splice(indicesToRemove[i], 1);
        }

        this.timeSinceLastUnit += delta;
        if (this.timeSinceLastUnit >= timePerUnit) {
            this.createRandomUnit();
            // Randomize the distribution a bit
            this.timeSinceLastUnit = Math.random() * -timePerUnit;
        }
    }
}