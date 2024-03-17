import { addGameRestartedListener, addUnitBuiltListener } from "../events/EventMessenger";
import { ActiveGame, buildBuilding, canAfford, removeBuilding, gameEnded, resetGame } from "../game/Game";
import { BuildingFrom, UIBuilding, UIState } from "../game/UIState";
import { Building } from "../model/Base";
import { buildingBuffs } from "../model/Buffs";
import { config } from "../model/Config";
import { buildingCosts, zeroResources } from "../model/Resources";
import { UnitType, allUnits } from "../model/Unit";
import { laneSceneTopY } from "./LaneScene";
import { uiBarWidth } from "./ResourceUIScene";

const boardWidth = 300;
const boardMargin = 10;
const cooldownMargin = 10;
const cooldownBarHeight = 100;

type GridText = {
    mainText: Phaser.GameObjects.Text;
    growthText: Phaser.GameObjects.Text;
}

export class BaseScene extends Phaser.Scene {
    sceneCreated: boolean;
    activeGame: ActiveGame;
    uiState: UIState;

    gridTexts: GridText[][];

    boardTopLeftX: number;
    boardTopLeftY: number;
    laneTopY: number;
    laneHeight: number;

    unitCooldownIcons: Phaser.GameObjects.Text[];
    unitCooldownBars: Phaser.GameObjects.Rectangle[];

    constructor() {
        super({
            key: "BaseScene"
        });
    }

    init(data) {
        this.activeGame = data.activeGame;
        this.uiState = data.uiState;
    }

    /** Adjust any UI elements that need to change position based on the canvas size */
    resize(force?: boolean) {
        if (! this.scene.isActive() && force !== true) {
            return;
        }
        //TODO
    }

    create() {
        if (! this.sceneCreated) {
            // Add event listeners here
            this.sceneCreated = true;
        }

        // Draw the board
        this.boardTopLeftX = ((this.game.renderer.width - uiBarWidth) / 2) - (boardWidth / 2);
        this.boardTopLeftY = (this.game.renderer.height / 2) - boardWidth + boardMargin;

        let graphics = this.add.graphics({ lineStyle: { width: 4 } });

        for (let i = 0; i <= config()["baseWidth"]; i++) {
            let diff = (boardWidth * i / config()["baseWidth"]);
            graphics.strokeLineShape(new Phaser.Geom.Line(this.boardTopLeftX, this.boardTopLeftY + diff, this.boardTopLeftX + boardWidth, this.boardTopLeftY + diff));
            graphics.strokeLineShape(new Phaser.Geom.Line(this.boardTopLeftX + diff, this.boardTopLeftY, this.boardTopLeftX + diff, this.boardTopLeftY + boardWidth));
        }

        // Draw the buildings
        this.gridTexts = [];
        for (let i = 0; i < config()["baseWidth"]; i++) {
            this.gridTexts[i] = [];
            for (let j = 0; j < config()["baseWidth"]; j++) {
                let x = this.boardTopLeftX + (boardWidth * i / config()["baseWidth"]) + (boardWidth / (config()["baseWidth"] * 2));
                let y = this.boardTopLeftY + (boardWidth * j / config()["baseWidth"]) + (boardWidth / (config()["baseWidth"] * 2));
                let mainText = this.add.text(x, y - 10, this.getBuildingText(this.activeGame.base.grid[i][j])).setOrigin(0.5, 0.5).setFontSize(64);
                let growthText = this.add.text(x, y + 20, this.getGrowthText(i, j)).setOrigin(0.5, 0.5).setFontSize(14);
                this.gridTexts[i][j] = {
                    mainText: mainText,
                    growthText: growthText
                };
            }
        }

        // Handle mouse clicks
        this.input.on("pointerup", () => {
            this.handleGridClick();
            //this.handleLaneClick();
        });

        // Create icons and cooldown bars
        let x = cooldownMargin;
        let y = laneSceneTopY - cooldownMargin;
        this.unitCooldownIcons = [];
        this.unitCooldownBars = [];
        allUnits().forEach(unit => {
            let unitIcon = this.add.text(x, y, String(unit).charAt(0)).setBackgroundColor("white").setColor("black").setOrigin(0, 1).setFontSize(24).setVisible(false);
            this.unitCooldownIcons.push(unitIcon);
            let unitCooldownBar = this.add.rectangle(x, y - unitIcon.height - cooldownMargin, unitIcon.width, cooldownBarHeight, 0xffffff).setOrigin(0, 1).setVisible(false);
            this.unitCooldownBars.push(unitCooldownBar);
            x += unitIcon.width + cooldownMargin;
        });

        this.resize(true);
        this.scale.on("resize", this.resize, this);

        addGameRestartedListener(this.gameRestartedListener, this);
        addUnitBuiltListener(this.unitBuiltListener, this);
    }

