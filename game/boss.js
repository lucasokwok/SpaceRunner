import { loadOBJWithMTL } from '../webgl/objLoader.js';

export class Boss {
    constructor(gl) {
        this.gl = gl;
        
        // vida
        this.maxHealth = 10;
        this.health = this.maxHealth;
        this.isActive = false;
        this.isDerrotado = false;
        
        this.baseDistance = 25; // distancia do jogador
        this.x = 0;
        this.y = 1.5; // altura
        this.z = 0;
        
        this.scale = 1.5; // mudar aqui o tamanho
        
        this.oscillation = 0;
        this.oscillationSpeed = 1.5;
        this.oscillationAmount = 0.3;

        // modelo .OBJ do boss
        this.modelParts = null;     
        this.modelLoaded = false;    
        this.modelUrl = 'assets/boss/scene.obj';

        this.loadModel();
    }

    async loadModel() {
        try {
            const model = await loadOBJWithMTL(this.gl, this.modelUrl);
            this.modelParts = model.parts;
            this.modelLoaded = true;
        } catch (err) {
            this.modelLoaded = false;
        }
    }

    activate(playerZ) {
        this.isActive = true;
        this.isDerrotado = false;
        this.health = this.maxHealth;
        this.z = playerZ + this.baseDistance;
    }
    
    desativa() {
        this.isActive = false;
    }
    
    takeDamage(damage = 1) {
        if (!this.isActive || this.isDerrotado) return false;
        
        this.health -= damage;
        
        if (this.health <= 0) {
            this.derrotar();
            return true; // boss morreu
        }
        
        return false; 
    }
    
    derrotar() {
        this.isDerrotado = true;
    }
    
    update(deltaTime, playerPos) {
        if (!this.isActive) return;
        
        // oscilação vertical suave
        this.oscillation += deltaTime * this.oscillationSpeed;
        
        // boss sempre alinhado com o player
        this.x = playerPos[0];
        this.z = playerPos[2] + this.baseDistance;
        
        this.y = 1.5 + Math.sin(this.oscillation) * this.oscillationAmount;
    }
    
    getPosition() {
        return [this.x, this.y, this.z];
    }
    
    getRadius() {
        return this.scale * 1.5; // raio de colisao
    }
    
    isActiveBoss() {
        return this.isActive && !this.isDerrotado;
    }
    
    getHealthPorcentagem() {
        return (this.health / this.maxHealth) * 100;
    }
    
    draw(programInfo, viewMatrix, projectionMatrix) {
        if (!this.isActive) return;

        if (this.modelLoaded && this.modelParts && this.modelParts.length > 0) {
            this.drawOBJ(programInfo, viewMatrix);
        }
    }

    // desenha o boss importado de scene.obj com textura 
    drawOBJ(programInfo, viewMatrix) {
        const gl = this.gl;
        if (!this.modelParts || !this.modelLoaded) return;

        const positionLoc   = programInfo.attribLocations.vertexPosition;
        const texcoordLoc   = programInfo.attribLocations.textureCoord;
        const useTexLoc     = programInfo.uniformLocations.useTexture;
        const texSamplerLoc = programInfo.uniformLocations.texture;

        let modelMatrix = m4.identity();

        modelMatrix = m4.scale(
            modelMatrix,
            this.scale,
            this.scale,
            this.scale
        );

        // corrige orientacao
        modelMatrix = m4.yRotate(
            modelMatrix,
            Math.PI
        );

        modelMatrix = m4.translate(
            modelMatrix,
            this.x,
            this.y,
            this.z
        );

        const modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            new Float32Array(modelViewMatrix)
        );

        // ativa uso de textura para o boss
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

            // posição
            if (positionLoc !== undefined && positionLoc >= 0 && vertexBuffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
                gl.enableVertexAttribArray(positionLoc);
                gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
            }

            // coordenadas de textura
            if (texcoordLoc !== undefined && texcoordLoc >= 0 && texcoordBuffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
                gl.enableVertexAttribArray(texcoordLoc);
                gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
            }

            // índices
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

            // textura de cada parte
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

export class BossManager {
    constructor(gl, asteroidManager) {
        this.gl = gl;
        this.asteroidManager = asteroidManager;
        this.boss = new Boss(gl);
        
        // configuração de nível em que o boss aparece
        this.bossLevel = 10; 
        this.bossLevel = 1; // PARA TESTES
        this.nextBossLevel = this.bossLevel;
        this.bossActive = false;
    }
    
    update(deltaTime, currentLevel, playerPos) {
        // verifica se nível de boss foi atingido
        if (currentLevel >= this.nextBossLevel && !this.bossActive && !this.boss.isActiveBoss()) {
            this.activateBoss(playerPos);
        }
        
        if (this.boss.isActiveBoss()) {
            this.boss.update(deltaTime, playerPos);
        }
    }
    
    activateBoss(playerPos) {
        this.bossActive = true;
        this.boss.activate(playerPos[2]);
        
        // diminui spawn de asteroides durante a luta
        this.asteroidManager.spawnInterval *= 1.5;
    }
    
    verificaColisaoBoss(projectilePos, projectileRadius) {
        if (!this.boss.isActiveBoss()) return { hit: false };
        
        const bossPos = this.boss.getPosition();
        const bossRadius = this.boss.getRadius();
        
        const dx = projectilePos[0] - bossPos[0];
        const dy = projectilePos[1] - bossPos[1];
        const dz = projectilePos[2] - bossPos[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < (projectileRadius + bossRadius)) {
            const derrotared = this.boss.takeDamage(1);
            if (derrotared) {
                const result = this.onBossderrotado();
                return { hit: true, derrotared: true, scoreBonus: result.scoreBonus };
            }
            return { hit: true, derrotared: false };
        }
        
        return { hit: false };
    }
    
    onBossderrotado() {
        this.bossActive = false;
        this.nextBossLevel += this.bossLevel;
        
        // restaura taxa de spawn dos asteroides
        this.asteroidManager.spawnInterval = this.asteroidManager.baseSpawnInterval - 
            (this.asteroidManager.difficultyLevel * 0.08);
        this.asteroidManager.spawnInterval = Math.max(0.3, this.asteroidManager.spawnInterval);
        
        return { derrotado: true, scoreBonus: 500 }; // bonus de pontuação
    }
    
    draw(programInfo, viewMatrix, projectionMatrix) {
        if (this.boss.isActiveBoss()) {
            this.boss.draw(programInfo, viewMatrix, projectionMatrix);
        }
    }
    
    reset() {
        this.boss.desativa();
        this.bossActive = false;
        this.nextBossLevel = this.bossLevel;
    }
    
    isBossActive() {
        return this.boss.isActiveBoss();
    }
    
    getBoss() {
        return this.boss;
    }
}
