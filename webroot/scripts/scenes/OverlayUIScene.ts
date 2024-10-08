import { addBaseDamagedListener, addEnemyBaseDamagedListener, clearListeners, gameRestartedEvent } from "../events/EventMessenger";
import { ActiveGame, gameEnded } from "../game/Game";
import { SoundEffect, playSound } from "../model/Sound";
import { getStats } from "../state/GameResultState";
import { timeString } from "../util/Utils";
import { whiteColor } from "./BaseScene";
import { fadeIn, setButtonInteractive } from "./MainMenuScene";

export type OverlayButton = {
    button: Phaser.GameObjects.Text;
    outline: Phaser.GameObjects.Rectangle;
}

enum Overlay {
    Pause,
    GameEnd
}

const outlinePadding = 4;
const textBackgroundPadding = 15;
const tightTextBackgroundPadding = 8;
const textFormat = { font: "bold 40px Verdana", color: whiteColor }

/** UI displayed over MainScene */
export class OverlayUIScene extends Phaser.Scene {
    activeGame: ActiveGame;

    shadowBackground: Phaser.GameObjects.Rectangle;

    // Current era UI
    currentEraTextBackground: Phaser.GameObjects.Rectangle;
    currentEraText: Phaser.GameObjects.Text;

    // Game result UI
    gameResultBackground: Phaser.GameObjects.Rectangle;
    gameResultText: Phaser.GameObjects.Text;
    gameResultTimeText: Phaser.GameObjects.Text;
    restartButton: OverlayButton;

    // Pause UI
    pauseButton: Phaser.GameObjects.Text;
    pauseBackground: Phaser.GameObjects.Rectangle;
    pauseText: Phaser.GameObjects.Text;
    resumeButton: OverlayButton;
    mainMenuButton: OverlayButton;

    pauseKeys: Phaser.Input.Keyboard.Key[];
    pauseKeyHeld: boolean;

    constructor() {
        super({
            key: "OverlayUIScene"
        });
    }

    init(data) {
        this.activeGame = data.activeGame;
    }

    hideOverlay() {
        this.currentEraText.visible = false;
        this.currentEraTextBackground.visible = false;
        this.shadowBackground.visible = false;
        this.gameResultBackground.visible = false;
        this.pauseBackground.visible = false;
        this.gameResultText.visible = false;
        this.gameResultTimeText.visible = false;
        this.pauseText.visible = false;
        this.setButtonVisible(this.restartButton, false);
        this.setButtonVisible(this.resumeButton, false);
        this.setButtonVisible(this.mainMenuButton, false);
    }

    setOverlayVisible(overlay: Overlay) {
        this.shadowBackground.visible = true;
        switch (overlay) {
            case Overlay.Pause:
                this.currentEraText.visible = true;
                this.currentEraTextBackground.visible = true;
                this.gameResultText.visible = false;
                this.gameResultTimeText.visible = false;
                this.gameResultBackground.visible = false;
                this.pauseText.visible = true;
                this.pauseBackground.visible = true;
                this.setButtonVisible(this.restartButton, false);
                this.setButtonVisible(this.resumeButton, true);
                this.setButtonVisible(this.mainMenuButton, true);
                this.pauseBackground.setSize(this.pauseBackground.width,
                    this.mainMenuButton.outline.getBottomCenter().y - this.gameResultText.getTopCenter().y + (2 * textBackgroundPadding));
                fadeIn(this, [this.currentEraText, this.currentEraTextBackground,
                    this.pauseText, this.pauseBackground,
                    this.resumeButton.button, this.resumeButton.outline,
                    this.mainMenuButton.button, this.mainMenuButton.outline], false)
                break;
            case Overlay.GameEnd:
                this.currentEraText.visible = true;
                this.currentEraTextBackground.visible = true;
                this.gameResultText.visible = true;
                this.gameResultTimeText.visible = true;
                this.gameResultBackground.visible = true;
                this.pauseText.visible = false;
                this.pauseBackground.visible = false;
                this.setButtonVisible(this.restartButton, true);
                this.setButtonVisible(this.resumeButton, false);
                this.setButtonVisible(this.mainMenuButton, true);
                this.gameResultBackground.setSize(this.gameResultBackground.width,
                    this.mainMenuButton.outline.getBottomCenter().y - this.gameResultText.getTopCenter().y + (2 * textBackgroundPadding));
                fadeIn(this, [this.currentEraText, this.currentEraTextBackground,
                    this.gameResultText, this.gameResultTimeText, this.gameResultBackground,
                    this.restartButton.button, this.restartButton.outline,
                    this.mainMenuButton.button, this.mainMenuButton.outline], false)
                break;
        }
    }

