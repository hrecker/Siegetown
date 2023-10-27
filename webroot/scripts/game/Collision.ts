import { Unit, updateHealth, updateStagger } from "../model/Unit";
import { vector2Str } from "../util/Util";

export const playerAttackName = "playerAttack";
export const playerParryName = "playerParry";
export const enemyAttackName = "enemyAttack";
export const enemyAttackParryableName = "enemyAttackParryable";

export function handlePlayerAttackHit(obj1: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, obj2: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) {
    let enemy: Unit;
    let attack: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    if (obj1.name == playerAttackName) {
        enemy = this.getUnit(obj2.getData("id"));
        attack = obj1;
    } else if (obj2.name == playerAttackName) {
        enemy = this.getUnit(obj1.getData("id"));
        attack = obj2;
    }
    if (enemy && ! attack.getData("hits").includes(enemy.id)) {
        attack.getData("hits").push(enemy.id);
        if (attack.getData("reflect")) {
            updateStagger(enemy, attack.getData("damage"));
            attack.destroy();
        } else {
            updateHealth(enemy, -attack.getData("damage"));
        }
    }
}

export function handleEnemyAttackHit(obj1: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, obj2: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) {
    let attack: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    if (obj1.name == enemyAttackName || obj1.name == enemyAttackParryableName) {
        attack = obj1;
    } else if (obj2.name == enemyAttackName || obj2.name == enemyAttackParryableName) {
        attack = obj2;
    }
    let player: Unit = this.getPlayer();
    if (attack && ! attack.getData("hits").includes(player.id)) {
        attack.getData("hits").push(player.id);
        updateHealth(player, -attack.getData("damage"));
        attack.destroy();
    }
}

export function handleParryHit(obj1: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, obj2: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) {
    let attack: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    if (obj1.name == enemyAttackParryableName) {
        attack = obj1;
    } else if (obj2.name == enemyAttackParryableName) {
        attack = obj2;
    }
    if (attack) {
        // Find the owner and aim for it
        let enemy: Unit = attack.scene.getUnit(attack.getData("owner"));
        let speed = attack.body.velocity.length() * 2;
        let direction = attack.body.velocity.clone().negate();
        if (enemy != null) {
            let estimatedTimeToImpact = enemy.body.body.position.clone().distance(attack.body.position) / speed;
            let target = enemy.body.body.position.clone().add(enemy.body.body.velocity.clone().scale(estimatedTimeToImpact));
            direction = target.subtract(attack.body.position);
        }
        // Switch to a player attack
        attack.setName(playerAttackName);
        let velocity = direction.normalize().scale(speed);
        this.getEnemyAttackPhysicsGroup().remove(attack);
        this.getPlayerAttackPhysicsGroup().add(attack);
        attack.setVelocity(velocity.x, velocity.y);
        attack.setData("reflect", true);
        attack.setData("damage", this.getPlayer().damage)
    }
}
