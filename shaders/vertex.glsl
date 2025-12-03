attribute vec4 aPosition;   
attribute vec4 aColor;     

attribute vec3 aNormal;     
attribute vec2 aTexcoord;   

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying vec4 vColor;
varying vec2 vTexcoord;

void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;

    vColor = aColor;

    vTexcoord = aTexcoord;
}