    handleGridClick() {
        if (this.uiState.selectedBuilding == UIBuilding.Empty || gameEnded(this.activeGame)) {
            return;
        }

        let gridX = Math.floor((this.input.activePointer.worldX - this.boardTopLeftX) / (boardWidth / config()["baseWidth"]));
        let gridY = Math.floor((this.input.activePointer.worldY - this.boardTopLeftY) / (boardWidth / config()["baseWidth"]));

        if (gridX < 0 || gridX >= config()["baseWidth"] || gridY < 0 || gridY >= config()["baseWidth"]) {
            return;
        }

        let isRemove = this.uiState.selectedBuilding == UIBuilding.Remove;
        // Ensure we aren't remove an empty space, or building on a non-empty space
        if (isRemove == (this.activeGame.base.grid[gridX][gridY] == Building.Empty)) {
            return;
        }

        let costs = zeroResources();
        if (isRemove) {
            costs.gold = config()["removeBuildingCost"];
        } else {
            costs = buildingCosts(BuildingFrom(this.uiState.selectedBuilding));
        }
        if (! canAfford(this.activeGame, costs)) {
            return;
        }

        // Don't allow removing townhall
        if (isRemove && this.activeGame.base.grid[gridX][gridY] == Building.Townhall) {
            return;
        }
        
        // If removing, remove the building
        if (isRemove) {
            this.gridTexts[gridX][gridY].mainText.text = this.getBuildingText(Building.Empty);
            removeBuilding(this.activeGame, gridX, gridY);
        } else {
            // Build the building
            this.gridTexts[gridX][gridY].mainText.text = this.getBuildingText(BuildingFrom(this.uiState.selectedBuilding));
            buildBuilding(this.activeGame, BuildingFrom(this.uiState.selectedBuilding), gridX, gridY);
        }
        // Update all growth texts as necessary
        for (let i = 0; i < config()["baseWidth"]; i++) {
            for (let j = 0; j < config()["baseWidth"]; j++) {
                this.gridTexts[i][j].growthText.text = this.getGrowthText(i, j);
            }
        }
    }

    getBuildingText(building: Building): string {
        switch(building) {
            case Building.Field:
                return "F";
            case Building.Forest:
                return "O";
            case Building.Market:
                return "M";
            case Building.Townhall:
                return "T";
            case Building.Barracks:
                return "B";
            case Building.TrainingGround:
                return "G";
        }
        return "";
    }

    getGrowthText(x: number, y: number): string {
        let production = this.activeGame.base.growthByTile[x][y];
        let buffs = buildingBuffs(this.activeGame.base.grid[x][y]);
        let result = "";
        if (production.gold != 0) {
            result += "+" + production.gold + "G";
        }
        if (production.food != 0) {
            result += "+" + production.food + "F";
        }
        if (production.wood != 0) {
            result += "+" + production.wood + "W";
        }
        if (buffs.damageBuff != 0) {
            result += "+" + buffs.damageBuff + "D";
        }
        if (buffs.healthBuff != 0) {
            result += "+" + buffs.healthBuff + "H";
        }
        return result;
    }
    
    gameRestartedListener(scene: BaseScene) {
        resetGame(scene.activeGame);
        // redraw the buildings
        for (let i = 0; i < config()["baseWidth"]; i++) {
            for (let j = 0; j < config()["baseWidth"]; j++) {
                scene.gridTexts[i][j].mainText.text = scene.getBuildingText(scene.activeGame.base.grid[i][j]);
                scene.gridTexts[i][j].growthText.text = scene.getGrowthText(i, j);
            }
        }
    }

    unitBuiltListener(scene: BaseScene, type: UnitType) {
        let delay = scene.activeGame.unitSpawnDelaysRemaining[type];
        if (delay > 0) {
            let maxDelay = config()["units"][type]["spawnDelay"];
            for (let i = 0; i < scene.unitCooldownIcons.length; i++) {
                if (! scene.unitCooldownIcons[i].visible) {
                    scene.unitCooldownIcons[i].setText(String(type).charAt(0));
                    scene.unitCooldownBars[i].setSize(scene.unitCooldownIcons[i].width, (delay / maxDelay) * cooldownBarHeight);
                    scene.unitCooldownIcons[i].setData("unitType", type);
                    scene.unitCooldownIcons[i].setVisible(true);
                    scene.unitCooldownBars[i].setVisible(true);
                    break;
                }
            }
        }
    }

    update(time: number, delta: number): void {
        let leftShift = 0;
        for (let i = 0; i < this.unitCooldownIcons.length; i++) {
            if (! this.unitCooldownIcons[i].visible) {
                continue;
            }
            let type = this.unitCooldownIcons[i].getData("unitType");
            let delay = this.activeGame.unitSpawnDelaysRemaining[type];
            if (delay <= 0) {
                this.unitCooldownIcons[i].setVisible(false);
                this.unitCooldownBars[i].setVisible(false);
                leftShift++;
            } else {
                let maxDelay = config()["units"][type]["spawnDelay"];
                this.unitCooldownBars[i].setSize(this.unitCooldownIcons[i].width, (delay / maxDelay) * cooldownBarHeight);
                if (leftShift > 0) {
                    this.unitCooldownIcons[i - leftShift].setText(this.unitCooldownIcons[i].text);
                    this.unitCooldownBars[i - leftShift].setSize(this.unitCooldownBars[i].width, this.unitCooldownBars[i].height);
                    this.unitCooldownIcons[i].setVisible(false);
                    this.unitCooldownBars[i].setVisible(false);
                    this.unitCooldownIcons[i - leftShift].setVisible(true);
                    this.unitCooldownBars[i - leftShift].setVisible(true);
                    this.unitCooldownIcons[i - leftShift].setData("unitType", type);
                }
            }
        }
    }
}