    createButton(x: number, y: number, text: string, pointerDownFunction: Function): OverlayButton {
        let buttonText = this.add.text(x, y, text, textFormat).setFontSize(48).setOrigin(0.5, 0.5);
        let outline = this.add.rectangle(buttonText.getTopLeft().x - outlinePadding, buttonText.getTopLeft().y - outlinePadding,
            buttonText.width + (outlinePadding * 2), buttonText.height + (outlinePadding * 2)).setOrigin(0, 0).setFillStyle(0x5F556A).setStrokeStyle(1, 0xF2F0E5);
        
        setButtonInteractive(this, outline, pointerDownFunction);
        outline.setDepth(2);
        buttonText.setDepth(3);
        return {
            button: buttonText,
            outline: outline
        }
    }

    setButtonVisible(button: OverlayButton, visible: boolean) {
        button.button.visible = visible;
        button.outline.visible = visible;
    }

    setButtonY(button: OverlayButton, y: number) {
        button.button.y = y;
        button.outline.y = button.button.getTopLeft().y - outlinePadding;
    }

    pauseButtonDown(): boolean {
        for (let button of this.pauseKeys) {
            if (button.isDown) {
                return true;
            }
        }
        return false;
    }

    create() {
        // Corner pause button
        this.pauseButton = this.add.text(this.game.renderer.width + 5, 8, "⏸️").setOrigin(1, 0).setPadding(8).setFontSize(48);
        this.pauseButton.setInteractive();
        this.pauseButton.on('pointerdown', () => {
            if (!gameEnded(this.activeGame) && !this.activeGame.isPaused) {
                this.activeGame.isPaused = true;
                this.setButtonY(this.mainMenuButton, this.resumeButton.outline.getBottomCenter().y + 40);
                this.setOverlayVisible(Overlay.Pause);
                playSound(this, SoundEffect.ButtonClick);
            }
        });

        // Background
        this.shadowBackground = this.add.rectangle(0, 0, this.game.renderer.width, this.game.renderer.height, 0, 0.8).setOrigin(0, 0);

        // Current era UI
        this.currentEraText = this.add.text(this.game.renderer.width / 2, this.game.renderer.height - tightTextBackgroundPadding - 1, "Era: " + this.activeGame.era, textFormat).setFontSize(24).setOrigin(0.5, 1).setDepth(2);
        this.currentEraTextBackground = this.add.rectangle(this.currentEraText.getTopLeft().x - tightTextBackgroundPadding, this.currentEraText.getTopLeft().y - tightTextBackgroundPadding,
            this.currentEraText.displayWidth + (tightTextBackgroundPadding * 2), this.currentEraText.displayHeight + (tightTextBackgroundPadding * 2)).
            setFillStyle(0x43436A).setOrigin(0, 0).setStrokeStyle(1, 0xF2F0E5).setDepth(1);

        // Game result ui
        this.gameResultText = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 - 125, "Victory!",
            textFormat).setFontSize(64).setOrigin(0.5, 0.5).setDepth(2);
        this.gameResultTimeText = this.add.text(this.game.renderer.width / 2, this.gameResultText.getBottomCenter().y + 5, "Time: -1s\nBest: -1s",
            textFormat).setFontSize(32).setOrigin(0.5, 0).setDepth(2);
        this.restartButton = this.createButton(this.game.renderer.width / 2, this.gameResultTimeText.getBottomCenter().y + 35, "Restart", (scene) => {
            gameRestartedEvent();
            scene.hideOverlay();
        });
        this.mainMenuButton = this.createButton(this.game.renderer.width / 2, this.restartButton.outline.getBottomCenter().y + 40, "Main Menu", (scene) => {
            clearListeners();
            scene.scene.stop();
            scene.scene.stop("BaseScene");
            scene.scene.stop("LaneScene");
            scene.scene.stop("ResourceUIScene");
            scene.scene.stop("ShopUIScene");
            scene.scene.start("MainMenuScene");
        });
        let gameResultHeight = this.mainMenuButton.outline.getBottomCenter().y - this.gameResultText.getTopCenter().y;
        this.gameResultBackground = this.add.rectangle(this.mainMenuButton.outline.getTopLeft().x - textBackgroundPadding, this.gameResultText.getTopLeft().y - textBackgroundPadding,
            this.mainMenuButton.outline.displayWidth + (2 * textBackgroundPadding), gameResultHeight + (2 * textBackgroundPadding)).
            setFillStyle(0x43436A).setOrigin(0, 0).setStrokeStyle(1, 0xF2F0E5).setDepth(1);

