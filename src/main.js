import Phaser from 'phaser';
import GameScene from './game.js';

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1200 },
            debug: false
        }
    },
    scene: GameScene
};

const game = new Phaser.Game(config);
