import { addBaseDamagedListener, addEnemyBaseDamagedListener, addGameRestartedListener, addResourceUpdateListener, addWaveCountdownUpdatedListener } from "../events/EventMessenger";
import { ActiveGame } from "../game/Game";
import { config } from "../model/Config";
import { Era } from "../state/EraState";
import { whiteColor } from "./BaseScene";
import { defaultGameHeight } from "./LaneScene";

export const uiBarWidth = 285;
const defaultStatusBarHeight = 180;
const minimalStatusBarHeight = 150;
export const defaultFontSize = 16;
export const minimalFontSize = 14;
const waveDefaultFontSize = 24;
const waveMinimalFontSize = 20;

export function isMinimal(game: Phaser.Game) {
    return game.renderer.height < defaultGameHeight;
}

export function statusBarHeight(game: Phaser.Game, activeGame: ActiveGame) {
    return isMinimal(game) && activeGame.era == Era.Caveman ? minimalStatusBarHeight : defaultStatusBarHeight;
}

export class ResourceUIScene extends Phaser.Scene {
    activeGame: ActiveGame;

    // Building UI
    goldText: Phaser.GameObjects.Text;
    woodText: Phaser.GameObjects.Text;
    foodText: Phaser.GameObjects.Text;
    metalText: Phaser.GameObjects.Text;
    baseHealthText: Phaser.GameObjects.Text;
    enemyBaseHealthText: Phaser.GameObjects.Text;
    waveCountdown: Phaser.GameObjects.Text;

    constructor() {
        super({
            key: "ResourceUIScene"
        });
    }

    init(data) {
        this.activeGame = data.activeGame;
    }

    create() {
        let fontSize = defaultFontSize;
        let barHeight = statusBarHeight(this.game, this.activeGame);
        let waveFontSize = waveDefaultFontSize;
        if (isMinimal(this.game)) {
            fontSize = minimalFontSize;
            waveFontSize = waveMinimalFontSize;
        }

        this.cameras.main.setPosition(this.game.renderer.width - uiBarWidth, 0);
        this.cameras.main.setBackgroundColor(0x3A3858);

        this.goldText = this.add.text(10, 10, "Gold : 0", {color: whiteColor}).setPadding(0, 3).setFontSize(fontSize);
        this.woodText = this.add.text(10, 30, "Wood: 0", {color: whiteColor}).setPadding(0, 3).setFontSize(fontSize);
        this.foodText = this.add.text(10, 50, "Food: 0", {color: whiteColor}).setPadding(0, 3).setFontSize(fontSize);
        this.metalText = this.add.text(10, 70, "Metal: 0", {color: whiteColor}).setPadding(0, 3).setFontSize(fontSize);
        // Hide metal resource for caveman era
        let lowResourceTextY = this.metalText.y;
        if (this.activeGame.era == Era.Caveman) {
            this.metalText.setVisible(false);
            lowResourceTextY = this.foodText.y;
        }
        this.updateResourceText();
        this.baseHealthText = this.add.text(10, lowResourceTextY + 20, "", {color: whiteColor}).setFontSize(fontSize);
        this.baseDamagedListener(this, this.activeGame.baseHealth);
        this.enemyBaseHealthText = this.add.text(10, lowResourceTextY + 40, "", {color: whiteColor}).setFontSize(fontSize);
        this.enemyBaseDamagedListener(this, this.activeGame.enemyBaseHealth);
        
        let statusRectangleHeight = this.enemyBaseHealthText.getBottomRight().y + 10;
        let statusRectangle = this.add.rectangle(1, 1, uiBarWidth - 2, statusRectangleHeight).setOrigin(0, 0);
        statusRectangle.isStroked = true;
        let waveRectangle = this.add.rectangle(1, statusRectangleHeight + 1, uiBarWidth - 2, barHeight - statusRectangleHeight - 4).setOrigin(0, 0);
        waveRectangle.isStroked = true;

        this.waveCountdown = this.add.text(uiBarWidth / 2, waveRectangle.getLeftCenter().y,
            "⚠️ Next wave: " + this.minutesText(this.activeGame.secondsUntilWave), {color: whiteColor, fontSize: waveFontSize + "px"}).setOrigin(0.5, 0.5).setPadding(0, 3);

        addResourceUpdateListener(this.resourceUpdateListener, this);
        addBaseDamagedListener(this.baseDamagedListener, this);
        addEnemyBaseDamagedListener(this.enemyBaseDamagedListener, this);
        addGameRestartedListener(this.gameRestartedListener, this);
        addWaveCountdownUpdatedListener(this.waveCountdownUpdatedListener, this);
    }

    gameRestartedListener(scene: ResourceUIScene) {
        scene.updateResourceText();
        scene.baseDamagedListener(scene, scene.activeGame.baseHealth);
        scene.enemyBaseDamagedListener(scene, scene.activeGame.enemyBaseHealth);
    }

    updateResourceText() {
        this.goldText.text = "🪙 Gold (+" + this.activeGame.base.totalGrowth.gold + "): " + this.activeGame.resources.gold;
        this.foodText.text = "🍞 Food (+" + this.activeGame.base.totalGrowth.food + "): " + this.activeGame.resources.food;
        this.woodText.text = "🪵 Wood (+" + this.activeGame.base.totalGrowth.wood + "): " + this.activeGame.resources.wood;
        this.metalText.text = "⛏️ Metal (+" + this.activeGame.base.totalGrowth.metal + "): " + this.activeGame.resources.metal;
    }

    resourceUpdateListener(scene: ResourceUIScene) {
        scene.updateResourceText();
    }

    baseDamagedListener(scene: ResourceUIScene, health: number) {
        scene.baseHealthText.text = "❤️ Health: " + health + " / " + config()["baseMaxHealth"];
    }

    enemyBaseDamagedListener(scene: ResourceUIScene, health: number) {
        scene.enemyBaseHealthText.text = "🖤 Enemy Health: " + health + " / " + config()["enemyBaseMaxHealth"];
    }

    minutesText(totalSeconds: number): string {
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = (totalSeconds - (60 * minutes)).toString();
        if (seconds.length < 2) {
            seconds = "0" + seconds;
        }
        return minutes + ":" + seconds;
    }

    waveCountdownUpdatedListener(scene: ResourceUIScene, secondsRemaining: number) {
        scene.waveCountdown.text = "⚠️ Next wave: " + scene.minutesText(secondsRemaining);
    }
}
