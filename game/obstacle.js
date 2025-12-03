import { loadOBJWithMTL } from '../webgl/objLoader.js';

export class Asteroid {
    constructor(gl, x, z, speed) {
        this.gl = gl;

        this.x = x;
        this.y = 0.5; 
        this.z = z;

        this.speed = speed;
        this.velocityZ = -speed; 

        // aleatorizacao
        this.scale = 0.3 + Math.random() * 0.4; 
        this.rotationX = Math.random() * Math.PI * 2;
        this.rotationY = Math.random() * Math.PI * 2;
        this.rotationZ = Math.random() * Math.PI * 2;
        this.rotationSpeedX = (Math.random() - 0.5) * 2;
        this.rotationSpeedY = (Math.random() - 0.5) * 2;
        this.rotationSpeedZ = (Math.random() - 0.5) * 2;

        this.active = true;

        // importa obj
        this.modelParts = null;
        this.modelLoaded = false;
        this.modelUrl = 'assets/asteroid/scene.obj';

        this.loadModel();
    }

    async loadModel() {
        try {
            const model = await loadOBJWithMTL(this.gl, this.modelUrl);
            this.modelParts = model.parts;
            this.modelLoaded = true;
            console.log('asteroid.obj carregado');
        } catch (err) {
            this.modelLoaded = false;
        }
    }

    update(deltaTime) {
        // em direcao a camera +z
        this.z += this.velocityZ * deltaTime;

        this.rotationX += this.rotationSpeedX * deltaTime;
        this.rotationY += this.rotationSpeedY * deltaTime;
        this.rotationZ += this.rotationSpeedZ * deltaTime;

        // apaga se passar da camera em -15
        if (this.z < -15) {
            this.active = false;
        }
    }

    getPosition() {
        return [this.x, this.y, this.z];
    }

    getRadius() {
        return this.scale;
    }

    isActive() {
        return this.active;
    }

    isPassed(shipZ) {
        // se passou da nave
        return this.z < shipZ - 2;
    }

    checkCollision(shipPosition, shipRadius = 0.5) {
        const dx = this.x - shipPosition[0];
        const dy = this.y - shipPosition[1];
        const dz = this.z - shipPosition[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        return distance < (this.scale + shipRadius);
    }

    draw(programInfo, viewMatrix, projectionMatrix) {
        if (!this.modelLoaded || !this.modelParts || this.modelParts.length === 0) {
            return;
        }

        let modelMatrix = m4.identity();

        modelMatrix = m4.scale(
            modelMatrix,
            this.scale,
            this.scale,
            this.scale
        );

        modelMatrix = m4.xRotate(modelMatrix, this.rotationX);
        modelMatrix = m4.yRotate(modelMatrix, this.rotationY);
        modelMatrix = m4.zRotate(modelMatrix, this.rotationZ);

        modelMatrix = m4.translate(
            modelMatrix,
            this.x,
            this.y,
            this.z
        );

        this.drawOBJ(programInfo, viewMatrix, modelMatrix);
    }

    drawOBJ(programInfo, viewMatrix, modelMatrix) {
        const gl = this.gl;

        const positionLoc   = programInfo.attribLocations.vertexPosition;
        const texcoordLoc   = programInfo.attribLocations.textureCoord;
        const useTexLoc     = programInfo.uniformLocations.useTexture;
        const texSamplerLoc = programInfo.uniformLocations.texture;

        const modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            new Float32Array(modelViewMatrix)
        );

        if (useTexLoc) {
            gl.uniform1i(useTexLoc, 1);
        }

        for (const part of this.modelParts) {
            const {
                vertexBuffer,
                texcoordBuffer,
                indexBuffer,
                indexCount,
                texture,
            } = part;

            // Posição
            if (positionLoc !== undefined && positionLoc >= 0 && vertexBuffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
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
            if (texture && texSamplerLoc) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.uniform1i(texSamplerLoc, 0);
            }

            gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
        }

        if (useTexLoc) {
            gl.uniform1i(useTexLoc, 0);
        }
    }
}

export class AsteroidManager {
    constructor(gl, shipReference) {
        this.gl = gl;
        this.ship = shipReference;
        this.asteroids = [];
        
        // configuracoes de spawn de asteroide
        this.spawnTimer = 0;
        this.baseSpawnInterval = 0.8; 
        this.spawnInterval = this.baseSpawnInterval;
        this.spawnDistance = 15; 
        this.baseSpawnRangeX = 10; 
        this.spawnRangeX = this.baseSpawnRangeX;
        this.baseMinSpeed = 4;
        this.baseMaxSpeed = 7;
        this.minSpeed = this.baseMinSpeed;
        this.maxSpeed = this.baseMaxSpeed;
        
        this.gameTime = 0;
        this.difficultyLevel = 0;
        this.difficultyInterval = 10; 
        this.nextDifficultyTime = this.difficultyInterval;
        
        this.waveTimer = 0;
        this.waveInterval = 5;
        this.isWaveActive = false;
    }
    
