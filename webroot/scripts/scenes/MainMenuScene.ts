import { createGame } from "../game/Game";
import { createUIState } from "../game/UIState";
import { whiteColor } from "./BaseScene";

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({
            key: "MainMenuScene"
        });
    }

    create() {
        this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 - 100, "SiegeTown").setOrigin(0.5, 0.5).setFontSize(80);
        let buttonText = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 + 100, "Play", {color: whiteColor}).setFontSize(64).setOrigin(0.5, 0.5);
        let outlinePadding = 8;
        let outline = this.add.rectangle(buttonText.getTopLeft().x - outlinePadding, buttonText.getTopLeft().y - outlinePadding,
            buttonText.width + (outlinePadding * 2), buttonText.height + (outlinePadding * 2)).setOrigin(0, 0).setFillStyle(0x5F556A).setStrokeStyle(1, 0xF2F0E5);
        
        buttonText.setInteractive();
        buttonText.on('pointerdown', () => { this.startGame() });
        outline.setDepth(2);
        buttonText.setDepth(3);
    }

    startGame() {
        let activeGame = createGame();
        let uiState = createUIState();
        this.scene.start("BaseScene", { activeGame: activeGame, uiState: uiState })
                  .start("LaneScene", { activeGame: activeGame, uiState: uiState })
                  .start("ResourceUIScene", { activeGame: activeGame, uiState: uiState })
                  .start("ShopUIScene", { activeGame: activeGame, uiState: uiState })
                  .start("OverlayUIScene", { activeGame: activeGame, uiState: uiState })
                  .stop();
    }
}