        // Pause ui
        this.pauseText = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 - 125, "Paused",
            textFormat).setFontSize(64).setOrigin(0.5, 0.5).setDepth(2);
        this.resumeButton = this.createButton(this.game.renderer.width / 2, this.pauseText.getBottomCenter().y + 35, "Resume", (scene) => {
            scene.activeGame.isPaused = false;
            scene.hideOverlay();
        });
        let pauseHeight = this.mainMenuButton.outline.getBottomCenter().y - this.pauseText.getTopCenter().y;
        this.pauseBackground = this.add.rectangle(this.mainMenuButton.outline.getTopLeft().x - textBackgroundPadding, this.pauseText.getTopLeft().y,
            this.mainMenuButton.outline.displayWidth + (2 * textBackgroundPadding), pauseHeight + (2 * textBackgroundPadding)).
            setFillStyle(0x43436A).setOrigin(0, 0).setStrokeStyle(1, 0xF2F0E5).setDepth(1);

        this.hideOverlay();

        // Pause button
        this.pauseKeys = [];
        this.pauseKeys.push(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P));
        this.pauseKeys.push(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC));

        addBaseDamagedListener(this.baseDamagedListener, this);
        addEnemyBaseDamagedListener(this.enemyBaseDamagedListener, this);
    }

    baseDamagedListener(scene: OverlayUIScene, health: number) {
        if (health <= 0) {
            scene.gameResultText.text = "Defeat!";
            scene.gameResultTimeText.text = "";
            scene.setButtonY(scene.restartButton, scene.gameResultText.getBottomCenter().y + 35);
            scene.setButtonY(scene.mainMenuButton, scene.restartButton.outline.getBottomCenter().y + 40);
            scene.setOverlayVisible(Overlay.GameEnd);
            playSound(scene, SoundEffect.Loss);
        }
    }

    enemyBaseDamagedListener(scene: OverlayUIScene, health: number) {
        if (health <= 0) {
            scene.gameResultText.text = "Victory!";
            let time = scene.activeGame.time;
            let stats = getStats();
            let bestTime = time;
            if (stats && stats.stats && stats.stats[scene.activeGame.era] && stats.stats[scene.activeGame.era].recordTime > 0 && stats.stats[scene.activeGame.era].recordTime < time) {
                bestTime = stats.stats[scene.activeGame.era].recordTime;
            }
            let timeText = timeString(time);
            let bestTimeText = timeString(bestTime);
            scene.gameResultTimeText.text = "Time: " + timeText + "\nBest: " + bestTimeText;
            scene.setButtonY(scene.restartButton, scene.gameResultTimeText.getBottomCenter().y + 35);
            scene.setButtonY(scene.mainMenuButton, scene.restartButton.outline.getBottomCenter().y + 40);
            scene.setOverlayVisible(Overlay.GameEnd);
            playSound(scene, SoundEffect.Victory);
        }
    }

    update() {
        let pauseDown = this.pauseButtonDown();
        if (pauseDown && ! this.pauseKeyHeld) {
            if (this.activeGame.isPaused) {
                this.activeGame.isPaused = false;
                this.hideOverlay();
            } else {
                this.activeGame.isPaused = true;
                this.setOverlayVisible(Overlay.Pause);
            }
        }
        this.pauseKeyHeld = pauseDown;
    }
}
