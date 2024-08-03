import { createGame } from "../game/Game";
import { createUIState } from "../game/UIState";
import { SoundEffect, playSound } from "../model/Sound";
import { allUnits, walkAnimation } from "../model/Unit";
import { getSettings, setMusicEnabled, setSfxEnabled } from "../state/Settings";
import { createAnimation, shuffleArray } from "../util/Utils";
import { whiteColor } from "./BaseScene";
import { unitScale } from "./LaneScene";

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
export class MainMenuScene extends Phaser.Scene {
    timeSinceLastUnit: number;
    units: Phaser.GameObjects.Sprite[];
    playSelected: boolean;

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

    create() {
        let background = this.add.image(0, 0, "background").setOrigin(0, 0);
        background.setScale(this.game.renderer.width / background.displayWidth, this.game.renderer.height / background.displayHeight);
        let title = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 - 150, "SIEGETOWN", { font: "bold 100px Verdana", color: whiteColor }).setOrigin(0.5, 0.5).setAlpha(0);
        let buttonText = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 + 50, "PLAY", { font: "bold 60px Verdana", color: whiteColor }).setFontSize(100).setOrigin(0.5, 0.5).setAlpha(0);
        let outlinePadding = 8;
        let buttonOutline = this.add.rectangle(buttonText.getTopLeft().x - outlinePadding, buttonText.getTopLeft().y - outlinePadding,
            buttonText.width + (outlinePadding * 2), buttonText.height + (outlinePadding * 2)).setOrigin(0, 0).setFillStyle(defaultButtonColor).setStrokeStyle(1, 0xF2F0E5).setAlpha(0);
        
        this.playSelected = false;
        setButtonInteractive(this, buttonOutline, this.startGame)
        buttonOutline.setDepth(2);
        buttonText.setDepth(3);
        
        // Audio control buttons
        let musicControlButton = this.add.image(5, 5, this.getMusicButtonTexture()).setOrigin(0, 0);
        setToggleButtonInteractive(this, musicControlButton, this.getMusicButtonTexture, () => {
            setMusicEnabled(!getSettings().musicEnabled);
        });
        let sfxControlButton = this.add.image(5, musicControlButton.getBottomCenter().y + 5, this.getSfxButtonTexture()).setOrigin(0, 0);
        setToggleButtonInteractive(this, sfxControlButton, this.getSfxButtonTexture, () => {
            setSfxEnabled(!getSettings().sfxEnabled);
        });

        // Fade in main menu
        fadeIn(this, [title, buttonText, buttonOutline, musicControlButton, sfxControlButton], true);

        // Add some units walking in the background
        this.units = [];
        this.timeSinceLastUnit = timePerUnit;
        createAnimation(this, "warrior_walk", 4);
        createAnimation(this, "slingshotter_walk", 8);
        createAnimation(this, "clubman_walk", 8);
    }

    startGame(scene: Phaser.Scene) {
        let activeGame = createGame();
        let uiState = createUIState();
        scene.scene.start("BaseScene", { activeGame: activeGame, uiState: uiState })
                  .start("LaneScene", { activeGame: activeGame, uiState: uiState })
                  .start("ResourceUIScene", { activeGame: activeGame, uiState: uiState })
                  .start("ShopUIScene", { activeGame: activeGame, uiState: uiState })
                  .start("OverlayUIScene", { activeGame: activeGame, uiState: uiState })
                  .stop();
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