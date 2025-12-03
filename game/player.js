import { loadOBJWithMTL } from '../webgl/objLoader.js';

export class Ship {
    constructor(gl) {
        this.gl = gl;
        
        // .obj da nave
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
        
        // projetil
        this.canShoot = true;
        this.shootCooldown = 0.3;
        this.shootTimer = 0;
        
        this.setupInput();
    }

    //==================
    //  CARREGADNO OBJ
    //==================

    async loadModel() {
        try {
            const model = await loadOBJWithMTL(this.gl, this.modelUrl);
            this.modelParts = model.parts;
            this.modelLoaded = true;
        } catch (err) {
            this.modelLoaded = false;
        }
    }

    //==================
    //    CONTROLES
    //==================

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
        
        // cooldown
        if (this.shootTimer > 0) {
            this.shootTimer -= deltaTime;
            if (this.shootTimer <= 0) {
                this.canShoot = true;
            }
        }

        // aumenta velocidade pelo nivel
        this.currentSpeed = this.baseSpeed * this.speedMultiplier * this.accelerationMultiplier;
        
        this.velocity.x = 0;
        this.velocity.z = 0;
        
        if (this.keys.w) {
            this.velocity.z += this.currentSpeed;// frente
        }
        if (this.keys.s) {
            this.velocity.z -= this.currentSpeed; // tras
        }
        if (this.keys.a) {
            this.velocity.x += this.currentSpeed; // direito
        }
        if (this.keys.d) {
            this.velocity.x -= this.currentSpeed; // esquerdo
        }
        
        // atualiza posicao
        this.gridX += this.velocity.x;
        this.gridZ += this.velocity.z;
        
        const maxRange = 10;
        this.gridX = Math.max(-maxRange, Math.min(maxRange, this.gridX));
        this.gridZ = Math.max(-maxRange, Math.min(maxRange, this.gridZ));
    }
    
    updateLevel(level) {
        this.currentLevel = level;
        
        // aumenta a velocidade em 25% a cada 2 niveis
        const levelTiers = Math.floor(level / 2);
        this.speedMultiplier = 1.0 + (levelTiers * 0.25);
    }
    
    tryShoot() {
        if (this.canShoot && this.keys.space) {
            this.canShoot = false;
            this.shootTimer = this.shootCooldown;
            return true;
        }
        //ainda nao deu tempo de cooldown
        return false;
    }
    
    getCurrentSpeed() {
        return this.currentSpeed;
    }
    
    getSpeedPorcentagem() {
        // velocidade em porcentagem
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
            0.4, // um pouco a cima do chao
            this.gridZ * this.gridSize
        ];
    }
    
    getDirection() {
        // aponta para frente +z
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
        modelMatrix = m4.translate(modelMatrix, position[0], position[1], position[2]);

        this.drawOBJ(programInfo, viewMatrix, modelMatrix);
    }

    drawOBJ(programInfo, viewMatrix, modelMatrix) {
        const gl = this.gl;
        if (!this.modelParts || !this.modelLoaded) return;

        const modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            new Float32Array(modelViewMatrix)
        );

        if (programInfo.uniformLocations.useTexture) {
            gl.uniform1i(programInfo.uniformLocations.useTexture, 1);
        }

        const positionLoc = programInfo.attribLocations.vertexPosition;
        const texcoordLoc = programInfo.attribLocations.textureCoord;

        for (const part of this.modelParts) {
            const {
                vertexBuffer,
                texcoordBuffer,
                indexBuffer,
                indexCount,
                texture,
            } = part;

            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            if (positionLoc !== undefined && positionLoc >= 0) {
                gl.enableVertexAttribArray(positionLoc);
                gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
            }

            // Coordenadas de textura
            if (texcoordLoc !== undefined && texcoordLoc >= 0 && texcoordBuffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
                gl.enableVertexAttribArray(texcoordLoc);
                gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
            }

            // Índices
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

            // Textura da parte
            if (texture && programInfo.uniformLocations.texture) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.uniform1i(programInfo.uniformLocations.texture, 0);
            }

            gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
        }
    }
}
