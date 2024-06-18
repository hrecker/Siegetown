import { addBaseDamagedListener, addEnemyBaseDamagedListener, gameRestartedEvent } from "../events/EventMessenger";
import { ActiveGame } from "../game/Game";
import { whiteColor } from "./BaseScene";

type OverlayButton = {
    button: Phaser.GameObjects.Text;
    outline: Phaser.GameObjects.Rectangle;
}

enum Overlay {
    Pause,
    GameEnd
}

const outlinePadding = 3;
const textBackgroundPadding = 15;

/** UI displayed over MainScene */
export class OverlayUIScene extends Phaser.Scene {
    activeGame: ActiveGame;

    shadowBackground: Phaser.GameObjects.Rectangle;

    // Game result UI
    gameResultBackground: Phaser.GameObjects.Rectangle;
    gameResultText: Phaser.GameObjects.Text;
    restartButton: OverlayButton;

    // Pause UI
    pauseBackground: Phaser.GameObjects.Rectangle;
    pauseText: Phaser.GameObjects.Text;
    resumeButton: OverlayButton;
    mainMenuButton: OverlayButton;

    pauseButtons: Phaser.Input.Keyboard.Key[];
    pauseButtonHeld: boolean;

    constructor() {
        super({
            key: "OverlayUIScene"
        });
    }

    init(data) {
        this.activeGame = data.activeGame;
    }

    /** Adjust any UI elements that need to change position based on the canvas size */
    resize(force?: boolean) {
        if (! this.scene.isActive() && ! force) {
            return;
        }
        //TODO
    }

    hideOverlay() {
        this.shadowBackground.visible = false;
        this.gameResultBackground.visible = false;
        this.pauseBackground.visible = false;
        this.gameResultText.visible = false;
        this.pauseText.visible = false;
        this.setButtonVisible(this.restartButton, false);
        this.setButtonVisible(this.resumeButton, false);
        this.setButtonVisible(this.mainMenuButton, false);
    }

    setOverlayVisible(overlay: Overlay) {
        this.shadowBackground.visible = true;
        let topLeft: Phaser.Types.Math.Vector2Like;
        let height: number, width: number;
        switch (overlay) {
            case Overlay.Pause:
                this.gameResultText.visible = false;
                this.gameResultBackground.visible = false;
                this.pauseText.visible = true;
                this.pauseBackground.visible = true;
                this.setButtonVisible(this.restartButton, false);
                this.setButtonVisible(this.resumeButton, true);
                this.setButtonVisible(this.mainMenuButton, true);
                topLeft = this.pauseText.getTopLeft();
                height = this.mainMenuButton.outline.getBottomCenter().y - this.pauseText.getTopCenter().y;
                width = this.pauseText.displayWidth;
                break;
            case Overlay.GameEnd:
                this.gameResultText.visible = true;
                this.gameResultBackground.visible = true;
                this.pauseText.visible = false;
                this.pauseBackground.visible = false;
                this.setButtonVisible(this.restartButton, true);
                this.setButtonVisible(this.resumeButton, false);
                this.setButtonVisible(this.mainMenuButton, false);
                topLeft = this.gameResultText.getTopLeft();
                height = this.restartButton.outline.getBottomCenter().y - this.gameResultText.getTopCenter().y;
                width = this.gameResultText.displayWidth;
                break;
        }
    }

    createButton(x: number, y: number, text: string, pointerDownFunction: Function): OverlayButton {
        let buttonText = this.add.text(x, y, text, {color: whiteColor}).setFontSize(48).setOrigin(0.5, 0.5);
        let outline = this.add.rectangle(buttonText.getTopLeft().x - outlinePadding, buttonText.getTopLeft().y - outlinePadding,
            buttonText.width + outlinePadding, buttonText.height + outlinePadding).setOrigin(0, 0).setFillStyle(0x5F556A).setStrokeStyle(1, 0xF2F0E5);
        
        buttonText.setInteractive();
        buttonText.on('pointerdown', pointerDownFunction);
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

    pauseButtonDown(): boolean {
        for (let button of this.pauseButtons) {
            if (button.isDown) {
                return true;
            }
        }
        return false;
    }

    create() {
        this.resize(true);

        // Background
        this.shadowBackground = this.add.rectangle(0, 0, this.game.renderer.width, this.game.renderer.height, 0, 0.8).setOrigin(0, 0);

        // Game result ui
        this.gameResultText = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 - 50, "Victory!",
            {color: whiteColor}).setFontSize(64).setOrigin(0.5, 0.5).setDepth(2);
        this.restartButton = this.createButton(this.game.renderer.width / 2, this.game.renderer.height / 2 + 50, "Restart", () => {
            gameRestartedEvent();
            this.hideOverlay();
        });
        let gameResultHeight = this.restartButton.outline.getBottomCenter().y - this.gameResultText.getTopCenter().y;
        this.gameResultBackground = this.add.rectangle(this.gameResultText.getTopLeft().x - textBackgroundPadding, this.gameResultText.getTopLeft().y,
            this.gameResultText.displayWidth + (2 * textBackgroundPadding), gameResultHeight + (2 * textBackgroundPadding)).
            setFillStyle(0x43436A).setOrigin(0, 0).setStrokeStyle(1, 0xF2F0E5).setDepth(1);

        // Pause ui
        this.pauseText = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 - 75, "Paused",
            {color: whiteColor}).setFontSize(64).setOrigin(0.5, 0.5).setDepth(2);
        this.resumeButton = this.createButton(this.game.renderer.width / 2, this.game.renderer.height / 2 + 25, "Resume", () => {
            this.activeGame.isPaused = false;
            this.hideOverlay();
        });
        this.mainMenuButton = this.createButton(this.game.renderer.width / 2, this.game.renderer.height / 2 + 85, "Main Menu", () => {
            //TODO
        });
        let pauseHeight = this.mainMenuButton.outline.getBottomCenter().y - this.pauseText.getTopCenter().y;
        this.pauseBackground = this.add.rectangle(this.mainMenuButton.outline.getTopLeft().x - textBackgroundPadding, this.pauseText.getTopLeft().y,
            this.mainMenuButton.outline.displayWidth + (2 * textBackgroundPadding), pauseHeight + (2 * textBackgroundPadding)).
            setFillStyle(0x43436A).setOrigin(0, 0).setStrokeStyle(1, 0xF2F0E5).setDepth(1);

        this.hideOverlay();

        // Pause button
        this.pauseButtons = [];
        this.pauseButtons.push(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P));
        this.pauseButtons.push(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC));

        addBaseDamagedListener(this.baseDamagedListener, this);
        addEnemyBaseDamagedListener(this.enemyBaseDamagedListener, this);

        this.scale.on("resize", this.resize, this);
    }

    baseDamagedListener(scene: OverlayUIScene, health: number) {
        if (health <= 0) {
            scene.gameResultText.text = "Defeat!";
            scene.setOverlayVisible(Overlay.GameEnd);
        }
    }

    enemyBaseDamagedListener(scene: OverlayUIScene, health: number) {
        if (health <= 0) {
            scene.gameResultText.text = "Victory!";
            scene.setOverlayVisible(Overlay.GameEnd);
        }
    }

    update() {
        let pauseDown = this.pauseButtonDown();
        if (pauseDown && ! this.pauseButtonHeld) {
            if (this.activeGame.isPaused) {
                this.activeGame.isPaused = false;
                this.hideOverlay();
            } else {
                this.activeGame.isPaused = true;
                this.setOverlayVisible(Overlay.Pause);
            }
        }
        this.pauseButtonHeld = pauseDown;
    }
}
