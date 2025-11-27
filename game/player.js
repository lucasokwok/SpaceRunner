import { mat4 } from 'https://cdn.skypack.dev/gl-matrix';

export class Ship {
    constructor(gl, model, texture) {
        this.gl = gl;
        this.model = model;       
        this.texture = texture;   

        // posição no grid
        this.gridX = 0;
        this.gridZ = 0;
        this.gridSize = 1.0;

        this.baseSpeed = 0.12;
        this.velocity = { x: 0, z: 0 };

        // teclas
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };

        this.scale = 0.4;

        this.setupInput();
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = true;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = false;
            }
        });
    }

    update(deltaTime) {
        this.velocity.x = 0;
        this.velocity.z = 0;

        if (this.keys.w) {
            this.velocity.z += this.baseSpeed;
        }
        if (this.keys.s) {
            this.velocity.z -= this.baseSpeed;
        }
        if (this.keys.a) {
            // a para direita 
            this.velocity.x += this.baseSpeed;
        }
        if (this.keys.d) {
            // d esquerda
            this.velocity.x -= this.baseSpeed;
        }

        this.gridX += this.velocity.x;
        this.gridZ += this.velocity.z;

        // limita movimento
        const maxRange = 10;
        this.gridX = Math.max(-maxRange, Math.min(maxRange, this.gridX));
        this.gridZ = Math.max(-maxRange, Math.min(maxRange, this.gridZ));
    }

    getPosition() {
        return [
            this.gridX * this.gridSize,
            0.3, 
            this.gridZ * this.gridSize
        ];
    }

    getDirection() {
        return [0, 0, 1];
    }

    draw(programInfo, viewMatrix, projectionMatrix) {
        const gl = this.gl;
        const modelMatrix = mat4.create();
        const modelViewMatrix = mat4.create();

        const position = this.getPosition();
        mat4.translate(modelMatrix, modelMatrix, position);

        // correção de orientação (testa esse primeiro)
        mat4.rotateX(modelMatrix, modelMatrix, -Math.PI / 2);

        // escala para diminuir a nave
        mat4.scale(modelMatrix, modelMatrix, [this.scale, this.scale, this.scale]);

        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix
        );

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
            programInfo.attribLocations.texCoord !== -1 &&
            this.model.texcoordBuffer) {

            gl.bindBuffer(gl.ARRAY_BUFFER, this.model.texcoordBuffer);
            gl.vertexAttribPointer(
                programInfo.attribLocations.texCoord,
                2,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.enableVertexAttribArray(programInfo.attribLocations.texCoord);
        }

        if (programInfo.attribLocations.color !== undefined &&
            programInfo.attribLocations.color !== -1) {
            gl.disableVertexAttribArray(programInfo.attribLocations.color);
            gl.vertexAttrib4f(programInfo.attribLocations.color, 1, 1, 1, 1);
        }

        if (programInfo.uniformLocations.textureSampler && this.texture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.uniform1i(programInfo.uniformLocations.textureSampler, 0);
        }

        if (programInfo.uniformLocations.useTexture) {
            gl.uniform1i(programInfo.uniformLocations.useTexture, 1);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.model.indexBuffer);
        gl.drawElements(
            gl.TRIANGLES,
            this.model.indexCount,
            gl.UNSIGNED_SHORT,
            0
        );
    }
}
