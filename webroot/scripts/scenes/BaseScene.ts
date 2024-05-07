import { addGameRestartedListener, addUnitBuiltListener } from "../events/EventMessenger";
import { ActiveGame, buildBuilding, canAfford, removeBuilding, gameEnded, resetGame } from "../game/Game";
import { BuildingFrom, UIBuilding, UIState } from "../game/UIState";
import { Building } from "../model/Base";
import { buildingBuffs } from "../model/Buffs";
import { config } from "../model/Config";
import { buildingCosts, zeroResources } from "../model/Resources";
import { UnitType, allUnits } from "../model/Unit";
import { createAnimation } from "../util/Utils";
import { laneSceneTopY } from "./LaneScene";
import { uiBarWidth } from "./ResourceUIScene";
import { Tooltip, createTooltip, setTooltipVisible } from "./ShopUIScene";

const boardWidth = 300;
const boardMargin = 10;
const cooldownMargin = 10;
const cooldownBarHeight = 100;
export const whiteColor = "#F2F0E5";

type GridBuilding = {
    mainSprite: Phaser.GameObjects.Sprite;
    tooltip: Tooltip;
}

export class BaseScene extends Phaser.Scene {
    sceneCreated: boolean;
    activeGame: ActiveGame;
    uiState: UIState;

    gridBuildings: GridBuilding[][];

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
        this.cameras.main.setBackgroundColor(0x212123);

        // Create animations
        createAnimation(this, "townhall", 2);
        createAnimation(this, "field", 2);
        createAnimation(this, "forest", 2);
        createAnimation(this, "market", 2);
        createAnimation(this, "barracks", 2);
        createAnimation(this, "trainingground", 2);

        // Draw the board
        this.boardTopLeftX = ((this.game.renderer.width - uiBarWidth) / 2) - (boardWidth / 2);
        this.boardTopLeftY = (this.game.renderer.height / 2) - boardWidth + boardMargin;

        let boardLineWidth = 4;
        let graphics = this.add.graphics({ lineStyle: { width: boardLineWidth, color: 0xF2F0E5 } });

        for (let i = 0; i <= config()["baseWidth"]; i++) {
            let diff = (boardWidth * i / config()["baseWidth"]);
            graphics.strokeLineShape(new Phaser.Geom.Line(this.boardTopLeftX, this.boardTopLeftY + diff, this.boardTopLeftX + boardWidth, this.boardTopLeftY + diff));
            graphics.strokeLineShape(new Phaser.Geom.Line(this.boardTopLeftX + diff, this.boardTopLeftY, this.boardTopLeftX + diff, this.boardTopLeftY + boardWidth));
        }

        // Draw the buildings
        this.gridBuildings = [];
        let tileWidth = boardWidth / config()["baseWidth"];
        for (let i = 0; i < config()["baseWidth"]; i++) {
            this.gridBuildings[i] = [];
            for (let j = 0; j < config()["baseWidth"]; j++) {
                let x = this.boardTopLeftX + (tileWidth * i) + (tileWidth / 2);
                let y = this.boardTopLeftY + (tileWidth * j) + (tileWidth / 2);
                // Just default to townhall to start, the actual sprite is set in the next call
                let buildingSprite = this.add.sprite(x, y, "townhall1");
                let xScale = (tileWidth - boardLineWidth) / buildingSprite.displayWidth;
                let yScale = (tileWidth - boardLineWidth) / buildingSprite.displayHeight;
                buildingSprite.setScale(xScale, yScale);
                this.setBuildingSprite(buildingSprite, this.activeGame.base.grid[i][j]);
                this.gridBuildings[i][j] = {
                    mainSprite: buildingSprite,
                    tooltip: null
                };
            }
        }

        // Draw the tooltips second so that they appear above the buildings
        for (let i = 0; i < config()["baseWidth"]; i++) {
            for (let j = 0; j < config()["baseWidth"]; j++) {
                let x = this.boardTopLeftX + (tileWidth * i) + (tileWidth / 2);
                let y = this.boardTopLeftY + (tileWidth * j) + (tileWidth / 2);
                let tooltipOriginX = 0, tooltipOriginY = 0;
                if (i >= config()["baseWidth"] / 2) {
                    tooltipOriginX = 1;
                }
                if (j >= config()["baseWidth"] / 2) {
                    tooltipOriginY = 1;
                }
                let tooltip = createTooltip(this, this.getTooltipText(i, j), x, y, tooltipOriginX, tooltipOriginY);
                this.gridBuildings[i][j].mainSprite.setInteractive();
                this.gridBuildings[i][j].mainSprite.on('pointerover', () => {
                    setTooltipVisible(tooltip, true);
                });
                this.gridBuildings[i][j].mainSprite.on('pointerout', () => {
                    setTooltipVisible(tooltip, false);
                });
                this.gridBuildings[i][j].tooltip = tooltip;
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

    setBuildingSprite(sprite: Phaser.GameObjects.Sprite, buildingType: Building) {
        if (buildingType == Building.Empty) {
            sprite.setVisible(false);
        } else {
            sprite.setVisible(true);
            sprite.setTexture(buildingType + "1").play(buildingType, true);
        }
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
            this.setBuildingSprite(this.gridBuildings[gridX][gridY].mainSprite, Building.Empty);
            removeBuilding(this.activeGame, gridX, gridY);
        } else {
            // Build the building
            this.setBuildingSprite(this.gridBuildings[gridX][gridY].mainSprite, BuildingFrom(this.uiState.selectedBuilding));
            buildBuilding(this.activeGame, BuildingFrom(this.uiState.selectedBuilding), gridX, gridY);
        }
        // Update all tooltip texts as necessary
        for (let i = 0; i < config()["baseWidth"]; i++) {
            for (let j = 0; j < config()["baseWidth"]; j++) {
                this.gridBuildings[i][j].tooltip.text.text = this.getTooltipText(i, j);
            }
        }
    }

    getTooltipText(x: number, y: number): string {
        let building = this.activeGame.base.grid[x][y];
        let production = this.activeGame.base.growthByTile[x][y];
        let buffs = buildingBuffs(this.activeGame.base.grid[x][y]);
        let result = building + "\n";
        if (production.gold != 0) {
            result += "+" + production.gold + " gold/second";
        }
        if (production.food != 0) {
            result += "+" + production.food + " food/second";
        }
        if (production.wood != 0) {
            result += "+" + production.wood + " wood/second";
        }
        if (buffs.damageBuff != 0) {
            result += "+" + buffs.damageBuff + " unit damage/second";
        }
        if (buffs.healthBuff != 0) {
            result += "+" + buffs.healthBuff + " unit health/second";
        }
        return result;
    }
    
    gameRestartedListener(scene: BaseScene) {
        resetGame(scene.activeGame);
        // redraw the buildings
        for (let i = 0; i < config()["baseWidth"]; i++) {
            for (let j = 0; j < config()["baseWidth"]; j++) {
                scene.setBuildingSprite(scene.gridBuildings[i][j].mainSprite, scene.activeGame.base.grid[i][j]);
                scene.gridBuildings[i][j].tooltip.text.text = scene.getTooltipText(i, j);
            }
        }
    }

    unitBuiltListener(scene: BaseScene, type: UnitType) {
        let delay = scene.activeGame.unitSpawnDelaysRemaining[type];
        if (delay > 0) {
            let maxDelay = config()["units"][type]["spawnDelay"];
            for (let i = 0; i < scene.unitCooldownIcons.length; i++) {
                if (! scene.unitCooldownIcons[i].visible || scene.unitCooldownIcons[i].getData("unitType") == type) {
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