    update(deltaTime) {
        this.gameTime += deltaTime;
        
        if (this.gameTime >= this.nextDifficultyTime) {
            this.aumentaDificuldade();
            this.nextDifficultyTime += this.difficultyInterval;
        }
        
        this.waveTimer += deltaTime;
        if (this.waveTimer >= this.waveInterval) {
            this.spawnWave();
            this.waveTimer = 0;
        }
        
        this.spawnTimer += deltaTime;
        
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnAsteroid();
            this.spawnTimer = 0;
        }
        
        const shipPos = this.ship.getPosition();
        let scoreGained = 0;
        
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            asteroid.update(deltaTime);
            
            // apaga asteroids desativados
            if (!asteroid.isActive()) {
                this.asteroids.splice(i, 1);
                continue;
            }
            
            // se passou ganha 10 pontos por asteroid
            if (asteroid.isPassed(shipPos[2]) && !asteroid.scored) {
                asteroid.scored = true;
                scoreGained += 10;
            }
            
            if (asteroid.checkCollision(shipPos)) {
                console.log('aconteceu colisao');
                this.asteroids.splice(i, 1);
                return { collision: true, position: asteroid.getPosition(), scoreGained: 0 };
            }
        }
        
        return { collision: false, scoreGained: scoreGained };
    }
    
    aumentaDificuldade() {
        this.difficultyLevel++;
        
        // aumenta spawn de asteroid
        this.spawnInterval = Math.max(0.3, this.baseSpawnInterval - (this.difficultyLevel * 0.08));
        
        // aumenta velocidade de asteroid
        this.minSpeed = this.baseMinSpeed + (this.difficultyLevel * 0.4);
        this.maxSpeed = this.baseMaxSpeed + (this.difficultyLevel * 0.6);
        
        this.spawnRangeX = this.baseSpawnRangeX + (this.difficultyLevel * 2);
        
        this.spawnDistance = 15 + (this.difficultyLevel * 0.3);
        
        console.log('subiu dificuldade');
    }
    
    spawnWave() {
        const waveSize = 2 + Math.floor(Math.random() * 3);
        const shipPos = this.ship.getPosition();
        
        for (let i = 0; i < waveSize; i++) {
            const spacing = 2.5;
            const offset = (i - waveSize / 2) * spacing;
            const x = shipPos[0] + offset + (Math.random() - 0.5) * 1;
            const z = shipPos[2] + this.spawnDistance + (Math.random() - 0.5) * 2;
            
            const speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
            const asteroid = new Asteroid(this.gl, x, z, speed);
            this.asteroids.push(asteroid);
        }
    }
    
    spawnAsteroid() {
        const shipPos = this.ship.getPosition();
        
        let x;
        const spawnInCorridor = Math.random() < 0.75;
        
        if (spawnInCorridor) {
            const corridorWidth = 5;
            x = shipPos[0] + (Math.random() - 0.5) * corridorWidth;
        } else {
            const sideOffset = 4 + Math.random() * (this.spawnRangeX - 4);
            x = shipPos[0] + (Math.random() < 0.5 ? -sideOffset : sideOffset);
        }
        
        const z = shipPos[2] + this.spawnDistance;
        const speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
        
        const asteroid = new Asteroid(this.gl, x, z, speed);
        this.asteroids.push(asteroid);
    }
    
    reset() {
        this.asteroids = [];
        this.spawnTimer = 0;
        this.waveTimer = 0;
        this.gameTime = 0;
        this.difficultyLevel = 0;
        this.nextDifficultyTime = this.difficultyInterval;
        this.spawnInterval = this.baseSpawnInterval;
        this.spawnRangeX = this.baseSpawnRangeX;
        this.minSpeed = this.baseMinSpeed;
        this.maxSpeed = this.baseMaxSpeed;
    }
    
    draw(programInfo, viewMatrix, projectionMatrix) {
        for (const asteroid of this.asteroids) {
            asteroid.draw(programInfo, viewMatrix, projectionMatrix);
        }
    }
    
    getAsteroidCount() {
        return this.asteroids.length;
    }
    
    getDifficultyLevel() {
        return this.difficultyLevel;
    }
    
    getGameTime() {
        return this.gameTime;
    }
}
