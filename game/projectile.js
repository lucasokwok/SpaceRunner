import { Sphere } from '../primitives/sphere.js';

export class Projectile {
    constructor(gl, x, y, z) {
        this.gl = gl;

        // cor azul ciano 
        this.sphere = new Sphere(gl, 8, [0.0, 1.0, 1.0, 1.0]);
        
        this.x = x;
        this.y = y;
        this.z = z;
        
        this.speed = 20; 
        this.velocityZ = this.speed;
        
        this.active = true;
        this.scale = 0.15; // pequeno em relacao a nave
    }
    
    update(deltaTime) {
        this.z += this.velocityZ * deltaTime;
        
        // desativa se estiver muito longe
        if (this.z > 50) {
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
    
    desativa() {
        this.active = false;
    }
    
    checkCollisionWithBoss(bossPos, bossRadius) {
        const dx = this.x - bossPos[0];
        const dy = this.y - bossPos[1];
        const dz = this.z - bossPos[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        return distance < (this.scale + bossRadius);
    }
    
    draw(programInfo, viewMatrix, projectionMatrix) {
        const gl = this.gl;

        gl.uniform1i(programInfo.uniformLocations.useTexture, 0);

        const locColor = (programInfo.attribLocations.color ?? programInfo.attribLocations.vertexColor);
        if (typeof locColor === "number" && locColor >= 0) {
            gl.disableVertexAttribArray(locColor);
            gl.vertexAttrib4f(locColor, 0.0, 1.0, 1.0, 1.0);//ciano
        }

        const locTex = programInfo.attribLocations.textureCoord;
        if (typeof locTex === "number" && locTex >= 0) {
            gl.disableVertexAttribArray(locTex);
            gl.vertexAttrib2f(locTex, 0.0, 0.0);
        }
        
        let modelMatrix = m4.identity();
        modelMatrix = m4.scale(modelMatrix, this.scale, this.scale, this.scale);
        modelMatrix = m4.translate(modelMatrix, this.x, this.y, this.z);

        const modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);
        
        this.gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            new Float32Array(modelViewMatrix)
        );
        
        this.sphere.draw(programInfo);
    }
}
