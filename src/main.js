import Phaser from 'phaser';
import GameScene from './game.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
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
