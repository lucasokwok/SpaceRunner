// webgl/objLoader.js
export async function loadOBJModel(gl, url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Erro ao carregar ${url}: ${res.status}`);
    }
    const text = await res.text();

    const positions = [];
    const texcoords = [];
    const normals = [];

    const vertexData = {
        position: [],
        texcoord: [],
        normal: [],
    };

    const indices = [];
    const indexMap = new Map();
    let nextIndex = 0;

    const lines = text.split('\n');

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;

        const parts = line.split(/\s+/);
        const type = parts[0];

        if (type === 'v') {
            positions.push(
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3]),
            );
        } else if (type === 'vt') {
            texcoords.push(
                parseFloat(parts[1]),
                parseFloat(parts[2]),
            );
        } else if (type === 'vn') {
            normals.push(
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3]),
            );
        } else if (type === 'f') {
            const faceVerts = parts.slice(1);
            for (let i = 1; i < faceVerts.length - 1; i++) {
                const tri = [faceVerts[0], faceVerts[i], faceVerts[i + 1]];
                for (const vStr of tri) {
                    let index = indexMap.get(vStr);
                    if (index === undefined) {
                        const [vIdx, vtIdx, vnIdx] = vStr
                            .split('/')
                            .map(s => (s ? parseInt(s, 10) : undefined));

                        const pi = (vIdx - 1) * 3;
                        vertexData.position.push(
                            positions[pi],
                            positions[pi + 1],
                            positions[pi + 2],
                        );

                        if (vtIdx && texcoords.length) {
                            const ti = (vtIdx - 1) * 2;
                            vertexData.texcoord.push(
                                texcoords[ti],
                                texcoords[ti + 1],
                            );
                        } else {
                            vertexData.texcoord.push(0, 0);
                        }

                        if (vnIdx && normals.length) {
                            const ni = (vnIdx - 1) * 3;
                            vertexData.normal.push(
                                normals[ni],
                                normals[ni + 1],
                                normals[ni + 2],
                            );
                        } else {
                            vertexData.normal.push(0, 1, 0);
                        }

                        index = nextIndex++;
                        indexMap.set(vStr, index);
                    }
                    indices.push(index);
                }
            }
        }
    }

    function createBuffer(target, dataArray, ArrayType) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, new ArrayType(dataArray), gl.STATIC_DRAW);
        return buffer;
    }

    const positionBuffer = createBuffer(gl.ARRAY_BUFFER, vertexData.position, Float32Array);
    const texcoordBuffer = createBuffer(gl.ARRAY_BUFFER, vertexData.texcoord, Float32Array);
    const normalBuffer   = createBuffer(gl.ARRAY_BUFFER, vertexData.normal,   Float32Array);
    const indexBuffer    = createBuffer(gl.ELEMENT_ARRAY_BUFFER, indices, Uint16Array);

    return {
        positionBuffer,
        texcoordBuffer,
        normalBuffer,
        indexBuffer,
        indexCount: indices.length,
    };
}
