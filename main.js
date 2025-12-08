import { initWebGL, resizeCanvasToDisplaySize } from './webgl/initGL.js';
import { createShader, createProgram, loadShader } from './webgl/shaderUtils.js';
import { Camera } from './webgl/camera.js';
import { Ship } from './game/player.js';
import { World } from './game/world.js';
import { AsteroidManager } from './game/obstacle.js';
import { BossManager } from './game/boss.js';
import { Projectile } from './game/projectile.js';

// UI Imports
import { HUD } from './ui/hud.js';
import { GameOverScreen } from './ui/gameOver.js';

let gl;
let programInfo;
let ship;
let world;
let camera;
let asteroidManager;
let bossManager;
let projectiles = [];
let lastTime = 0;

let hud;
let gameOverScreen;

async function init() {
    const canvas = document.querySelector('#glCanvas');
    if (!canvas) return;

    gl = initWebGL(canvas);

    const vertexShaderSource = await loadShader('./shaders/vertex.glsl');
    const fragmentShaderSource = await loadShader('./shaders/fragment.glsl');

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);

    programInfo = {
        program: shaderProgram,
        attribLocations: {
            position:       gl.getAttribLocation(shaderProgram, 'aPosition'),
            color:          gl.getAttribLocation(shaderProgram, 'aColor'),
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            vertexColor:    gl.getAttribLocation(shaderProgram, 'aColor'),
            normal:         gl.getAttribLocation(shaderProgram, 'aNormal'),
            vertexNormal:   gl.getAttribLocation(shaderProgram, 'aNormal'),
            textureCoord:   gl.getAttribLocation(shaderProgram, 'aTexcoord'),
        },
        uniformLocations: {
            modelViewMatrix:  gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            texture:    gl.getUniformLocation(shaderProgram, 'uTexture'),
            uTexture:   gl.getUniformLocation(shaderProgram, 'uTexture'), 
            useTexture: gl.getUniformLocation(shaderProgram, 'uUseTexture'),
        },
    };

    ship = new Ship(gl);
    world = new World(gl, 2000);
    asteroidManager = new AsteroidManager(gl, ship);
    bossManager = new BossManager(gl, asteroidManager);
    projectiles = [];
    
    camera = new Camera();
    
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    camera.updateProjectionMatrix(gl.canvas.width / gl.canvas.height);

    window.addEventListener('keydown', (e) => {
        if (e.key === '1') camera.switchMode(0);
        else if (e.key === '2') camera.switchMode(1);
    });

    requestAnimationFrame(render);
}

function update(deltaTime) {
    if (gameOverScreen && gameOverScreen.isGameOverActive()) return;
    
    ship.update(deltaTime);
    
    if (ship.tryShoot()) {
        const shipPos = ship.getPosition();
        const projectile = new Projectile(gl, shipPos[0], shipPos[1], shipPos[2]);
        projectiles.push(projectile);
    }
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.update(deltaTime);
        
        if (!proj.isActive()) {
            projectiles.splice(i, 1);
            continue;
        }
        
        let hitAsteroid = false;
        for (const asteroid of asteroidManager.asteroids) {
            if (proj.verificaColisaoAsteroid(asteroid.getPosition(), asteroid.getRadius())) {
                proj.desativa();
                hitAsteroid = true;
                break;
            }
        }
        
        if (hitAsteroid) {
            projectiles.splice(i, 1);
            continue;
        }
        
        const bossHitResult = bossManager.verificaColisaoBoss(proj.getPosition(), proj.getRadius());
        if (bossHitResult.hit) {
            projectiles.splice(i, 1);
            if (hud) {
                if (bossHitResult.destroyed) hud.addScore(bossHitResult.scoreBonus);
                else hud.addScore(50);
            }
        }
    }
    
    updateSpeedIndicator();
    
    const collisionResult = asteroidManager.update(deltaTime);
    const currentLevel = asteroidManager.getDifficultyLevel() + 1;
    ship.updateLevel(currentLevel);
    
    const shipPosition = ship.getPosition();
    
    // Atualiza estrelas (sem movimento agora)
    world.update(deltaTime, shipPosition[2]);
    
    bossManager.update(deltaTime, currentLevel, shipPosition);
    
    if (hud) {
        hud.updateLevel(currentLevel);
        updateBossHealthBar();
    }
    
    if (collisionResult.scoreGained > 0 && hud) hud.addScore(collisionResult.scoreGained);
    
    if (collisionResult.collision && hud) {
        hud.loseLife();
        if (hud.isGameOver()) handleGameOver();
    }
    
    const shipDirection = ship.getDirection();
    camera.setShipTransform(shipPosition, shipDirection);
    camera.updateViewMatrix();
}

