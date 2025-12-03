// src/webgl/objLoader.js
// Loader avançado para arquivos OBJ com materiais (MTL) e várias texturas por parte

// Função utilitária para carregar texturas
export function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Pixel branco temporário enquanto a imagem carrega
  const tempPixel = new Uint8Array([255, 255, 255, 255]);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    tempPixel
  );

  const image = new Image();
  image.src = url;
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image
    );

    // Configuração segura para qualquer tamanho de textura (NPOT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  return texture;
}

// Carrega OBJ + MTL, separando o modelo em partes por material e
// criando buffers e texturas para cada parte.
export async function loadOBJWithMTL(gl, objUrl) {
  // 1. Baixa o OBJ
  const objResponse = await fetch(objUrl);
  if (!objResponse.ok) {
    throw new Error(`Erro ao carregar OBJ: ${objResponse.status} ${objResponse.statusText}`);
  }
  const objText = await objResponse.text();

  // Base path (pasta) para MTL e texturas (mesma pasta do OBJ)
  const lastSlash = objUrl.lastIndexOf('/');
  const basePath = lastSlash >= 0 ? objUrl.slice(0, lastSlash + 1) : '';

  // 2. Descobre qual arquivo MTL é usado (linha 'mtllib')
  let mtlFile = null;
  for (const rawLine of objText.split('\n')) {
    const line = rawLine.trim();
    if (line.toLowerCase().startsWith('mtllib')) {
      const parts = line.split(/\s+/);
      if (parts[1]) {
        mtlFile = parts[1];
        break;
      }
    }
  }

  // 3. Se houver MTL, carrega e parseia materiais (map_Kd -> arquivo de textura)
  let materialDefs = {};
  if (mtlFile) {
    const mtlUrl = basePath + mtlFile;
    materialDefs = await loadMTL(mtlUrl);
  }

  // 4. Parseia o OBJ em partes por material (usa 'usemtl')
  const partsData = parseOBJWithMaterials(objText);

  // 5. Para cada material, cria buffers e carrega a textura correspondente
  const parts = [];

  for (const materialName in partsData) {
    const data = partsData[materialName];
    const positions = data.positions;
    const normals   = data.normals;
    const texcoords = data.texcoords;
    const indices   = data.indices;

    const part = {
      materialName,
      vertexBuffer: gl.createBuffer(),
      normalBuffer: gl.createBuffer(),
      texcoordBuffer: null,
      indexBuffer: gl.createBuffer(),
      indexCount: indices.length,
      texture: null,
    };

    // Posições
    gl.bindBuffer(gl.ARRAY_BUFFER, part.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Normais
    gl.bindBuffer(gl.ARRAY_BUFFER, part.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    // Coordenadas de textura (se existirem)
    if (texcoords && texcoords.length > 0) {
      part.texcoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, part.texcoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
    }

    // Índices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // Textura associada ao material (map_Kd no MTL)
    const mat = materialDefs[materialName];
    if (mat && mat.map_Kd) {
      const texUrl = basePath + mat.map_Kd;
      part.texture = loadTexture(gl, texUrl);
    }

    parts.push(part);
  }

  // Limpa binds
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return { parts };
}

// --------- Parsing do MTL (materiais) ---------
async function loadMTL(mtlUrl) {
  const response = await fetch(mtlUrl);
  if (!response.ok) {
    console.warn('MTL não encontrado ou erro ao carregar:', mtlUrl);
    return {};
  }
  const text = await response.text();
  const materials = {};
  let current = null;

  const lines = text.split('\n');
  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    const keyword = parts[0];
    const args = parts.slice(1);

    if (keyword === 'newmtl') {
      const name = args[0];
      current = {};
      materials[name] = current;
    } else if (keyword === 'map_Kd') {
      if (current) {
        current.map_Kd = args.join(' ');
      }
    }
  }

  return materials;
}

// --------- Parsing do OBJ com materiais (usemtl) ---------
function parseOBJWithMaterials(text) {
  const tempVertices  = [];
  const tempNormals   = [];
  const tempTexcoords = [];

  // parts[materialName] = { positions:[], normals:[], texcoords:[], indices:[] }
  const parts = {};
  let currentMaterial = 'default';

  function getPart(name) {
    if (!parts[name]) {
      parts[name] = {
        positions: [],
        normals: [],
        texcoords: [],
        indices: [],
      };
    }
    return parts[name];
  }

  const lines = text.split('\n');
  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const tokens = line.split(/\s+/);
    const keyword = tokens[0];
    const args = tokens.slice(1);

    if (keyword === 'v') {
      if (args.length >= 3) {
        const v = args.slice(0, 3).map(parseFloat);
        tempVertices.push(v);
      }
    } else if (keyword === 'vn') {
      if (args.length >= 3) {
        const n = args.slice(0, 3).map(parseFloat);
        tempNormals.push(n);
      }
    } else if (keyword === 'vt') {
      // vt u v [w]
      const u = parseFloat(args[0]);
      const v = parseFloat(args[1]);
      tempTexcoords.push([u, v]);
    } else if (keyword === 'usemtl') {
      // Muda o material atual
      if (args[0]) {
        currentMaterial = args[0];
      }
    } else if (keyword === 'f') {
      const part = getPart(currentMaterial);

      // Cada token: v/vt/vn ou v//vn ou v/vt
      const faceVerts = args.map(token => {
        const [vStr, vtStr, nStr] = token.split('/');
        const vIndex  = vStr ? parseInt(vStr, 10) - 1 : undefined;
        const vtIndex = vtStr ? parseInt(vtStr, 10) - 1 : undefined;
        const nIndex  = nStr ? parseInt(nStr, 10) - 1 : undefined;
        return { v: vIndex, vt: vtIndex, n: nIndex };
      });

      // Triangulação em leque
      for (let i = 1; i < faceVerts.length - 1; i++) {
        const tri = [faceVerts[0], faceVerts[i], faceVerts[i + 1]];

        tri.forEach(({ v, vt, n }) => {
          const vert = tempVertices[v];
          if (!vert) return;

          let norm = [0, 0, 1];
          if (n !== undefined && tempNormals[n]) {
            norm = tempNormals[n];
          }

          let tex = [0, 0];
          if (vt !== undefined && tempTexcoords[vt]) {
            tex = tempTexcoords[vt];
          }

          part.positions.push(vert[0], vert[1], vert[2]);
          part.normals.push(norm[0], norm[1], norm[2]);
          part.texcoords.push(tex[0], tex[1]);
          part.indices.push(part.indices.length);
        });
      }
    }
  }

  return parts;
}
