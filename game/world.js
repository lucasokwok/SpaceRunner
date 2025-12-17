import { Sphere } from '../primitives/sphere.js';

export class World {
    constructor(gl, starCount = 3000) {
        this.gl = gl;
        this.starCount = starCount;

        this.planetAngle = 0;
        this.timeAccumulator = 0;

        this.stars = [];
        this.initStars();
        this.starBuffer = this.gl.createBuffer();

        this.planetMesh = new Sphere(gl, 40); 
        this.planetTexture = this.loadTexture('../assets/planets/sun.jpg'); //podemos escolher qualquer planeta
    }

    loadTexture(url) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // temporary pixel
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        };
        
        image.onerror = function() {
            console.error("ERRO IMG:", url);
        };
        image.src = url;
        return texture;
    }

    initStars() {
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * 300,
                y: (Math.random() - 0.5) * 200,
                z: -Math.random() * 50 
            });
        }
    }

    update(deltaTime, shipZ) {
        this.timeAccumulator += deltaTime;
        this.planetAngle += deltaTime * 0.1; 
    }

    draw(programInfo, viewMatrix, projectionMatrix) {
        const gl = this.gl;
        gl.disable(gl.DEPTH_TEST);

        const positions = [];
        for (const star of this.stars) positions.push(star.x, star.y, star.z);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.starBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);

        const fixedViewMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, fixedViewMatrix);
        
        if (projectionMatrix) gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        if (programInfo.uniformLocations.useTexture) {
            gl.uniform1i(programInfo.uniformLocations.useTexture, 0); 
        }

        const posLoc = programInfo.attribLocations.position;
        gl.enableVertexAttribArray(posLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.starBuffer);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        const colorLoc = programInfo.attribLocations.color;
        if (colorLoc !== -1) {
            gl.disableVertexAttribArray(colorLoc);
            gl.vertexAttrib4f(colorLoc, 1.0, 1.0, 1.0, 1.0);
        }
        
        if (programInfo.attribLocations.textureCoord !== -1) gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);
        if (programInfo.attribLocations.normal !== -1) gl.disableVertexAttribArray(programInfo.attribLocations.normal);

        gl.drawArrays(gl.POINTS, 0, this.starCount);

        if (this.planetTexture) {
            // brilho d planeta 
            if (programInfo.uniformLocations.emissive) {
                gl.uniform1f(programInfo.uniformLocations.emissive, 0.4);
            }
            
            if (programInfo.uniformLocations.useTexture) {
                gl.uniform1i(programInfo.uniformLocations.useTexture, 1); 
            }
            
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.planetTexture);
            
            if (programInfo.uniformLocations.uTexture) gl.uniform1i(programInfo.uniformLocations.uTexture, 0);

            const scale = 15.0; 
            const x = 40.0;
            const y = 20.0 + Math.sin(this.timeAccumulator * 0.5) * 2.0;
            const z = -80.0;
            
            const cosA = Math.cos(this.planetAngle);
            const sinA = Math.sin(this.planetAngle);

            const planetMatrix = new Float32Array([
                scale * cosA,   0,       scale * -sinA,  0,
                0,              scale,   0,              0,
                scale * sinA,   0,       scale * cosA,   0,
                x,              y,       z,              1
            ]);

            gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, planetMatrix);

            this.planetMesh.draw(programInfo);
            
            // Vbrilho 0
            if (programInfo.uniformLocations.emissive) {
                gl.uniform1f(programInfo.uniformLocations.emissive, 0.0);
            }
        }

        gl.enable(gl.DEPTH_TEST);
    }
}