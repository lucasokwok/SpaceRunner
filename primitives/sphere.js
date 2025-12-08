export class Sphere {
    constructor(gl, segments = 30) {
        this.gl = gl;
        this.segments = segments;
        this.initBuffers();
    }

    initBuffers() {
        const positions = [];
        const texCoords = []; // texture add
        const normals = [];
        const indices = [];

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
                
                normals.push(x, y, z);

                const u = 1 - (lon / this.segments);
                const v = 1 - (lat / this.segments);
                texCoords.push(u, v);
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

        this.positionBuffer = this.createBuffer(positions);
        this.texCoordBuffer = this.createBuffer(texCoords);
        this.normalBuffer = this.createBuffer(normals);

        this.indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        
        this.indexCount = indices.length;
    }

    createBuffer(data) {
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), this.gl.STATIC_DRAW);
        return buffer;
    }

    draw(programInfo) {
        this.bindAttribute(this.positionBuffer, programInfo.attribLocations.position, 3);
        
        if (programInfo.attribLocations.textureCoord !== -1) {
            this.bindAttribute(this.texCoordBuffer, programInfo.attribLocations.textureCoord, 2);
        }

        if (programInfo.attribLocations.normal !== -1) {
            this.bindAttribute(this.normalBuffer, programInfo.attribLocations.normal, 3);
        }

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.indexCount, this.gl.UNSIGNED_SHORT, 0);
    }

    bindAttribute(buffer, location, size) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.vertexAttribPointer(location, size, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(location);
    }
}