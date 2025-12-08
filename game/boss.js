import { loadOBJWithMTL } from '../webgl/objLoader.js';

export class Boss {
    constructor(gl) {
        this.gl = gl;

        this.maxHealth = 7;
        this.health = this.maxHealth;
        this.isActive = false;
        this.isDerrotado = false;

        this.baseDistance = 22;
        this.x = 0;
        this.y = 1.5;
        this.z = 0;

        this.scale = 0.8;

        // aumentei um pouco a hitbox pq tava dificil
        this.baseRadius = 1.6;

        this.oscillation = 0;
        this.oscillationSpeed = 1.2;
        this.oscillationAmount = 0.25;

        this.sideMove = 0;
        this.sideSpeed = 1.4;
        this.sideAmount = 3.5;

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
            console.error("Erro ao carregar boss:", err);
            this.modelLoaded = false;
        }
    }

    activate(playerZ) {
        this.isActive = true;
        this.isDerrotado = false;
        this.health = this.maxHealth;
        this.z = playerZ + this.baseDistance;
        this.sideMove = 0;
    }

    desativa() {
        this.isActive = false;
        this.isDerrotado = false;
    }

    derrotar() {
        this.isDerrotado = true;
        this.isActive = false;
    }

    takeDamage(damage = 1) {
        if (!this.isActive || this.isDerrotado) return false;

        this.health -= damage;

        if (this.health <= 0) {
            this.health = 0;
            this.derrotar();
            return true;
        }

        return false;
    }

    update(deltaTime, playerPos) {
        if (!this.isActive || this.isDerrotado) return;

        this.oscillation += deltaTime * this.oscillationSpeed;
        this.sideMove += deltaTime * this.sideSpeed;

        this.x = Math.sin(this.sideMove) * this.sideAmount;
        this.z = playerPos[2] + this.baseDistance;
        this.y = 1.5 + Math.sin(this.oscillation) * this.oscillationAmount;
    }

    getPosition() {
        return [this.x, this.y, this.z];
    }

    getRadius() {
        return this.baseRadius * this.scale;
    }

    isActiveBoss() {
        return this.isActive && !this.isDerrotado;
    }

    getHealthPorcentagem() {
        return (this.health / this.maxHealth) * 100;
    }

    draw(programInfo, viewMatrix, projectionMatrix) {
        if (!this.isActiveBoss()) return;

        if (this.modelLoaded && this.modelParts && this.modelParts.length > 0) {
            this.drawOBJ(programInfo, viewMatrix);
        }
    }

    drawOBJ(programInfo, viewMatrix) {
        const gl = this.gl;

        const positionLoc = programInfo.attribLocations.vertexPosition;
        const texcoordLoc = programInfo.attribLocations.textureCoord;
        const useTexLoc = programInfo.uniformLocations.useTexture;
        const texSamplerLoc = programInfo.uniformLocations.texture;

        let modelMatrix = m4.identity();
        modelMatrix = m4.scale(modelMatrix, this.scale, this.scale, this.scale);
        modelMatrix = m4.yRotate(modelMatrix, Math.PI);
        modelMatrix = m4.translate(modelMatrix, this.x, this.y, this.z);

        const modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            new Float32Array(modelViewMatrix)
        );

        if (useTexLoc) gl.uniform1i(useTexLoc, 1);

        for (const part of this.modelParts) {
            const { vertexBuffer, texcoordBuffer, indexBuffer, indexCount, texture } = part;

            if (positionLoc >= 0) {
                gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
                gl.enableVertexAttribArray(positionLoc);
                gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
            }

            if (texcoordLoc >= 0 && texcoordBuffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
                gl.enableVertexAttribArray(texcoordLoc);
                gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

            if (texture && texSamplerLoc) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.uniform1i(texSamplerLoc, 0);
            }

            gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
        }

        if (useTexLoc) gl.uniform1i(useTexLoc, 0);
    }
}


// manager do boss, responsável por fazer us updates necessárias
export class BossManager {
    constructor(gl, asteroidManager) {
        this.gl = gl;
        this.asteroidManager = asteroidManager;
        this.boss = new Boss(gl);

        this.bossLevel = 1; // teste
        this.nextBossLevel = this.bossLevel;

        this.bossActive = false;
        this.bossDefeatedThisLevel = false;
    }

    update(deltaTime, currentLevel, playerPos) {
        if (
            currentLevel === this.nextBossLevel &&
            !this.bossActive &&
            !this.bossDefeatedThisLevel
        ) {
            this.activateBoss(playerPos);
        }

        if (this.boss.isActiveBoss()) {
            this.boss.update(deltaTime, playerPos);
        }
    }

    activateBoss(playerPos) {
        this.bossActive = true;
        this.bossDefeatedThisLevel = false;
        this.boss.activate(playerPos[2]);

        this.asteroidManager.spawnInterval *= 1.5;
    }

    verificaColisaoBoss(projectilePos, projectileRadius) {
        if (!this.boss.isActiveBoss()) return { hit: false };

        const [bx, by, bz] = this.boss.getPosition();
        const bossRadius = this.boss.getRadius();

        const dx = projectilePos[0] - bx;
        const dy = projectilePos[1] - by;
        const dz = projectilePos[2] - bz;

        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance <= projectileRadius + bossRadius) {
            const morreu = this.boss.takeDamage(1);

            if (morreu) {
                const result = this.onBossDerrotado();
                return { hit: true, derrotared: true, scoreBonus: result.scoreBonus };
            }

            return { hit: true, derrotared: false };
        }

        return { hit: false };
    }

    onBossDerrotado() {
        this.bossActive = false;
        this.bossDefeatedThisLevel = true;
        this.nextBossLevel += this.bossLevel;

        this.asteroidManager.spawnInterval =
            this.asteroidManager.baseSpawnInterval -
            (this.asteroidManager.difficultyLevel * 0.08);

        this.asteroidManager.spawnInterval =
            Math.max(0.3, this.asteroidManager.spawnInterval);

        return { derrotado: true, scoreBonus: 500 };
    }

    draw(programInfo, viewMatrix, projectionMatrix) {
        if (this.boss.isActiveBoss()) {
            this.boss.draw(programInfo, viewMatrix, projectionMatrix);
        }
    }

    reset() {
        this.boss.desativa();
        this.bossActive = false;
        this.bossDefeatedThisLevel = false;
        this.nextBossLevel = this.bossLevel;
    }

    isBossActive() {
        return this.boss.isActiveBoss();
    }

    getBoss() {
        return this.boss;
    }
}
