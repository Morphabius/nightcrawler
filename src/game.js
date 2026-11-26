import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.isAttacking = false;
        this.isTeleporting = false;
        this.canDoubleJump = true;
        this.teleportDist = 200;
        this.isKickDown = false;
        this.diagKickDir = 0;
        this.diagKickSpeed = 550;
        this.lastAirAttackTime = 0;
        this.intendedFlipX = false;
        this.attackId = 0;
        this.playerMaxHp = 100;
        this.playerHp = 100;
        this.isHurt = false;
        this.playerInvulnUntil = 0;
        this.bounceUntil = 0;
    }

    preload() {
        this.load.image('bg', 'assets/bg.png');

        const loadSet = (key, path, frames, prefix) => {
            for (let i = 1; i <= frames; i++) {
                this.load.image(`${key}${i}`, `assets/${path}/${prefix}${i}.png`);
            }
        };

        loadSet('idle', 'idle', 8, 'idle');
        loadSet('walk', 'walk', 6, 'walk');
        loadSet('lowered', 'lowered', 6, 'lowered');

        for (let i = 1; i <= 13; i++) {
            if (i === 7) continue;
            this.load.image(`waiting${i}`, `assets/waiting/waiting${i}.png`);
        }

        this.load.image('jumpUP', 'assets/jump/junpUP.png');
        this.load.image('jumpStay', 'assets/jump/junpStay.png');
        this.load.image('jumpDown', 'assets/jump/junpDown.png');

        loadSet('punch', 'punch', 3, 'punch');
        loadSet('flykick', 'flykick', 2, 'FlyKick');
        loadSet('punchUP', 'PunchUP', 6, 'PunchUP');
        loadSet('jumpBack', 'JumpBack', 4, 'JumpBack');
        loadSet('loweredPunch', 'loweredPunch', 2, 'loweredPunch');
        loadSet('wallPunch', 'WallPunch', 6, 'WallPunch');

        this.load.image('doubleJump1', 'assets/DoubleJump/1doubleJumpUP.png');
        this.load.image('doubleJump2', 'assets/DoubleJump/2rolling.png');
        this.load.image('doubleJump3', 'assets/DoubleJump/3doubleJumpDown.png');

        this.load.image('diagKickL', 'assets/DiagKicks/DiagKick_L.png');
        this.load.image('diagKickR', 'assets/DiagKicks/DiagKick_R.png');
        this.load.image('kickDown', 'assets/DownKick/KickDown.png');
        this.load.image('downKickBounce', 'assets/DownKick/DownKick_Bounce.png');
        loadSet('tp', 'teleport', 9, 'a');
        loadSet('wallgrab', 'wallgreb', 2, 'WallGrab');
        loadSet('climbing', 'climbing', 6, 'climbing');
        loadSet('climbDown', 'ClimbDown', 6, 'ClimbDown');
        loadSet('roofwalk', 'RoofWalk', 6, 'RoofWalk');
        loadSet('roofstay', 'RoofStay', 6, 'RoofStay');
        loadSet('crawling', 'crawling', 6, 'climbing');
        loadSet('damage', 'damage', 3, 'damage');

        // === ENEMIES: MUMMY ===
        this.load.image('mummyWalkSheet', 'assets/Enemies/Mummy/E1_Walking.png');
        this.load.image('mummyAttackSheet', 'assets/Enemies/Mummy/E1_Attack.png');
        this.load.image('mummyDeathSheet', 'assets/Enemies/Mummy/E1_death.png');

    }

    create() {
        this.bg = this.add.image(0, 0, 'bg')
            .setOrigin(0, 0)
            .setDisplaySize(this.scale.width, this.scale.height)
            .setScrollFactor(0);

        // === PLATFORMS ===
        this.platforms = this.physics.add.staticGroup();
        const floorHeight = 4;
        const floorY = this.scale.height - floorHeight / 2;
        this.floorTop = floorY - floorHeight / 2;
        this.createNeonPlatform(512, floorY, 1024, floorHeight); // Floor line
        this.physics.world.setBounds(0, 0, this.scale.width, this.floorTop);

        // Vertical Walls
        this.createNeonPlatform(20, 384, 40, 768);   // Left Wall
        this.createNeonPlatform(1004, 384, 40, 768); // Right Wall

        // Pillars and Small Platforms
        this.createNeonPlatform(300, 550, 150, 16);
        this.createNeonPlatform(724, 480, 150, 16);
        this.createNeonPlatform(512, 250, 60, 200);  // Central Hanging Pillar


        this.add.text(16, 16, 'NIGHTCRAWLER - BAMF!', {
            fontSize: '18px', fill: '#00ffff', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(20);

        this.playerHpBar = this.add.graphics().setScrollFactor(0).setDepth(20);
        this.playerHpText = this.add.text(16, 40, 'HP 100/100', {
            fontSize: '13px', fill: '#ffffff', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(21);
        this.drawPlayerHpBar();

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
        createAnim('wallgrab', 'wallgrab', 2, 8);
        createAnim('climbing', 'climbing', 6, 12);
        createAnim('climbDown', 'climbDown', 6, 12);
        createAnim('roofwalk', 'roofwalk', 6, 12);
        createAnim('roofstay', 'roofstay', 6, 10);
        createAnim('crawling', 'crawling', 6, 12);
        createAnim('damage', 'damage', 3, 10, 0);

        // === MUMMY SPRITE EXTRACTION (remove solid BG + align feet) ===
        this.createTransparentFrames('mummyWalkSheet', 'mummyWalk', [
            { x: 0, w: 37 },
            { x: 38, w: 34 },
            { x: 72, w: 33 },
            { x: 106, w: 35 },
            { x: 142, w: 36 }
        ], 64, 64, 44);

        this.createTransparentFrames('mummyAttackSheet', 'mummyAttack', [
            { x: 0, w: 33 },
            { x: 34, w: 29 },
            { x: 64, w: 31 },
            { x: 96, w: 39 },
            { x: 136, w: 41 }
        ], 64, 64, 44);

        this.createTransparentFrames('mummyDeathSheet', 'mummyDeath', [
            { x: 0, w: 43 },
            { x: 104, w: 40 },
            { x: 204, w: 39 },
            { x: 300, w: 42 },
            { x: 399, w: 42 }
        ], 64, 64, null, 60);

        createAnim('mummyWalk', 'mummyWalk', 5, 7, -1);
        createAnim('mummyAttack', 'mummyAttack', 5, 9, 0);
        createAnim('mummyDeath', 'mummyDeath', 5, 7, 0);
        this.anims.create({
            key: 'mummyRise',
            frames: [
                { key: 'mummyDeath5' },
                { key: 'mummyDeath4' },
                { key: 'mummyDeath3' },
                { key: 'mummyDeath2' },
                { key: 'mummyDeath1' }
            ],
            frameRate: 7,
            repeat: 0
        });


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
        this.playerVisual.setDepth(10);
        this.physics.add.collider(this.playerBody, this.platforms);

        // Expose a convenience reference
        this.player = this.playerBody;

        // === ENEMIES ===
        this.enemies = [];
        this.spawnMummy(760, this.floorTop, 120, 900);

        // === INPUT ===
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.keyD.on('down', () => this.handleJump());
        this.keyS.on('down', () => this.handleAttack());
        this.keyA.on('down', () => this.handleTeleport());
        this.keySpace.on('down', () => this.handleAttack());
    }

    createNeonPlatform(x, y, w, h) {
        const key = `neonPlat_${x}_${y}`;
        const gfx = this.make.graphics({ add: false });
        if (h <= 4) {
            gfx.fillStyle(0x00ffff, 1);
            gfx.fillRect(0, 0, w, Math.max(1, h - 1));
            if (h > 1) {
                gfx.fillStyle(0xff00ff, 0.6);
                gfx.fillRect(0, h - 1, w, 1);
            }
        } else {
            gfx.fillStyle(0x0a0a2e, 1);
            gfx.fillRect(0, 0, w, h);
            gfx.fillStyle(0x00ffff, 1);
            gfx.fillRect(0, 0, w, 3);
            gfx.fillStyle(0xff00ff, 0.6);
            gfx.fillRect(0, h - 2, w, 2);
        }
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
        if (this.playerVisual.anims && this.playerVisual.anims.isPlaying) {
            this.playerVisual.anims.stop();
        }
        this.playerVisual.setTexture(key);
    }

    setFlip(flip) {
        this.playerVisual.setFlipX(flip);
    }

    createTransparentFrames(sheetKey, prefix, frameRects, padW, padH, rightAnchorX = null, cropH = null) {
        const srcImg = this.textures.get(sheetKey).getSourceImage();
        const srcW = srcImg.width;
        const srcH = cropH ? Math.min(cropH, srcImg.height) : srcImg.height;

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = srcW;
        tmpCanvas.height = srcH;
        const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
        tmpCtx.drawImage(srcImg, 0, 0, srcW, srcH, 0, 0, srcW, srcH);

        const imgData = tmpCtx.getImageData(0, 0, srcW, srcH);
        const data = imgData.data;
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];
        const bgA = data[3];

        if (bgA > 10) {
            for (let i = 0; i < data.length; i += 4) {
                if (
                    Math.abs(data[i] - bgR) <= 4 &&
                    Math.abs(data[i + 1] - bgG) <= 4 &&
                    Math.abs(data[i + 2] - bgB) <= 4
                ) {
                    data[i + 3] = 0;
                }
            }
            tmpCtx.putImageData(imgData, 0, 0);
        }

        frameRects.forEach((rect, idx) => {
            const texKey = `${prefix}${idx + 1}`;
            if (this.textures.exists(texKey)) return;

            const canvasTex = this.textures.createCanvas(texKey, padW, padH);
            const ctx = canvasTex.getContext();
            ctx.imageSmoothingEnabled = false;
            const destX = rightAnchorX !== null
                ? rightAnchorX - rect.w
                : Math.floor((padW - rect.w) / 2);
            const destY = padH - srcH;
            ctx.drawImage(tmpCanvas, rect.x, 0, rect.w, srcH, destX, destY, rect.w, srcH);
            canvasTex.refresh();
        });
    }

    drawPlayerHpBar() {
        if (!this.playerHpBar) return;
        const barX = 16;
        const barY = 58;
        const barW = 160;
        const barH = 12;
        const ratio = Phaser.Math.Clamp(this.playerHp / this.playerMaxHp, 0, 1);

        this.playerHpBar.clear();
        this.playerHpBar.fillStyle(0x0a0a2e, 0.85);
        this.playerHpBar.fillRect(barX, barY, barW, barH);
        this.playerHpBar.fillStyle(ratio > 0.35 ? 0x00ffff : 0xff2a6d, 1);
        this.playerHpBar.fillRect(barX + 2, barY + 2, Math.round((barW - 4) * ratio), barH - 4);
        this.playerHpBar.lineStyle(1, 0x00ffff, 0.8);
        this.playerHpBar.strokeRect(barX, barY, barW, barH);

        if (this.playerHpText) {
            this.playerHpText.setText(`HP ${this.playerHp}/${this.playerMaxHp}`);
        }
    }

    spawnMummy(x, y, patrolMinX, patrolMaxX) {
        const sprite = this.physics.add.sprite(x, y, 'mummyWalk1');
        sprite.setScale(1.6);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(5);
        sprite.setBounce(0);
        sprite.setCollideWorldBounds(true);
        sprite.body.setSize(24, 46);
        sprite.body.setOffset(20, 18);
        this.physics.add.collider(sprite, this.platforms);

        sprite.play('mummyWalk');

        const hpBar = this.add.graphics().setDepth(9);

        const enemy = {
            sprite,
            hpBar,
            state: 'patrol',
            maxHp: 100,
            hp: 100,
            lastHitAttackId: -1,
            hurtUntil: 0,
            attackHitDone: false,
            respawnTimer: null,
            patrolDir: -1,
            patrolMinX,
            patrolMaxX,
            patrolSpeed: 70,
            chaseSpeed: 125,
            detectRange: 320,
            attackRange: 85,
            attackCooldownUntil: 0
        };
        this.enemies.push(enemy);
        return enemy;
    }

    drawEnemyHpBar(enemy) {
        enemy.hpBar.clear();
        if (enemy.state === 'dead' || enemy.state === 'rising') return;

        const body = enemy.sprite.body;
        if (!body) return;

        const barW = 48;
        const barH = 6;
        const barX = body.center.x - barW / 2;
        const barY = body.top - 14;
        const ratio = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1);

        enemy.hpBar.fillStyle(0x0a0a2e, 0.85);
        enemy.hpBar.fillRect(barX, barY, barW, barH);
        enemy.hpBar.fillStyle(0xff2a6d, 1);
        enemy.hpBar.fillRect(barX + 1, barY + 1, Math.round((barW - 2) * ratio), barH - 2);
        enemy.hpBar.lineStyle(1, 0xff88aa, 0.8);
        enemy.hpBar.strokeRect(barX, barY, barW, barH);
    }

    getPlayerAttackInfo() {
        const pBody = this.playerBody.body;
        const facingLeft = this.playerVisual.flipX;

        if (this.diagKickDir !== 0) {
            const x = this.diagKickDir < 0 ? pBody.left - 30 : pBody.left - 10;
            return {
                type: 'diagKick',
                damage: 50,
                rect: new Phaser.Geom.Rectangle(x, pBody.top, pBody.width + 40, pBody.height + 16)
            };
        }

        if (this.isKickDown) {
            return {
                type: 'kickDown',
                damage: 50,
                rect: new Phaser.Geom.Rectangle(pBody.left - 12, pBody.top + 10, pBody.width + 24, pBody.height + 24)
            };
        }

        const cAnim = (this.playerVisual.anims && this.playerVisual.anims.currentAnim)
            ? this.playerVisual.anims.currentAnim.key
            : null;
        if (!this.isAttacking || !cAnim) return null;

        if (cAnim === 'punchUP') {
            const x = facingLeft ? pBody.left - 30 : pBody.left - 10;
            return {
                type: cAnim,
                damage: 35,
                rect: new Phaser.Geom.Rectangle(x, pBody.top - 48, pBody.width + 40, pBody.height + 48)
            };
        }

        if (cAnim === 'punch' || cAnim === 'loweredPunch' || cAnim === 'flykick' || cAnim === 'wallPunch') {
            const reach = 54;
            const x = facingLeft ? pBody.left - reach : pBody.right - 10;
            return {
                type: cAnim,
                damage: 35,
                rect: new Phaser.Geom.Rectangle(x, pBody.top - 4, reach + 10, pBody.height + 8)
            };
        }

        return null;
    }

    damageEnemy(enemy, damage, attackType) {
        enemy.hp = Math.max(0, enemy.hp - damage);

        if (attackType === 'kickDown') {
            this.isKickDown = false;
            this.canDoubleJump = true;
            this.bounceUntil = this.time.now + 240;
            this.playerBody.setVelocityY(-440);
            this.setTex('downKickBounce');
        }

        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
            return;
        }

        const sprite = enemy.sprite;
        sprite.off('animationcomplete');
        enemy.state = 'hurt';
        enemy.hurtUntil = this.time.now + 200;
        enemy.attackHitDone = false;

        const knockDir = sprite.body.center.x >= this.playerBody.body.center.x ? 1 : -1;
        sprite.setVelocityX(knockDir * 170);
        sprite.setTint(0xff5555);
        this.time.delayedCall(150, () => {
            if (enemy.state !== 'dead') sprite.clearTint();
        });
    }

    killEnemy(enemy) {
        const sprite = enemy.sprite;
        enemy.state = 'dead';
        enemy.attackHitDone = false;
        sprite.off('animationcomplete');
        sprite.clearTint();
        sprite.setVelocity(0, 0);
        enemy.hpBar.clear();

        sprite.play('mummyDeath', false);
        sprite.once('animationcomplete', () => {
            if (enemy.state === 'dead') {
                sprite.setTexture('mummyDeath5');
            }
        });

        if (enemy.respawnTimer) enemy.respawnTimer.remove(false);
        enemy.respawnTimer = this.time.delayedCall(10s0s00, () => {
            enemy.respawnTimer = null;
            enemy.state = 'rising';
            sprite.setVelocity(0, 0);
            sprite.play('mummyRise', false);
            sprite.once('animationcomplete', () => {
                enemy.hp = enemy.maxHp;
                enemy.lastHitAttackId = -1;
                enemy.attackHitDone = false;
                enemy.attackCooldownUntil = this.time.now + 500;
                enemy.state = 'patrol';
                sprite.play('mummyWalk', true);
            });
        });
    }

    damagePlayer(amount, fromX) {
        if (this.isTeleporting || this.time.now < this.playerInvulnUntil || this.playerHp <= 0) return;

        this.playerVisual.off('animationcomplete');
        this.diagKickDir = 0;
        this.isKickDown = false;
        this.isAttacking = false;
        this.lastAirAttackTime = 0;
        this.bounceUntil = 0;

        this.playerHp = Math.max(0, this.playerHp - amount);
        this.drawPlayerHpBar();

        this.isHurt = true;
        this.playerInvulnUntil = this.time.now + 1000;

        const knockDir = this.playerBody.body.center.x >= fromX ? 1 : -1;
        this.playerBody.body.setAllowGravity(true);
        this.playerBody.setVelocity(knockDir * 240, -260);
        this.setFlip(knockDir < 0);
        this.playAnim('damage', false);

        this.time.delayedCall(280, () => {
            this.isHurt = false;
        });

        if (this.playerHp <= 0) {
            this.time.delayedCall(900, () => {
                this.playerHp = this.playerMaxHp;
                this.drawPlayerHpBar();
                this.isHurt = false;
                this.playerInvulnUntil = this.time.now + 1000;
                this.playerBody.setPosition(100, 300);
                this.playerBody.setVelocity(0, 0);
                this.playerBody.body.updateFromGameObject();
            });
        }
    }

    updateCombat() {
        const attackInfo = this.getPlayerAttackInfo();
        if (!attackInfo || !this.enemies) return;

        for (const enemy of this.enemies) {
            if (enemy.state === 'dead' || enemy.state === 'rising') continue;
            if (enemy.lastHitAttackId === this.attackId) continue;

            const eBody = enemy.sprite.body;
            if (!eBody) continue;

            const enemyRect = new Phaser.Geom.Rectangle(eBody.left, eBody.top, eBody.width, eBody.height);
            if (Phaser.Geom.Intersects.RectangleToRectangle(attackInfo.rect, enemyRect)) {
                enemy.lastHitAttackId = this.attackId;
                this.damageEnemy(enemy, attackInfo.damage, attackInfo.type);
            }
        }
    }

    updateEnemies() {
        if (!this.enemies || this.enemies.length === 0) return;

        const pBody = this.playerBody.body;
        const playerCenterX = pBody.center.x;
        const playerFeetY = pBody.bottom;
        const playerRect = new Phaser.Geom.Rectangle(pBody.left, pBody.top, pBody.width, pBody.height);

        for (const enemy of this.enemies) {
            const sprite = enemy.sprite;
            const body = sprite.body;
            if (!body) continue;

            this.drawEnemyHpBar(enemy);

            if (enemy.state === 'dead' || enemy.state === 'rising') {
                sprite.setVelocityX(0);
                continue;
            }

            if (enemy.state === 'hurt') {
                if (this.time.now >= enemy.hurtUntil) {
                    enemy.state = 'patrol';
                }
                continue;
            }

            const dx = playerCenterX - body.center.x;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(playerFeetY - body.bottom);

            if (enemy.state === 'attack') {
                sprite.setVelocityX(0);
                const curTex = sprite.texture ? sprite.texture.key : null;
                if (!enemy.attackHitDone && (curTex === 'mummyAttack4' || curTex === 'mummyAttack5')) {
                    const facingRight = sprite.flipX;
                    const reach = 52;
                    const hitX = facingRight ? body.right - 8 : body.left - reach;
                    const attackRect = new Phaser.Geom.Rectangle(hitX, body.top, reach + 8, body.height);
                    if (Phaser.Geom.Intersects.RectangleToRectangle(attackRect, playerRect)) {
                        enemy.attackHitDone = true;
                        this.damagePlayer(20, body.center.x);
                    }
                }
                continue;
            }

            // 1. Attack when close to the hero
            if (absDx <= enemy.attackRange && absDy <= 90) {
                if (absDx > 4) sprite.setFlipX(dx > 0);
                sprite.setVelocityX(0);

                if (this.time.now >= enemy.attackCooldownUntil) {
                    enemy.state = 'attack';
                    enemy.attackHitDone = false;
                    sprite.off('animationcomplete');
                    sprite.play('mummyAttack', false);
                    sprite.once('animationcomplete', () => {
                        if (enemy.state === 'attack') {
                            enemy.state = 'patrol';
                            enemy.attackHitDone = false;
                            enemy.attackCooldownUntil = this.time.now + 350;
                        }
                    });
                } else {
                    if (sprite.anims && sprite.anims.isPlaying) sprite.anims.stop();
                    sprite.setTexture('mummyWalk1');
                }
                continue;
            }

            // 2. Chase when hero is within detection range
            if (absDx <= enemy.detectRange && absDy <= 180) {
                enemy.state = 'chase';
                if (absDx > 20) {
                    const dir = dx > 0 ? 1 : -1;
                    enemy.patrolDir = dir;
                    sprite.setVelocityX(dir * enemy.chaseSpeed);
                    sprite.setFlipX(dir > 0);
                    sprite.play('mummyWalk', true);
                } else {
                    sprite.setVelocityX(0);
                    if (sprite.anims && sprite.anims.isPlaying) sprite.anims.stop();
                    sprite.setTexture('mummyWalk1');
                }
                continue;
            }

            // 3. Ground patrol
            enemy.state = 'patrol';
            if (body.blocked.left || body.center.x <= enemy.patrolMinX) {
                enemy.patrolDir = 1;
            } else if (body.blocked.right || body.center.x >= enemy.patrolMaxX) {
                enemy.patrolDir = -1;
            }
            sprite.setVelocityX(enemy.patrolDir * enemy.patrolSpeed);
            sprite.setFlipX(enemy.patrolDir > 0);
            sprite.play('mummyWalk', true);
        }
    }

    // === GAME LOOP ===
    update() {
        this.updateEnemies();

        if (this.time.now < this.playerInvulnUntil) {
            this.playerVisual.setAlpha(Math.floor(this.time.now / 70) % 2 === 0 ? 0.4 : 1);
        } else {
            this.playerVisual.setAlpha(1);
        }

        if (this.isTeleporting) return;

        if (this.isHurt) {
            const pBody = this.playerBody.body;
            this.playerVisual.setOrigin(0.5, 1);
            this.playerVisual.x = pBody.x + pBody.halfWidth;
            this.playerVisual.y = pBody.y + pBody.height;
            return;
        }

        this.updateCombat();

        // Reset angle by default (for normal walking/jumping)
        this.playerVisual.setAngle(0);

        const isL = this.cursors.left.isDown;
        const isR = this.cursors.right.isDown;
        const isD = this.cursors.down.isDown;
        const isU = this.cursors.up.isDown;

        // Update Direction Memory
        if (isL) this.intendedFlipX = true;
        else if (isR) this.intendedFlipX = false;

        const isLateral = isL || isR;

        const pBody = this.playerBody.body;
        const facingLeft = this.playerVisual.flipX;

        const onGround = this.isOnGround();
        const onWall = (pBody.blocked.left || pBody.blocked.right) && !onGround;
        let isGrabbing = false;
        let isRoofGrabbing = false;

        // Reset gravity every frame
        pBody.setAllowGravity(true);

        // 1. WALL LOGIC
        // Also keep gravity off during WallPunch attack
        const isWallPunching = this.isAttacking && (pBody.blocked.left || pBody.blocked.right) &&
            (this.playerVisual.anims && this.playerVisual.anims.currentAnim && this.playerVisual.anims.currentAnim.key === 'wallPunch');

        if ((onWall && !this.isAttacking) || isWallPunching) {
            const isPushing = (pBody.blocked.left && this.cursors.left.isDown) ||
                (pBody.blocked.right && this.cursors.right.isDown);

            // If wall punching, we stay stuck regardless of pushing keys for the duration
            if (isPushing || isWallPunching) {
                isGrabbing = true;
                pBody.setAllowGravity(false);
                this.playerBody.setVelocityY(0);
                this.setFlip(pBody.blocked.left); // Face the wall

                // FORCE CONTACT TO PREVENT FLICKERING (Stuck force)
                this.playerBody.setVelocityX(pBody.blocked.left ? -20 : 20);

                if (!isWallPunching) {
                    if (this.cursors.up.isDown) {
                        this.playerBody.setVelocityY(-160);
                        this.playAnim('climbing');
                    } else if (this.cursors.down.isDown) {
                        this.playerBody.setVelocityY(160);
                        this.playAnim('climbDown');
                    } else {
                        this.playerBody.setVelocityY(0); // Stop sliding!
                        this.playAnim('wallgrab');
                    }
                }
            }
        }

        // 2. ROOF LOGIC
        if (pBody.blocked.up && !this.isAttacking) {
            if (this.cursors.up.isDown) {
                isRoofGrabbing = true;
                pBody.setAllowGravity(false);
                this.playerBody.setVelocityY(-50); // Keep pushing up to stay stuck

                if (this.cursors.left.isDown) {
                    this.playerBody.setVelocityX(-160);
                    this.setFlip(true);
                    this.playAnim('roofwalk');
                } else if (this.cursors.right.isDown) {
                    this.playerBody.setVelocityX(160);
                    this.setFlip(false);
                    this.playAnim('roofwalk');
                } else {
                    this.playerBody.setVelocityX(0);
                    this.playAnim('roofstay');
                    // No angle/flip hack needed now with specific assets
                    this.setFlip(this.intendedFlipX);
                }
            }
        }

        if (onGround) {
            this.canDoubleJump = true;
            this.isKickDown = false;
            this.lastAirAttackTime = 0;

            if (this.diagKickDir !== 0) {
                this.diagKickDir = 0;
                this.isAttacking = false;
                this.playerBody.setVelocityX(0);
                this.setFlip(this.intendedFlipX);
                if (isLateral) this.playAnim('walk');
                else this.playAnim('idle');
            } else if (this.isAttacking) {
                this.playerBody.setVelocityX(0);
            }
        } else if (
            this.diagKickDir === 0 &&
            this.lastAirAttackTime > 0 &&
            (this.time.now - this.lastAirAttackTime) <= 200 &&
            isD && (isL !== isR)
        ) {
            this.startDiagKick(isL ? -1 : 1);
        }
        if (this.diagKickDir !== 0) {
            const hitWall = (this.diagKickDir < 0 && pBody.blocked.left) ||
                (this.diagKickDir > 0 && pBody.blocked.right);
            if (hitWall) {
                this.diagKickDir = 0;
                this.isAttacking = false;
                this.setFlip(this.intendedFlipX);
            } else {
                pBody.setAllowGravity(false);
                // Constant acceleration matching KickDown, keeping 45° diagonal trajectory
                this.diagKickSpeed = Math.min(this.diagKickSpeed + 40, 1600);
                this.playerBody.setVelocity(this.diagKickDir * this.diagKickSpeed, this.diagKickSpeed);
                this.setFlip(false);
                this.setTex(this.diagKickDir < 0 ? 'diagKickL' : 'diagKickR');
            }
        } else if (this.isKickDown) {
            // Constant acceleration: Increase downward velocity every frame
            const newVy = Math.min(this.playerBody.body.velocity.y + 40, 1600);
            this.playerBody.setVelocityY(newVy);
            this.setTex('kickDown');
        } else if (!this.isAttacking && !isGrabbing && !isRoofGrabbing) {
            const isDown = isD;
            const isLeft = isL;
            const isRight = isR;

            if (onGround && isDown && (isLeft || isRight)) {
                // CRAWLING LOGIC
                const speed = 150;
                if (isLeft) {
                    this.playerBody.setVelocityX(-speed);
                    this.setFlip(true);
                } else {
                    this.playerBody.setVelocityX(speed);
                    this.setFlip(false);
                }
                this.playAnim('crawling');
                this.playerBody.body.setSize(42, 36);
                this.playerBody.body.setOffset(0, 36);
            } else if (isLeft) {
                this.playerBody.setVelocityX(-280);
                this.setFlip(true);
                if (onGround) this.playAnim('walk');
            } else if (isRight) {
                this.playerBody.setVelocityX(280);
                this.setFlip(false);
                if (onGround) this.playAnim('walk');
            } else {
                this.playerBody.setVelocityX(0);
                if (onGround) {
                    if (this.cursors.up.isDown) {
                        this.playAnim('waiting');
                    } else if (isDown) {
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

        if (!onGround && !this.isAttacking && !this.isKickDown && this.diagKickDir === 0 && !isGrabbing && !isRoofGrabbing) {
            if (this.time.now < this.bounceUntil) {
                this.setTex('downKickBounce');
            } else {
                const vy = this.playerBody.body.velocity.y;
                if (vy < -150) this.setTex('jumpUP');
                else if (vy > 150) this.setTex('jumpDown');
                else this.setTex('jumpStay');
            }
        }

        // === FINAL VISUAL SYNC ===
        const fLeft = this.playerVisual.flipX;
        let tOriginX = fLeft ? 0 : 1;
        const cAnim = (this.playerVisual.anims && this.playerVisual.anims.currentAnim) ? this.playerVisual.anims.currentAnim.key : null;
        const cTex = this.playerVisual.texture.key;

        if (cAnim === 'loweredPunch' || cAnim === 'punch' || cAnim === 'idle' ||
            cTex === 'diagKickL' || cTex === 'diagKickR' || cTex === 'kickDown' || cTex === 'downKickBounce') {
            tOriginX = 0.5;
        }

        this.playerVisual.setOrigin(tOriginX, 1);

        if (tOriginX === 0.5) {
            this.playerVisual.x = pBody.x + pBody.halfWidth;
        } else {
            this.playerVisual.x = fLeft ? pBody.x : (pBody.x + pBody.width);
            if (cAnim === 'waiting') {
                const shift = 10;
                this.playerVisual.x += fLeft ? -shift : shift;
            }
        }

        // Vertical sync: Feet on ground OR Top-cling on ceiling
        if (isRoofGrabbing) {
            this.playerVisual.y = pBody.y;
            this.playerVisual.setOrigin(tOriginX, 0); // Anchor at the top when on ceiling
        } else {
            this.playerVisual.y = pBody.y + pBody.height;
            this.playerVisual.setOrigin(tOriginX, 1); // Anchor at the bottom normally
        }
    }

    // === JUMP ===
    handleJump() {
        if (this.isHurt || this.playerHp <= 0) return;
        this.bounceUntil = 0;
        const onGround = this.isOnGround();
        const pBody = this.playerBody.body;
        const facingLeft = this.playerVisual.flipX;
        const onWall = (pBody.blocked.left || pBody.blocked.right) && !onGround;

        const isMovingBack = (facingLeft && this.cursors.right.isDown) ||
            (!facingLeft && this.cursors.left.isDown);

        // 1. JumpBack from Ground OR Wall
        if ((onGround || onWall) && isMovingBack) {
            this.playerBody.setVelocityY(-550);
            this.playerBody.setVelocityX(facingLeft ? 400 : -400);
            this.playAttack('jumpBack');
            if (onWall) this.canDoubleJump = true; // Allow mid-air jump after wall JumpBack
            return;
        }

        if (onGround) {
            this.playerBody.setVelocityY(-650);
        } else if (this.canDoubleJump) {
            this.diagKickDir = 0;
            this.isKickDown = false;
            this.lastAirAttackTime = 0;
            this.setFlip(this.intendedFlipX);
            this.playerBody.setVelocityY(-550);
            this.canDoubleJump = false;
            this.playAttack('doubleJump');
        }
    }

    startDiagKick(dir) {
        this.playerVisual.off('animationcomplete');
        this.attackId++;
        this.bounceUntil = 0;
        this.isKickDown = false;
        this.isAttacking = true;
        this.lastAirAttackTime = 0;
        this.diagKickDir = dir;
        this.diagKickSpeed = 550;
        this.intendedFlipX = dir < 0;
        this.setFlip(false);
        this.setTex(dir < 0 ? 'diagKickL' : 'diagKickR');
        this.playerBody.setVelocity(dir * this.diagKickSpeed, this.diagKickSpeed);
    }

    // === ATTACK ===
    handleAttack() {
        if (this.isHurt || this.playerHp <= 0) return;
        const currentAnim = this.playerVisual.anims && this.playerVisual.anims.currentAnim
            ? this.playerVisual.anims.currentAnim.key
            : null;
        const isJumpAnim = this.isAttacking && this.playerVisual.anims && this.playerVisual.anims.isPlaying &&
            (currentAnim === 'doubleJump' || currentAnim === 'jumpBack');
        if ((this.isAttacking && !isJumpAnim) || this.isKickDown || this.diagKickDir !== 0) return;

        const physicallyOnGround = this.playerBody.body.blocked.down || this.playerBody.body.touching.down;

        const isLeft = this.cursors.left.isDown;
        const isRight = this.cursors.right.isDown;
        const isDown = this.cursors.down.isDown;
        const isUp = this.cursors.up.isDown;

        const onWall = (this.playerBody.body.blocked.left || this.playerBody.body.blocked.right) && !physicallyOnGround;


        if (!physicallyOnGround) {
            this.lastAirAttackTime = this.time.now;

            // Priority 1: Diagonal Kick (Down + Left or Down + Right)
            const dDown = this.cursors.down.isDown;
            const dLeft = this.cursors.left.isDown;
            const dRight = this.cursors.right.isDown;

            if (dDown && (dLeft !== dRight)) {
                this.startDiagKick(dLeft ? -1 : 1);
                return;
            }

            // Priority 2: Kickdown (Down + Attack)
            if (dDown) {
                this.playerVisual.off('animationcomplete');
                this.attackId++;
                this.bounceUntil = 0;
                this.isAttacking = false;
                this.isKickDown = true;
                return;
            }

            // Priority 3: Wall Punch (Facing wall in air)
            if (onWall) {
                this.playAttack('wallPunch');
                return;
            }

            // Priority 4: Basic Flykick
            this.setFlip(isLeft);
            this.playAttack('flykick');
        } else {
            // Ground logic (standing/crouched)
            if (isUp) this.playAttack('punchUP');
            else if (isDown) this.playAttack('loweredPunch');
            else this.playAttack('punch');
        }
    }

    playAttack(animKey) {
        this.playerVisual.off('animationcomplete');
        this.attackId++;
        this.bounceUntil = 0;
        this.isAttacking = true;
        this.playAnim(animKey, false);
        this.playerVisual.once('animationcomplete', () => {
            this.isAttacking = false;
        });
    }

    // === TELEPORT (BAMF!) ===
    handleTeleport() {
        if (this.isTeleporting || this.isHurt || this.playerHp <= 0) return;
        this.playerVisual.off('animationcomplete');
        this.diagKickDir = 0;
        this.isKickDown = false;
        this.lastAirAttackTime = 0;
        this.bounceUntil = 0;
        this.isAttacking = false;
        this.setFlip(this.intendedFlipX);
        this.isTeleporting = true;
        this.playerBody.body.setAllowGravity(false);
        this.playerBody.setVelocity(0, 0);

        let dx = 0, dy = 0;
        const isL = this.cursors.left.isDown;
        const isR = this.cursors.right.isDown;
        const isU = this.cursors.up.isDown;
        const isD = this.cursors.down.isDown;

        if (isL) dx = -this.teleportDist;
        else if (isR) dx = this.teleportDist;
        if (isU) dy = -this.teleportDist;
        else if (isD) dy = this.teleportDist;
        if (dx === 0 && dy === 0) dx = this.playerVisual.flipX ? -this.teleportDist : this.teleportDist;

        this.playAnim('tp', false);

        this.time.delayedCall(150, () => {
            const pBody = this.playerBody.body;
            const bottomOffset = (pBody.offset.y - this.playerBody.displayOriginY) + pBody.height;
            const topOffset = pBody.offset.y - this.playerBody.displayOriginY;
            const maxY = this.floorTop - bottomOffset;
            const minY = Math.max(-topOffset, this.playerBody.displayOriginY);

            this.playerBody.x = Phaser.Math.Clamp(this.playerBody.x + dx, 32, 992);
            this.playerBody.y = Phaser.Math.Clamp(this.playerBody.y + dy, minY, maxY);
            pBody.updateFromGameObject();
        });

        this.playerVisual.once('animationcomplete', () => {
            this.playerBody.body.setAllowGravity(true);
            this.isTeleporting = false;
        });
    }
}
