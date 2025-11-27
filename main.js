import { initWebGL, resizeCanvasToDisplaySize } from './webgl/initGL.js';
import { createShader, createProgram, loadShader } from './webgl/shaderUtils.js';
import { loadOBJModel } from './webgl/objLoader.js';
import { loadTexture } from './webgl/textureLoader.js';
import { Camera } from './webgl/camera.js';
import { Ship } from './game/player.js';
import { World } from './game/world.js';
import { AsteroidManager } from './game/obstacle.js';
import { HUD } from './ui/hud.js';

let gl;
let programInfo;
let ship;
let world;
let camera;
let asteroidManager;
let hud;

// 1 = terceira pessoa, 2 = primeira
let cameraModeIndex = 0;

let time = 0;

async function init() {
    const canvas = document.querySelector('#glCanvas');
    gl = initWebGL(canvas);

    const vertexShaderSource = await loadShader('./shaders/vertex.glsl');
    const fragmentShaderSource = await loadShader('./shaders/fragment.glsl');

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);

    programInfo = {
        program: shaderProgram,
        attribLocations: {
            position: gl.getAttribLocation(shaderProgram, 'aPosition'),
            color: gl.getAttribLocation(shaderProgram, 'aColor'),
            normal: gl.getAttribLocation(shaderProgram, 'aNormal'),
            texCoord: gl.getAttribLocation(shaderProgram, 'aTexCoord'),
        },
        uniformLocations: {
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            textureSampler: gl.getUniformLocation(shaderProgram, 'uTexture'),
            useTexture: gl.getUniformLocation(shaderProgram, 'uUseTexture'),
        },
    };

    const [shipModel, asteroidModel] = await Promise.all([
        loadOBJModel(gl, './models/playership.obj'),
        loadOBJModel(gl, './models/asteroid01.obj'),
    ]);

    const shipTexture = loadTexture(gl, './textures/playership.png');

    ship = new Ship(gl, shipModel, shipTexture);
    world = new World(gl, 20);
    asteroidManager = new AsteroidManager(gl, ship, asteroidModel);

    camera = new Camera();
    camera.updateProjectionMatrix(gl.canvas.width / gl.canvas.height);

    console.log('posicao da nave', ship.getPosition());

    window.addEventListener('keydown', (e) => {
        if (e.key === '1') {
            cameraModeIndex = 0;
            camera.switchMode(0);
        } else if (e.key === '2') {
            cameraModeIndex = 1;
            camera.switchMode(1);
        }
    });

    requestAnimationFrame(render);
}

function update(deltaTime) {
    ship.update(deltaTime);
    asteroidManager.update(deltaTime);

    const shipPosition = ship.getPosition();
    const shipDirection = ship.getDirection();
    camera.setShipTransform(shipPosition, shipDirection);
    camera.updateViewMatrix();
}

function draw() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        camera.getProjectionMatrix()
    );

    const viewMatrix = camera.getViewMatrix();
    const projectionMatrix = camera.getProjectionMatrix();

    if (programInfo.uniformLocations.useTexture) {
        gl.uniform1i(programInfo.uniformLocations.useTexture, 0);
    }

    world.draw(programInfo, viewMatrix, projectionMatrix);
    asteroidManager.draw(programInfo, viewMatrix, projectionMatrix);
    ship.draw(programInfo, viewMatrix, projectionMatrix);
}

function render(currentTime) {
    currentTime *= 0.001;
    const deltaTime = currentTime - time;
    time = currentTime;

    if (resizeCanvasToDisplaySize(gl.canvas)) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        camera.updateProjectionMatrix(gl.canvas.width / gl.canvas.height);
    }

    update(deltaTime);
    draw();

    requestAnimationFrame(render);
}

async function initGame() {
    await init();
    hud = new HUD();
}

initGame().catch(console.error);
