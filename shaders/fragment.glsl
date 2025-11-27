precision mediump float;

varying vec4 vColor;
varying vec2 vTexCoord;
varying vec3 vNormal;

uniform sampler2D uTexture;
uniform bool uUseTexture;

void main() {
    vec4 baseColor = vColor;

    if (uUseTexture) {
        vec4 texColor = texture2D(uTexture, vTexCoord);
        baseColor = baseColor * texColor;
    }

    gl_FragColor = baseColor;
}
