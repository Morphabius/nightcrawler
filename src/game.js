import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.isAttacking = false;
        this.isTeleporting = false;
        this.canDoubleJump = true;
        this.teleportDist = 200;
        this.isKickDown = false;
    }

    preload() {
        this.load.image('bg', '/assets/bg.png');

        const loadSet = (key, path, frames, prefix) => {
            for (let i = 1; i <= frames; i++) {
                this.load.image(`${key}${i}`, `/assets/${path}/${prefix}${i}.png`);
            }
        };

        loadSet('idle', 'idle', 8, 'idle');
        loadSet('walk', 'walk', 6, 'walk');
        loadSet('lowered', 'lowered', 6, 'lowered');

        for (let i = 1; i <= 13; i++) {
            if (i === 7) continue;
            this.load.image(`waiting${i}`, `/assets/waiting/waiting${i}.png`);
        }

        this.load.image('jumpUP', '/assets/jump/junpUP.png');
        this.load.image('jumpStay', '/assets/jump/junpStay.png');
        this.load.image('jumpDown', '/assets/jump/junpDown.png');

        loadSet('punch', 'punch', 3, 'punch');
        loadSet('flykick', 'flykick', 2, 'FlyKick');
        loadSet('punchUP', 'PunchUP', 6, 'PunchUP');
        loadSet('jumpBack', 'JumpBack', 4, 'JumpBack');
        loadSet('loweredPunch', 'loweredPunch', 2, 'loweredPunch');
        loadSet('wallPunch', 'WallPunch', 6, 'WallPunch');

        this.load.image('doubleJump1', '/assets/DoubleJump/1doubleJumpUP.png');
        this.load.image('doubleJump2', '/assets/DoubleJump/2rolling.png');
        this.load.image('doubleJump3', '/assets/DoubleJump/3doubleJumpDown.png');

        this.load.image('diagKick', '/assets/DiagKick.png');
        this.load.image('kickDown', '/assets/KickDown.png');
        loadSet('tp', 'teleport', 9, 'a');
    }

    create() {
        this.bg = this.add.tileSprite(512, 384, 1024, 768, 'bg').setScrollFactor(0);

        // === PLATFORMS ===
        this.platforms = this.physics.add.staticGroup();
        this.createNeonPlatform(512, 748, 1024, 40);
        this.createNeonPlatform(750, 550, 250, 16);
        this.createNeonPlatform(250, 480, 250, 16);

        this.add.text(16, 16, 'NIGHTCRAWLER - BAMF!', {
            fontSize: '18px', fill: '#00ffff', fontStyle: 'bold'
        }).setScrollFactor(0);

        // === ANIMATIONS ===
        const createAnim = (key, framesKey, count, rate = 12, repeat = -1) => {
            this.anims.create({
                key,
                frames: Array.from({ length: count }, (_, i) => ({ key: `${framesKey}${i + 1}` })),
                frameRate: rate,
                repeat
            });
        };

        const waitingFrames = [];
        for (let i = 1; i <= 13; i++) { if (i !== 7) waitingFrames.push({ key: `waiting${i}` }); }
        this.anims.create({ key: 'waiting', frames: waitingFrames, frameRate: 10, repeat: -1 });

        createAnim('idle', 'idle', 8);
        createAnim('walk', 'walk', 6);
        createAnim('punch', 'punch', 3, 15, 0);
        createAnim('flykick', 'flykick', 2, 10, 0);
        createAnim('punchUP', 'punchUP', 6, 15, 0);
        createAnim('jumpBack', 'jumpBack', 4, 10, 0);
        createAnim('doubleJump', 'doubleJump', 3, 12, 0);
        createAnim('loweredPunch', 'loweredPunch', 2, 10, 0);
        createAnim('wallPunch', 'wallPunch', 6, 15, 0);
        createAnim('lowered', 'lowered', 6);
        createAnim('tp', 'tp', 9, 24, 0);

        // === PLAYER: SEPARATE PHYSICS BODY FROM VISUAL ===
        // 1) Physics body: invisible rectangle, NEVER changes size
        this.playerBody = this.physics.add.sprite(100, 300, '__DEFAULT');
        this.playerBody.setVisible(false);
        this.playerBody.setBounce(0);
        this.playerBody.setCollideWorldBounds(true);
        this.playerBody.body.setSize(42, 72);
        this.playerBody.body.setOffset(0, 0); // Resetting offset as we increased size

        // 2) Visual sprite: NO physics, just follows the body
        this.playerVisual = this.add.sprite(100, 300, 'idle1');
        this.playerVisual.setScale(1.2);
        this.playerVisual.setOrigin(1, 1);
        this.physics.add.collider(this.playerBody, this.platforms);

        // Expose a convenience reference
        this.player = this.playerBody;

        // === INPUT ===
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        this.keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

        // WASD Support
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this.keyC.on('down', () => this.handleJump());
        this.keyX.on('down', () => this.handleAttack());
        this.keyZ.on('down', () => this.handleTeleport());
    }

    createNeonPlatform(x, y, w, h) {
        const key = `neonPlat_${x}_${y}`;
        const gfx = this.make.graphics({ add: false });
        gfx.fillStyle(0x0a0a2e, 1);
        gfx.fillRect(0, 0, w, h);
        gfx.fillStyle(0x00ffff, 1);
        gfx.fillRect(0, 0, w, 3);
        gfx.fillStyle(0xff00ff, 0.6);
        gfx.fillRect(0, h - 2, w, 2);
        gfx.generateTexture(key, w, h);
        gfx.destroy();
        this.platforms.create(x, y, key);
    }

    // === GROUND DETECTION (on the physics body) ===
    isOnGround() {
        return this.playerBody.body.blocked.down || this.playerBody.body.touching.down;
    }

    // === VISUAL HELPERS ===
    playAnim(key, ignoreIfPlaying = true) {
        this.playerVisual.play(key, ignoreIfPlaying);
    }

    setTex(key) {
        this.playerVisual.setTexture(key);
    }

    setFlip(flip) {
        this.playerVisual.setFlipX(flip);
    }

    // === GAME LOOP ===
    update() {
        if (this.isTeleporting) return;

        const isLateral = this.cursors.left.isDown || this.cursors.right.isDown || this.keyA.isDown || this.keyD.isDown;

        // Dynamic sync based on current origin
        const pBody = this.playerBody.body;
        const facingLeft = this.playerVisual.flipX;
        const originX = this.playerVisual.originX;

        if (originX === 0.5) {
            this.playerVisual.x = pBody.x + pBody.halfWidth;
        } else {
            this.playerVisual.x = facingLeft ? pBody.x : (pBody.x + pBody.width);
        }
        
        this.playerVisual.y = pBody.y + pBody.height; 


        const onGround = this.isOnGround();

        if (onGround) {
            this.canDoubleJump = true;
            this.isKickDown = false;

            if (this.isAttacking) {
                this.playerBody.setVelocityX(0);

                if (this.playerVisual.texture.key === 'diagKick') {
                    this.isAttacking = false;
                    if (isLateral) this.playAnim('walk');
                    else this.playAnim('idle');
                }
            }
        }
        if (this.isKickDown) {
            this.playerBody.setVelocityY(800);
            this.setTex('kickDown');
            return;
        }

        if (!this.isAttacking) {
            if (this.cursors.left.isDown) {
                this.playerBody.setVelocityX(-280);
                this.setFlip(true);
                if (onGround) this.playAnim('walk');
            } else if (this.cursors.right.isDown) {
                this.playerBody.setVelocityX(280);
                this.setFlip(false);
                if (onGround) this.playAnim('walk');
            } else {
                this.playerBody.setVelocityX(0);
                if (onGround) {
                    if (this.cursors.up.isDown || this.keyW.isDown) {
                        this.playAnim('waiting');
                    } else if (this.cursors.down.isDown || this.keyS.isDown) {
                        this.playAnim('lowered');
                        this.playerBody.body.setSize(42, 36);
                        this.playerBody.body.setOffset(0, 36);
                    } else {
                        this.playAnim('idle');
                        this.playerBody.body.setSize(42, 72);
                        this.playerBody.body.setOffset(0, 0);
                    }
                }
            }
        }

        // Air textures
        if (!onGround && !this.isAttacking && !this.isKickDown) {
            const vy = this.playerBody.body.velocity.y;
            if (vy < -50) this.setTex('jumpUP');
            else if (vy > 50) this.setTex('jumpDown');
            else this.setTex('jumpStay');
        }
    }

    // === JUMP ===
    handleJump() {
        const onGround = this.isOnGround();
        const facingLeft = this.playerVisual.flipX;
        const isMovingBack = (facingLeft && this.cursors.right.isDown) || (!facingLeft && this.cursors.left.isDown);

        if (onGround && isMovingBack) {
            this.playerBody.setVelocityY(-450);
            this.playerBody.setVelocityX(facingLeft ? 350 : -350);
            this.playAttack('jumpBack');
            return;
        }

        if (onGround) {
            this.playerBody.setVelocityY(-650);
        } else if (this.canDoubleJump) {
            this.playerBody.setVelocityY(-550);
            this.canDoubleJump = false;
            this.playAttack('doubleJump');
        }
    }

    // === ATTACK ===
    handleAttack() {
        if (this.isAttacking) return;

        const physicallyOnGround = this.playerBody.body.blocked.down || this.playerBody.body.touching.down;

        const isLeft = this.cursors.left.isDown || this.keyA.isDown;
        const isRight = this.cursors.right.isDown || this.keyD.isDown;
        const isDown = this.cursors.down.isDown || this.keyS.isDown;
        const isUp = this.cursors.up.isDown || this.keyW.isDown;

        const onWall = (this.playerBody.body.blocked.left || this.playerBody.body.blocked.right) && !physicallyOnGround;

        if (onWall) {
            this.playAttack('wallPunch');
            return;
        }

        if (!physicallyOnGround) {
            // Air logic
            if (isDown) {
                if (isLeft) { // Diag Left Kick
                    this.setFlip(true);
                    this.setTex('diagKick');
                    this.playerBody.setVelocity(-550, 550);
                    this.isAttacking = true;
                    this.time.delayedCall(500, () => { this.isAttacking = false; });
                    return;
                }
                if (isRight) { // Diag Right Kick
                    this.setFlip(false);
                    this.setTex('diagKick');
                    this.playerBody.setVelocity(550, 550);
                    this.isAttacking = true;
                    this.time.delayedCall(500, () => { this.isAttacking = false; });
                    return;
                }
                // Only Down = Vertical Kickdown
                this.isKickDown = true;
                return;
            }

            // Standard Fly Kick (Airborne, no Down held)
            if (isLeft) this.setFlip(true);
            else if (isRight) this.setFlip(false);
            this.playAttack('flykick');
        } else {
            // Ground logic
            if (isUp) this.playAttack('punchUP');
            else if (isDown) this.playAttack('loweredPunch');
            else this.playAttack('punch');
        }
    }

    playAttack(animKey) {
        this.isAttacking = true;
        
        // Custom origin for specific animations
        if (animKey === 'loweredPunch' || animKey === 'punch') {
            this.playerVisual.setOrigin(0.5, 1);
        } else {
            this.playerVisual.setOrigin(1, 1);
        }

        this.playAnim(animKey, false);
        this.playerVisual.once('animationcomplete', () => { 
            this.isAttacking = false; 
            // Reset to default origin
            this.playerVisual.setOrigin(1, 1);
        });
    }

    // === TELEPORT (BAMF!) ===
    handleTeleport() {
        if (this.isTeleporting) return;
        this.isTeleporting = true;
        this.playerBody.body.setAllowGravity(false);
        this.playerBody.setVelocity(0, 0);

        let dx = 0, dy = 0;
        if (this.cursors.left.isDown) dx = -this.teleportDist;
        else if (this.cursors.right.isDown) dx = this.teleportDist;
        if (this.cursors.up.isDown) dy = -this.teleportDist;
        else if (this.cursors.down.isDown) dy = this.teleportDist;
        if (dx === 0 && dy === 0) dx = this.playerVisual.flipX ? -this.teleportDist : this.teleportDist;

        this.playAnim('tp', false);

        this.time.delayedCall(150, () => {
            this.playerBody.x += dx;
            this.playerBody.y += dy;
            if (this.playerBody.x < 32) this.playerBody.x = 32;
            if (this.playerBody.x > 992) this.playerBody.x = 992;
        });

        this.playerVisual.once('animationcomplete', () => {
            this.playerBody.body.setAllowGravity(true);
            this.isTeleporting = false;
        });
    }
}
