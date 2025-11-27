import { mat4 } from 'https://cdn.skypack.dev/gl-matrix';

export class Asteroid {
    constructor(gl, x, z, speed, model) {
        this.gl = gl;
        this.model = model;
        
        this.x = x;
        this.y = 0.5; 
        this.z = z;
        
        this.speed = speed;
        this.velocityZ = -speed; // -z em direcao a camera
        
        this.scale = 0.3 + Math.random() * 0.4; // tamanho aleatorio
        this.rotationX = Math.random() * Math.PI * 2;
        this.rotationY = Math.random() * Math.PI * 2;
        this.rotationZ = Math.random() * Math.PI * 2;
        this.rotationSpeedX = (Math.random() - 0.5) * 2;
        this.rotationSpeedY = (Math.random() - 0.5) * 2;
        this.rotationSpeedZ = (Math.random() - 0.5) * 2;
        
        this.active = true;
    }
    
    update(deltaTime) {
        this.z += this.velocityZ * deltaTime;
        
        this.rotationX += this.rotationSpeedX * deltaTime;
        this.rotationY += this.rotationSpeedY * deltaTime;
        this.rotationZ += this.rotationSpeedZ * deltaTime;
        
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
        // se passou a nave
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
        const modelMatrix = mat4.create();
        const modelViewMatrix = mat4.create();
        
        // Position
        mat4.translate(modelMatrix, modelMatrix, [this.x, this.y, this.z]);
        
        // Rotation
        mat4.rotateX(modelMatrix, modelMatrix, this.rotationX);
        mat4.rotateY(modelMatrix, modelMatrix, this.rotationY);
        mat4.rotateZ(modelMatrix, modelMatrix, this.rotationZ);
        
        // Scale
        mat4.scale(modelMatrix, modelMatrix, [this.scale, this.scale, this.scale]);
        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
        
        // Set uniforms
        this.gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix
        );
        
        const gl = this.gl;

        if (programInfo.attribLocations.position !== -1 && this.model.positionBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.model.positionBuffer);
            gl.vertexAttribPointer(
                programInfo.attribLocations.position,
                3,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.enableVertexAttribArray(programInfo.attribLocations.position);
        }

        if (programInfo.attribLocations.normal !== undefined &&
            programInfo.attribLocations.normal !== -1 &&
            this.model.normalBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.model.normalBuffer);
            gl.vertexAttribPointer(
                programInfo.attribLocations.normal,
                3,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.enableVertexAttribArray(programInfo.attribLocations.normal);
        }

        if (programInfo.attribLocations.texCoord !== undefined &&
            programInfo.attribLocations.texCoord !== -1) {
            gl.disableVertexAttribArray(programInfo.attribLocations.texCoord);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.model.indexBuffer);
        gl.drawElements(
            this.gl.TRIANGLES,
            this.model.indexCount,
            this.gl.UNSIGNED_SHORT,
            0
        );
    }
}

export class AsteroidManager {
    constructor(gl, shipReference, asteroidModel) {
        this.gl = gl;
        this.ship = shipReference;
        this.asteroids = [];
        this.asteroidModel = asteroidModel;
        
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
        let scoreGanho = 0;
        
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            asteroid.update(deltaTime);
            
            if (!asteroid.isActive()) {
                this.asteroids.splice(i, 1);
                continue;
            }
            
            // se asteroide passar a nave + 10 de score
            if (asteroid.isPassed(shipPos[2]) && !asteroid.scored) {
                asteroid.scored = true;
                scoreGanho += 10;
            }
            
            if (asteroid.checkCollision(shipPos)) {
                console.log('aconteceu colisao');
                this.asteroids.splice(i, 1);
                return { collision: true, position: asteroid.getPosition(), scoreGanho: 0 };
            }
        }
        
        return { collision: false, scoreGanho: scoreGanho };
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
            const asteroid = new Asteroid(this.gl, x, z, speed, this.asteroidModel);
            this.asteroids.push(asteroid);
        }
    }
    
    spawnAsteroid() {
        const shipPos = this.ship.getPosition();
        
        // 75% chance de spawnar perto direcao da nave (corredor central)
        // 25% chance de spawnar nas laterais (variação)
        let x;
        const spawnCorredor = Math.random() < 0.75;
        
        if (spawnCorredor) {
            const corridorWidth = 5; 
            x = shipPos[0] + (Math.random() - 0.5) * corridorWidth;
        } else {
            const sideOffset = 4 + Math.random() * (this.spawnRangeX - 4);
            x = shipPos[0] + (Math.random() < 0.5 ? -sideOffset : sideOffset);
        }
        
        const z = shipPos[2] + this.spawnDistance;
        
        // gera velocidade aleatoria
        const speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
        
        const asteroid = new Asteroid(this.gl, x, z, speed, this.asteroidModel);
        this.asteroids.push(asteroid);
    }
    
    reset() {
        //zera inicializa todas as var
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
