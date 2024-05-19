import { addGameRestartedListener, addUnitBuiltListener } from "../events/EventMessenger";
import { ActiveGame, buildBuilding, canAfford, removeBuilding, gameEnded, resetGame } from "../game/Game";
import { BuildingFrom, UIBuilding, UIState } from "../game/UIState";
import { Building } from "../model/Base";
import { buildingBuffs } from "../model/Buffs";
import { config } from "../model/Config";
import { buildingCosts, zeroResources } from "../model/Resources";
import { UnitType, allUnits } from "../model/Unit";
import { capitalizeFirstLetter, createAnimation } from "../util/Utils";
import { laneSceneTopY } from "./LaneScene";
import { uiBarWidth } from "./ResourceUIScene";
import { Tooltip, createTooltip, setTooltipVisible, updateTooltip } from "./ShopUIScene";

const boardWidth = 300;
const boardMargin = 10;
const cooldownMargin = 10;
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

    unitCooldownIcons: Phaser.GameObjects.Sprite[];
    unitCooldownIconBackgrounds: Phaser.GameObjects.Rectangle[];
    unitCooldownAnimations: Phaser.GameObjects.Graphics[];

    previewBackground: Phaser.GameObjects.Rectangle;
    previewText: Phaser.GameObjects.Text;

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
                    console.log("over")
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
        });

        // Create icons and cooldown bars
        let x = cooldownMargin;
        let y = laneSceneTopY - cooldownMargin;
        this.unitCooldownIcons = [];
        this.unitCooldownIconBackgrounds = [];
        this.unitCooldownAnimations = [];
        allUnits().forEach(unit => {
            let unitIcon = this.add.sprite(x, y, unit + "_icon_small").setOrigin(0, 1).setVisible(false).setScale(0.5).setAlpha(0.8);
            let unitIconBackground = this.add.rectangle(unitIcon.getTopLeft().x, unitIcon.getTopLeft().y,
                unitIcon.displayWidth, unitIcon.displayHeight).
                setFillStyle(0x43436A).setVisible(false).setOrigin(0, 0).setStrokeStyle(1, 0xF2F0E5);
            unitIcon.setDepth(1);
            // Mask the radial cooldown animation to the size of the icon
            let cooldownMask = this.add.graphics().setVisible(false).fillRect(
                unitIcon.getTopLeft().x, unitIcon.getTopLeft().y, unitIcon.displayWidth, unitIcon.displayHeight);
            let unitCooldownAnimation = this.add.graphics().setPosition(unitIcon.getCenter().x, unitIcon.getCenter().y);
            unitCooldownAnimation.setDepth(2);
            unitCooldownAnimation.setMask(cooldownMask.createGeometryMask());
            this.unitCooldownAnimations.push(unitCooldownAnimation)
            this.unitCooldownIconBackgrounds.push(unitIconBackground);
            this.unitCooldownIcons.push(unitIcon);
            y -= unitIcon.displayWidth + cooldownMargin;
        });

        // Create preview text
        this.previewBackground = this.add.rectangle(this.game.renderer.width - uiBarWidth, laneSceneTopY, 100, 10).
            setFillStyle(0x43436A).setOrigin(1, 1).setStrokeStyle(1, 0xF2F0E5).setVisible(false);
        this.previewText = this.add.text(this.game.renderer.width - uiBarWidth - 1, laneSceneTopY - 1, "asdf").setOrigin(1, 1).setVisible(false);

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

    getGridMousePosition(): Phaser.Types.Math.Vector2Like {
        return {
            x: Math.floor((this.input.activePointer.worldX - this.boardTopLeftX) / (boardWidth / config()["baseWidth"])),
            y: Math.floor((this.input.activePointer.worldY - this.boardTopLeftY) / (boardWidth / config()["baseWidth"]))
        }
    }

    isOnGrid(gridPos: Phaser.Types.Math.Vector2Like) {
        return gridPos.x >= 0 && gridPos.x < config()["baseWidth"] && gridPos.y >= 0 && gridPos.y < config()["baseWidth"]
    }

    handleGridClick() {
        if (this.uiState.selectedBuilding == UIBuilding.Empty || gameEnded(this.activeGame)) {
            return;
        }

        let gridPos = this.getGridMousePosition();

        if (! this.isOnGrid(gridPos)) {
            return;
        }

        let isRemove = this.uiState.selectedBuilding == UIBuilding.Remove;
        // Ensure we aren't remove an empty space, or building on a non-empty space
        if (isRemove == (this.activeGame.base.grid[gridPos.x][gridPos.y] == Building.Empty)) {
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
        if (isRemove && this.activeGame.base.grid[gridPos.x][gridPos.y] == Building.Townhall) {
            return;
        }
        
        // If removing, remove the building
        if (isRemove) {
            this.setBuildingSprite(this.gridBuildings[gridPos.x][gridPos.y].mainSprite, Building.Empty);
            removeBuilding(this.activeGame, gridPos.x, gridPos.y);
        } else {
            // Build the building
            this.setBuildingSprite(this.gridBuildings[gridPos.x][gridPos.y].mainSprite, BuildingFrom(this.uiState.selectedBuilding));
            buildBuilding(this.activeGame, BuildingFrom(this.uiState.selectedBuilding), gridPos.x, gridPos.y);
        }
        // Update all tooltip texts as necessary
        for (let i = 0; i < config()["baseWidth"]; i++) {
            for (let j = 0; j < config()["baseWidth"]; j++) {
                updateTooltip(this.gridBuildings[i][j].tooltip, this.getTooltipText(i, j));
            }
        }
    }

    getTooltipText(x: number, y: number): string {
        let building = this.activeGame.base.grid[x][y];
        let production = this.activeGame.base.growthByTile[x][y];
        let buffs = buildingBuffs(this.activeGame.base.grid[x][y]);
        let result = capitalizeFirstLetter(building) + "\n";
        if (production.gold != 0) {
            result += "🪙+" + production.gold + " gold";
        }
        if (production.food != 0) {
            result += "🍞+" + production.food + " food";
        }
        if (production.wood != 0) {
            result += "🪵+" + production.wood + " wood";
        }
        if (buffs.damageBuff != 0) {
            result += "🗡️+" + buffs.damageBuff + " unit damage";
        }
        if (buffs.healthBuff != 0) {
            result += "❤️+" + buffs.healthBuff + " unit health";
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

    drawCooldownAnimation(animation: Phaser.GameObjects.Graphics, delayRemaining: number, maxDelay: number) {
        animation.clear();
        animation.fillStyle(0, 0.7);
        animation.beginPath();
        animation.slice(0, 0, 64,
            Phaser.Math.DegToRad(270), Phaser.Math.DegToRad(270 - (delayRemaining / maxDelay) * 360.0), true)
        animation.fillPath();
    }

    unitBuiltListener(scene: BaseScene, type: UnitType) {
        let delay = scene.activeGame.unitSpawnDelaysRemaining[type];
        if (delay > 0) {
            let maxDelay = config()["units"][type]["spawnDelay"];
            for (let i = 0; i < scene.unitCooldownIcons.length; i++) {
                if (! scene.unitCooldownIcons[i].visible || scene.unitCooldownIcons[i].getData("unitType") == type) {
                    scene.unitCooldownIcons[i].setTexture(type + "_icon_small");
                    scene.drawCooldownAnimation(scene.unitCooldownAnimations[i], delay, maxDelay);
                    scene.unitCooldownIcons[i].setData("unitType", type);
                    scene.unitCooldownIconBackgrounds[i].setVisible(true);
                    scene.unitCooldownIcons[i].setVisible(true);
                    scene.unitCooldownAnimations[i].setVisible(true);
                    break;
                }
            }
        }
    }

    updatePreviewText(text: string) {
        if (text == this.previewText.text) {
            return;
        }
        this.previewText.text = text;
        if (text == "") {
            this.previewBackground.setVisible(false);
            this.previewText.setVisible(false);
        } else {
            this.previewText.setVisible(true);
            this.previewBackground.setVisible(true);
            this.previewBackground.setSize(this.previewText.width + 2, this.previewText.height + 2);
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
                this.unitCooldownIconBackgrounds[i].setVisible(false);
                this.unitCooldownIcons[i].setVisible(false);
                this.unitCooldownAnimations[i].setVisible(false);
                leftShift++;
            } else {
                let maxDelay = config()["units"][type]["spawnDelay"];
                if (leftShift > 0) {
                    this.unitCooldownIcons[i - leftShift].setTexture(this.unitCooldownIcons[i].texture.key);
                    this.unitCooldownIconBackgrounds[i].setVisible(false);
                    this.unitCooldownIcons[i].setVisible(false);
                    this.unitCooldownAnimations[i].setVisible(false);
                    this.unitCooldownIconBackgrounds[i - leftShift].setVisible(true);
                    this.unitCooldownIcons[i - leftShift].setVisible(true);
                    this.unitCooldownAnimations[i - leftShift].setVisible(true);
                    this.unitCooldownIcons[i - leftShift].setData("unitType", type);
                }
                this.drawCooldownAnimation(this.unitCooldownAnimations[i - leftShift], delay, maxDelay);
            }
        }

        // If mousing over an open tile with a selected building, show preview text
        let anyPreview = false;
        if (this.uiState.selectedBuilding != UIBuilding.Empty) {
            let gridPos = this.getGridMousePosition();
            if (this.isOnGrid(gridPos)) {
                let isRemove = this.uiState.selectedBuilding == UIBuilding.Remove;
                let currentBuilding = this.activeGame.base.grid[gridPos.x][gridPos.y];
                if (currentBuilding == Building.Empty && !isRemove) {
                    this.updatePreviewText("Build " + this.uiState.selectedBuilding);
                    anyPreview = true;
                }
                if (isRemove && (this.activeGame.base.grid[gridPos.x][gridPos.y] == Building.Empty)) {

                }
            }
        } 
        if (! anyPreview) {
            this.updatePreviewText("");
        }
    }
}