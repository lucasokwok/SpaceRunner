import { mat4 } from 'https://cdn.skypack.dev/gl-matrix';

function createShip() {
    const positions = [];
    const colors = [];
    const indices = [];
    let currentIndex = 0;

    function addVertex(x, y, z, color) {
        positions.push(x, y, z);
        colors.push(color[0], color[1], color[2], 1.0);
        return currentIndex++;
    }

    function addRectPrism(xMin, xMax, yMin, yMax, zMin, zMax, color) {
        const v0 = addVertex(xMin, yMin, zMin, color); // tras-baixo-esquerda
        const v1 = addVertex(xMax, yMin, zMin, color); // tras-baixo-direita
        const v2 = addVertex(xMax, yMax, zMin, color); // trs-cima-direita
        const v3 = addVertex(xMin, yMax, zMin, color); // tras-cima-esquerda
        const v4 = addVertex(xMin, yMin, zMax, color); // frente-baixo-esquerda
        const v5 = addVertex(xMax, yMin, zMax, color); // frente-baixo-direita
        const v6 = addVertex(xMax, yMax, zMax, color); // frente-cima-direita
        const v7 = addVertex(xMin, yMax, zMax, color); // frente-cima-esquerda

        indices.push(v0, v1, v2, v0, v2, v3);
        indices.push(v4, v6, v5, v4, v7, v6);
        indices.push(v0, v3, v7, v0, v7, v4);
        indices.push(v1, v5, v6, v1, v6, v2);
        indices.push(v0, v4, v5, v0, v5, v1);
        indices.push(v3, v2, v6, v3, v6, v7);

    }

    function addTriPrism(p0, p1, p2, yMin, yMax, color) {
        // p0, p1, p2 no plano XZ
        const v0 = addVertex(p0[0], yMin, p0[1], color);
        const v1 = addVertex(p1[0], yMin, p1[1], color);
        const v2 = addVertex(p2[0], yMin, p2[1], color);
        const v3 = addVertex(p0[0], yMax, p0[1], color);
        const v4 = addVertex(p1[0], yMax, p1[1], color);
        const v5 = addVertex(p2[0], yMax, p2[1], color);

        // base 
        indices.push(v0, v1, v2);
        // topo 
        indices.push(v3, v5, v4);

        indices.push(v0, v1, v4, v0, v4, v3);
        indices.push(v1, v2, v5, v1, v5, v4);
        indices.push(v2, v0, v3, v2, v3, v5);
    }

    function addCockpit(
        centerX,
        yMin,
        yMax,
        centerZ,
        raioX,
        raioZ,
        segments,
        color
    ) {
        const centerBottom = addVertex(centerX, yMin, centerZ, color);
        const centerTop = addVertex(centerX, yMax, centerZ, color);

        const bottomRim = [];
        const topRim = [];

        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;
            const x = centerX + Math.cos(t) * raioX;
            const z = centerZ + Math.sin(t) * raioZ;

            const rb = addVertex(x, yMin, z, color);
            const rt = addVertex(x, yMax, z, color);

            bottomRim.push(rb);
            topRim.push(rt);
        }

        for (let i = 0; i < segments; i++) {
            const rb0 = bottomRim[i];
            const rb1 = bottomRim[i + 1];
            const rt0 = topRim[i];
            const rt1 = topRim[i + 1];

            indices.push(centerBottom, rb0, rb1);
            indices.push(centerTop, rt1, rt0);
            indices.push(rb0, rb1, rt1);
            indices.push(rb0, rt1, rt0);
        }
    }

    // cores
    const bodyColor = [0.7, 0.7, 0.8];
    const noseColor = [0.8, 0.8, 0.9];
    const asaColor = [0.5, 0.5, 0.6];
    const cabinColor = [0.2, 0.5, 1.0];

    const bodyYMin = 0.0;
    const bodyYMax = 0.1;   // altura do corpo
    const asaYMin = 0.0;
    const asaYMax = 0.06;  // espessura das asas
    const cabinYMin = bodyYMax;      
    const cabinYMax = bodyYMax + 0.08;

    addRectPrism(-0.25, 0.25, bodyYMin, bodyYMax, 0.0, 0.8, bodyColor);

    // 2) Bico da nave (triângulo central que se conecta com as asas)
    addTriPrism(
        [-0.25, 0.95],  // base esquerda, mesma posição da asa esquerda
        [ 0.25, 0.95],  // base direita, mesma posição da asa direita
        [ 0.0,  1.5],   // ponta do bico
        bodyYMin,
        bodyYMax,
        noseColor
    );
    // asa esquerda
    addTriPrism(
        [-0.25, 0.95],   // dianteira encostada no corpo
        [-0.60, -0.30],  // ponta 
        [-0.25, 0.00],   // traseira encostada no corpo
        asaYMin,
        asaYMax,
        asaColor
    );

    // asa direita
    addTriPrism(
        [ 0.25, 0.95],   // dianteira
        [ 0.60, -0.30],  // ponta 
        [ 0.25, 0.00],   //  traseira
        asaYMin,
        asaYMax,
        asaColor
    );

    addCockpit(
        0.0,           // centerX
        cabinYMin,     // yMin
        cabinYMax,     // yMax
        0.5,           // centerZ 
        0.12,          // raioX
        0.20,          // raioZ
        16,            // segments
        cabinColor
    );

    return {
        positions: new Float32Array(positions),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices),
        indexCount: indices.length
    };
}

export class Ship {
    constructor(gl) {
        this.gl = gl;

        this.initGeometry();
        
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

        this.setupInput();
    }

    initGeometry() {
        const gl = this.gl;
        const geometry = createShip();

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);

        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.colors, gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

        this.indexCount = geometry.indexCount;
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
        
        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.position,
            3,
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.color,
            4,
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.color);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(
            gl.TRIANGLES,
            this.indexCount,
            gl.UNSIGNED_SHORT,
            0
        );
    }
}
