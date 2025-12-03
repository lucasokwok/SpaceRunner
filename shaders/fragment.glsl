precision mediump float;

varying vec4 vColor;
varying vec2 vTexcoord;

uniform sampler2D uTexture;   
uniform bool uUseTexture;     // true = usa textura, false = usa vColor

void main() {
    if (uUseTexture) {
        gl_FragColor = texture2D(uTexture, vTexcoord);
    } else {
        gl_FragColor = vColor;
    }
}
