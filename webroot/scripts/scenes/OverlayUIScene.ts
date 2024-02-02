import { addBaseDamagedListener, addEnemyBaseDamagedListener, addWaveCountdownUpdatedListener, gameRestartedEvent } from "../events/EventMessenger";
import { ActiveGame } from "../game/Game";

/** UI displayed over MainScene */
export class OverlayUIScene extends Phaser.Scene {
    activeGame: ActiveGame;

    // Time until next wave
    waveCountdown: Phaser.GameObjects.Text;

    // Game result UI
    resultBackground: Phaser.GameObjects.Rectangle;
    gameResultText: Phaser.GameObjects.Text;
    restartButton: Phaser.GameObjects.Text;
    restartButtonOutline: Phaser.GameObjects.Rectangle;

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

    setGameEndVisible(visible: boolean) {
        this.resultBackground.visible = visible;
        this.gameResultText.visible = visible;
        this.restartButton.visible = visible;
        this.restartButtonOutline.visible = visible;
    }

    create() {
        this.resize(true);

        this.waveCountdown = this.add.text(5, 5, "Next wave:\n" + this.minutesText(this.activeGame.secondsUntilWave));

        this.resultBackground = this.add.rectangle(0, 0, this.game.renderer.width, this.game.renderer.height, 0, 0.8).setOrigin(0, 0);
        this.gameResultText = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 - 50, "Victory!").setFontSize(64).setOrigin(0.5, 0.5);
        this.restartButton = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 + 50, "Restart").setFontSize(48).setOrigin(0.5, 0.5);
        this.restartButtonOutline = this.add.rectangle(this.restartButton.getTopLeft().x - 1, this.restartButton.getTopLeft().y - 1,
            this.restartButton.width + 1, this.restartButton.height + 1).setOrigin(0, 0);
        this.restartButtonOutline.isStroked = true;
        this.setGameEndVisible(false);
        this.restartButton.setInteractive();

        this.restartButton.on('pointerdown', () => {
            gameRestartedEvent();
            this.setGameEndVisible(false);
        });

        addBaseDamagedListener(this.baseDamagedListener, this);
        addEnemyBaseDamagedListener(this.enemyBaseDamagedListener, this);
        addWaveCountdownUpdatedListener(this.waveCountdownUpdatedListener, this);

        this.scale.on("resize", this.resize, this);
    }

    baseDamagedListener(scene: OverlayUIScene, health: number) {
        if (health <= 0) {
            scene.gameResultText.text = "Defeat!";
            scene.setGameEndVisible(true);
        }
    }

    enemyBaseDamagedListener(scene: OverlayUIScene, health: number) {
        if (health <= 0) {
            scene.gameResultText.text = "Victory!";
            scene.setGameEndVisible(true);
        }
    }

    minutesText(totalSeconds: number): string {
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = (totalSeconds - (60 * minutes)).toString();
        if (seconds.length < 2) {
            seconds = "0" + seconds;
        }
        return minutes + ":" + seconds;
    }

    waveCountdownUpdatedListener(scene: OverlayUIScene, secondsRemaining: number) {
        scene.waveCountdown.text = "Next wave:\n" + scene.minutesText(secondsRemaining);
    }
}
