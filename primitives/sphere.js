export class Sphere {
    constructor(gl, segments = 16, color = null) { //agora recebe parametro cor
        this.gl = gl;
        this.segments = segments;
        this.color = color; 
        this.initBuffers();
    }

    initBuffers() {
        const positions = [];
        const colors = [];
        const indices = [];

        const cor = Array.isArray(this.color) && this.color.length === 4;

        for (let lat = 0; lat <= this.segments; lat++) {
            const theta = (lat * Math.PI) / this.segments;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= this.segments; lon++) {
                const phi = (lon * 2 * Math.PI) / this.segments;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                positions.push(x, y, z);
                
                const [r, g, b, a] = this.color;
                colors.push(r, g, b, a);
            }
        }

        for (let lat = 0; lat < this.segments; lat++) {
            for (let lon = 0; lon < this.segments; lon++) {
                const first = lat * (this.segments + 1) + lon;
                const second = first + this.segments + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        // Create buffers
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        this.colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);

        this.indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        this.indexCount = indices.length;
    }

    draw(programInfo) {
        // Position attribute
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.vertexAttribPointer(
            programInfo.attribLocations.position,
            3,
            this.gl.FLOAT,
            false,
            0,
            0
        );
        this.gl.enableVertexAttribArray(programInfo.attribLocations.position);

        // Color attribute
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.vertexAttribPointer(
            programInfo.attribLocations.color,
            4,
            this.gl.FLOAT,
            false,
            0,
            0
        );
        this.gl.enableVertexAttribArray(programInfo.attribLocations.color);

        // Draw
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.indexCount, this.gl.UNSIGNED_SHORT, 0);
    }
}