function handleGameOver() {
    const finalScore = hud.getScore();
    const finalLevel = asteroidManager.getDifficultyLevel() + 1;
    const gameTime = asteroidManager.getGameTime();
    gameOverScreen.show(finalScore, finalLevel, gameTime);
}

function updateSpeedIndicator() {
    const speedBoostPorcentagem = ship.getSpeedPorcentagem();
    const speedBarFill = document.getElementById('speed-bar-fill');
    const speedValue = document.getElementById('speed-value');
    
    if (speedBarFill && speedValue) {
        speedBarFill.style.width = speedBoostPorcentagem + '%';
        speedValue.textContent = '+' + speedBoostPorcentagem.toFixed(1) + '%';
        speedValue.style.color = '#00ff88'; 
    }
}

function updateBossHealthBar() {
    const bossHealthBar = document.getElementById('boss-health-bar');
    const bossHealthFill = document.getElementById('boss-health-fill');
    const bossHealthText = document.getElementById('boss-health-text');
    
    if (bossManager.isBossActive()) {
        const boss = bossManager.getBoss();
        const healthPercent = boss.getHealthPorcentagem();
        if (bossHealthBar) {
            bossHealthBar.style.display = 'flex';
            if (bossHealthFill) bossHealthFill.style.width = healthPercent + '%';
            if (bossHealthText) bossHealthText.textContent = `${boss.health}/${boss.maxHealth}`;
        }
    } else {
        if (bossHealthBar) bossHealthBar.style.display = 'none';
    }
}

function draw() {
    // ============================================
    // MUDANÇA AQUI: Voltamos para PRETO (0,0,0)
    // ============================================
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(programInfo.program);

    if (programInfo.uniformLocations.useTexture) {
        gl.uniform1i(programInfo.uniformLocations.useTexture, 0);
    }

    const projMatrix = camera.getProjectionMatrix();
    if (projMatrix) {
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projMatrix
        );
    }

    // Desenha as estrelas fixas
    world.draw(programInfo, camera.getViewMatrix(), camera.getProjectionMatrix());

    // Resto do jogo
    asteroidManager.draw(programInfo, camera.getViewMatrix(), camera.getProjectionMatrix());
    bossManager.draw(programInfo, camera.getViewMatrix(), camera.getProjectionMatrix());

    for (const proj of projectiles) {
        proj.draw(programInfo, camera.getViewMatrix(), camera.getProjectionMatrix());
    }

    ship.draw(programInfo, camera.getViewMatrix(), camera.getProjectionMatrix());
}

function render(timeAtual) {
    timeAtual *= 0.001;
    const deltaTime = timeAtual - lastTime;
    lastTime = timeAtual;

    if (resizeCanvasToDisplaySize(gl.canvas)) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        camera.updateProjectionMatrix(gl.canvas.width / gl.canvas.height);
    }

    update(deltaTime);
    draw();

    requestAnimationFrame(render);
}

function resetGame() {
    hud.reset();
    ship.gridX = 0;
    ship.gridZ = 0;
    ship.velocity = { x: 0, z: 0 };
    ship.resetSpeed();
    asteroidManager.reset();
    bossManager.reset();
    projectiles = [];
}

async function initGame() {
    await init();
    hud = new HUD();
    gameOverScreen = new GameOverScreen();
    gameOverScreen.onRestart(() => resetGame());
}

initGame().catch(console.error);