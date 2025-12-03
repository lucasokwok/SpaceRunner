export class Camera {
    constructor() {
        // modos de camera primeira pessoa a terceira
        this.modes = ['third', 'first'];
        this.mode = 'third';

        // nave, objeto de referencia
        this.shipPosition = [0, 0, 0];
        this.shipDirection = [0, 0, 1]; 

        this.position = [0, 2, -6]; // Terceira pessoa 
        this.target = [0, 0, 0];
        this.up = [0, 1, 0];
        this.fov = 45 * Math.PI / 180;
        this.aspect = 1;
        this.near = 0.1;
        this.far = 100.0;

        this.viewMatrix = Camera._identity();
        this.projectionMatrix = Camera._identity();
    }


    setShipTransform(position, direction) {
        this.shipPosition = position;
        this.shipDirection = direction;
    }

    switchMode(modeIndex) {
        if (modeIndex >= 0 && modeIndex < this.modes.length) {
            this.mode = this.modes[modeIndex];
        }
    }

    updateViewMatrix() {
        // atualiza pos, target e FOV conforme o modo
        const shipPos = this.shipPosition;
        const shipDir = this.shipDirection;
        const up = [0, 1, 0];
        let pos, target, fov;

        if (this.mode === 'third') {
            // atras e acima da nave
            pos = [
                shipPos[0] - shipDir[0] * 6 + up[0] * 2,
                shipPos[1] + 2,
                shipPos[2] - shipDir[2] * 6 + up[2] * 2
            ];
            target = [
                shipPos[0] + shipDir[0] * 2,
                shipPos[1],
                shipPos[2] + shipDir[2] * 2
            ];
            fov = 45 * Math.PI / 180;
        } else if (this.mode === 'first') {
            // no bico da nave
            pos = [
                shipPos[0] + shipDir[0] * 0.5,
                shipPos[1] + 0.5,
                shipPos[2] + shipDir[2] * 0.5
            ];
            target = [
                shipPos[0] + shipDir[0] * 2,
                shipPos[1] + 0.5,
                shipPos[2] + shipDir[2] * 2
            ];
            fov = 60 * Math.PI / 180;
        } else if (this.mode === 'side') {
            pos = [
                shipPos[0] + 8,  
                shipPos[1] + 3,  
                shipPos[2] - 2   
            ];

            target = [
                shipPos[0],
                shipPos[1] + 0.3,  
                shipPos[2] + 1     
            ];
            fov = 55 * Math.PI / 180;  
        } else {
            pos = this.position;
            target = this.target;
            fov = this.fov;
        }

        this.position = pos;
        this.target = target;
        this.fov = fov;

        this.viewMatrix = Camera._lookAt(this.position, this.target, up);
    }


    updateProjectionMatrix(aspect) {
        this.aspect = aspect;
        this.projectionMatrix = Camera._perspective(this.fov, this.aspect, this.near, this.far);
    }

    getViewMatrix() {
        return new Float32Array(this.viewMatrix);
    }

    getProjectionMatrix() {
        return new Float32Array(this.projectionMatrix);
    }

    getMode() {
        return this.mode;
    }

    static _identity() {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }

    static _normalize(v) {
        const len = Math.hypot(v[0], v[1], v[2]);
        if (!len) return [0, 0, 0];
        return [v[0] / len, v[1] / len, v[2] / len];
    }

    static _cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
    }

    static _dot(a, b) {
        return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    }

    static _lookAt(eye, center, up) {
        let f = [
            center[0] - eye[0],
            center[1] - eye[1],
            center[2] - eye[2],
        ];
        f = Camera._normalize(f);

        let upN = Camera._normalize(up);

        let s = Camera._cross(f, upN);
        s = Camera._normalize(s);

        let u = Camera._cross(s, f);

        return [
            s[0], u[0], -f[0], 0,
            s[1], u[1], -f[1], 0,
            s[2], u[2], -f[2], 0,
            -Camera._dot(s, eye),
            -Camera._dot(u, eye),
            Camera._dot(f, eye),
            1
        ];
    }

    static _perspective(fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1.0 / (near - far);

        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, (2 * far * near) * nf, 0
        ];
    }
}
