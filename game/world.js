export class World {
    constructor(gl, gridSize = 20) {
        this.gl = gl;
        this.gridSize = gridSize;
        this.initGrid();
    }

    initGrid() {
        const positions = [];
        const colors = [];
        const halfSize = this.gridSize / 2;

        for (let z = -halfSize; z <= halfSize; z++) {
            positions.push(-halfSize, 0, z);
            positions.push(halfSize, 0, z);
            colors.push(0.3, 0.3, 0.3, 1.0);
            colors.push(0.3, 0.3, 0.3, 1.0);
        }

        for (let x = -halfSize; x <= halfSize; x++) {
            positions.push(x, 0, -halfSize);
            positions.push(x, 0, halfSize);
            colors.push(0.3, 0.3, 0.3, 1.0);
            colors.push(0.3, 0.3, 0.3, 1.0);
        }

        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        this.colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);

        this.vertexCount = positions.length / 3;
    }

    draw(programInfo, viewMatrix, projectionMatrix) {
        let modelMatrix = m4.identity();
        modelMatrix = m4.translate(modelMatrix, 0, -0.1, 0);
        const modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);

        this.gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            new Float32Array(modelViewMatrix)
        );

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.vertexAttribPointer(
            programInfo.attribLocations.position,
            3,
            this.gl.FLOAT,
            false,
            0,
            0);
        this.gl.enableVertexAttribArray(programInfo.attribLocations.position);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.vertexAttribPointer(
            programInfo.attribLocations.color,
            4,
            this.gl.FLOAT,
            false,
            0,
            0);
        this.gl.enableVertexAttribArray(programInfo.attribLocations.color);

        // desenha grid
        this.gl.drawArrays(this.gl.LINES, 0, this.vertexCount);
    }
}
