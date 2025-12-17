import { loadOBJWithMTL } from '../webgl/objLoader.js';

export class Ship {
    constructor(gl) {
        this.gl = gl;

        this.modelParts = null;
        this.modelLoaded = false;
        this.modelUrl = 'assets/ship/ship.obj';
    
        this.loadModel();

        this.gridX = 0;
        this.gridZ = 0;
        this.gridSize = 1.0;

        this.baseSpeed = 0.12;
        this.currentSpeed = this.baseSpeed;
        this.speedMultiplier = 1.0;
        this.velocity = { x: 0, z: 0 };

        this.isMoving = false;
        this.currentLevel = 1;

        this.accelerationMultiplier = 1.0;
        this.maxAccelerationMultiplier = 1.40;
        this.accelerationRate = 0.3;
        this.decelerationRate = 2.0;

        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false
        };

        this.tilt = 0;
        this.maxTilt = Math.PI / 10; // ~18 graus
        this.tiltSpeed = 6.0;
        this.canShoot = true;
        this.shootCooldown = 0.3;
        this.shootTimer = 0;

        this.setupInput();
    }

    async loadModel() {
        try {
            const model = await loadOBJWithMTL(this.gl, this.modelUrl);
            this.modelParts = model.parts;
            this.modelLoaded = true;
        } catch (err) {
            console.error("Erro ao carregar modelo:", err);
            this.modelLoaded = false;
        }
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key === ' ' || key === 'space') {
                this.keys.space = true;
            } else if (key in this.keys) {
                this.keys[key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key === ' ' || key === 'space') {
                this.keys.space = false;
            } else if (key in this.keys) {
                this.keys[key] = false;
            }
        });
    }
    update(deltaTime) {
        this.isMoving = this.keys.w || this.keys.s || this.keys.a || this.keys.d;

        if (this.shootTimer > 0) {
            this.shootTimer -= deltaTime;
            if (this.shootTimer <= 0) {
                this.canShoot = true;
            }
        }

        this.currentSpeed =
            this.baseSpeed *
            this.speedMultiplier *
            this.accelerationMultiplier;

        this.velocity.x = 0;
        this.velocity.z = 0;

        if (this.keys.w) this.velocity.z += this.currentSpeed;
        if (this.keys.s) this.velocity.z -= this.currentSpeed;
        if (this.keys.a) this.velocity.x += this.currentSpeed;
        if (this.keys.d) this.velocity.x -= this.currentSpeed;

        this.gridX += this.velocity.x;
        this.gridZ += this.velocity.z;

        const maxRange = 10;
        this.gridX = Math.max(-maxRange, Math.min(maxRange, this.gridX));
        this.gridZ = Math.max(-maxRange, Math.min(maxRange, this.gridZ));

        let targetTilt = 0;
        if (this.currentSpeed > 0) {
            targetTilt =
                (-this.velocity.x / this.currentSpeed) * this.maxTilt;
        }

        this.tilt +=
            (targetTilt - this.tilt) *
            this.tiltSpeed *
            deltaTime;
    }

    updateLevel(level) {
        this.currentLevel = level;

        const levelTiers = Math.floor(level / 2);
        this.speedMultiplier = 1.0 + levelTiers * 0.25;
    }

    tryShoot() {
        if (this.canShoot && this.keys.space) {
            this.canShoot = false;
            this.shootTimer = this.shootCooldown;
            return true;
        }
        return false;
    }
    getCurrentSpeed() {
        return this.currentSpeed;
    }

    getSpeedPorcentagem() {
        return (this.speedMultiplier - 1.0) * 100;
    }

    getTotalSpeedMultiplier() {
        return this.speedMultiplier * this.accelerationMultiplier;
    }

    getSpeedMultiplier() {
        return this.speedMultiplier;
    }

    resetSpeed() {
        this.speedMultiplier = 1.0;
        this.currentLevel = 1;
        this.currentSpeed = this.baseSpeed;
        this.accelerationMultiplier = 1.0;
    }

    getPosition() {
        return [
            this.gridX * this.gridSize,
            0.4,
            this.gridZ * this.gridSize
        ];
    }

    getDirection() {
        return [0, 0, 1];
    }

    draw(programInfo, viewMatrix, projectionMatrix) {
        if (!this.modelLoaded || !this.modelParts || this.modelParts.length === 0) {
            return;
        }

        const position = this.getPosition();
        const scale = 1.5;

        let modelMatrix = m4.identity();
        modelMatrix = m4.scale(modelMatrix, scale, scale, scale);
        modelMatrix = m4.yRotate(modelMatrix, Math.PI / 2);
        modelMatrix = m4.zRotate(modelMatrix, this.tilt); // inclinação
        modelMatrix = m4.translate(
            modelMatrix,
            position[0],
            position[1],
            position[2]
        );

        this.drawOBJ(programInfo, viewMatrix, modelMatrix);
    }

    //brilho d nave
    drawOBJ(programInfo, viewMatrix, modelMatrix) {
        const gl = this.gl;
        if (!this.modelParts || !this.modelLoaded) return;

        const modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            new Float32Array(modelViewMatrix)
        );

        // brilho nave
        if (programInfo.uniformLocations.emissive) {
            gl.uniform1f(programInfo.uniformLocations.emissive, 0.3);
        }

        if (programInfo.uniformLocations.useTexture) {
            gl.uniform1i(programInfo.uniformLocations.useTexture, 1);
        }

        const positionLoc = programInfo.attribLocations.position || 
                           programInfo.attribLocations.vertexPosition;
        const normalLoc = programInfo.attribLocations.normal || 
                         programInfo.attribLocations.vertexNormal;
        const texcoordLoc = programInfo.attribLocations.textureCoord;

        for (const part of this.modelParts) {
            const {
                vertexBuffer,
                normalBuffer,
                texcoordBuffer,
                indexBuffer,
                indexCount,
                texture,
            } = part;

            if (positionLoc !== undefined && positionLoc !== -1) {
                gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
                gl.enableVertexAttribArray(positionLoc);
                gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
            }

            if (normalLoc !== undefined && normalLoc !== -1 && normalBuffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
                gl.enableVertexAttribArray(normalLoc);
                gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
            }

            if (texcoordLoc !== undefined && texcoordLoc !== -1 && texcoordBuffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
                gl.enableVertexAttribArray(texcoordLoc);
                gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

            if (texture && programInfo.uniformLocations.texture) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.uniform1i(programInfo.uniformLocations.texture, 0);
            }

            gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
        }

        // volta brilho 0
        if (programInfo.uniformLocations.emissive) {
            gl.uniform1f(programInfo.uniformLocations.emissive, 0.0);
        }
    }
}