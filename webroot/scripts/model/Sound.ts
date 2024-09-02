import { getSettings } from "../state/Settings";
import { config } from "./Config";

export enum SoundEffect {
    None = "None",
    Build = "Build",
    ButtonClick = "ButtonClick",
    Bulldoze = "Bulldoze",
    NewUnit = "NewUnit",
    Punch = "Punch",
    Slingshot = "Slingshot",
    Club = "Club",
    Stab = "Stab",
    ArrowShot = "ArrowShot",
    SwordSwing = "SwordSwing",
    Catapult = "Catapult",
    Death = "Death",
    BaseDamaged = "BaseDamaged",
    Victory = "Victory",
    Loss = "Loss",
    Freeze = "Freeze",
    BombLane = "BombLane",
    Reinforcements = "Reinforcements"
}

let sounds: { [effect: string]: Phaser.Sound.BaseSound } = {};

/** Load all sound files */
export function loadSounds(scene: Phaser.Scene) {
    sounds[SoundEffect.Build] = scene.sound.add("Build");
    sounds[SoundEffect.ButtonClick] = scene.sound.add("ButtonClick");
    sounds[SoundEffect.Bulldoze] = scene.sound.add("Bulldoze");
    sounds[SoundEffect.NewUnit] = scene.sound.add("NewUnit");
    sounds[SoundEffect.Punch] = scene.sound.add("Punch");
    sounds[SoundEffect.Slingshot] = scene.sound.add("Slingshot");
    sounds[SoundEffect.Club] = scene.sound.add("Club");
    sounds[SoundEffect.Stab] = scene.sound.add("Stab");
    sounds[SoundEffect.ArrowShot] = scene.sound.add("ArrowShot");
    sounds[SoundEffect.SwordSwing] = scene.sound.add("SwordSwing");
    sounds[SoundEffect.Catapult] = scene.sound.add("Catapult");
    sounds[SoundEffect.Death] = scene.sound.add("Death");
    sounds[SoundEffect.BaseDamaged] = scene.sound.add("BaseDamaged");
    sounds[SoundEffect.Victory] = scene.sound.add("Victory");
    sounds[SoundEffect.Loss] = scene.sound.add("Loss");
    sounds[SoundEffect.Freeze] = scene.sound.add("Freeze");
    sounds[SoundEffect.BombLane] = scene.sound.add("BombLane");
    sounds[SoundEffect.Reinforcements] = scene.sound.add("Reinforcements");
}

/** Get a given sound */
export function getSound(sound: SoundEffect): Phaser.Sound.BaseSound {
    return sounds[sound];
}

/** Get a given sound */
export function playSound(scene: Phaser.Scene, sound: SoundEffect) {
    if (! getSettings().sfxEnabled || sound == SoundEffect.None) {
        return;
    }

    // Avoid noises piling up when tabbed out.
    if (!scene.game.hasFocus) {
        return;
    }

    scene.sound.play(sound, {
        volume: config()["defaultSfxVolume"][sound]
    });
}

/** Stop any playing sounds */
export function stopAllSounds() {
    Object.keys(sounds).forEach(soundEffect => {
        sounds[soundEffect].stop();
    })
}