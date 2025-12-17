attribute vec4 aPosition;              
attribute vec4 aColor;                
attribute vec3 aNormal;                
attribute vec2 aTexcoord;              

uniform mat4 uModelViewMatrix;// matriz de transformação do objeto para o espaço da câmera
uniform mat4 uProjectionMatrix; //projeção 

varying vec4 vColor;                  
varying vec2 vTexcoord;                
varying vec3 vNormal;                  
varying vec3 vPosition; // posição do vértice no espaço de câmera

void main() {
    vec4 worldPosition = uModelViewMatrix * aPosition; // transforma a posição do vértice
    gl_Position = uProjectionMatrix * worldPosition; 
    vPosition = worldPosition.xyz;      // passa a posição para o fragment shader
    vNormal = mat3(uModelViewMatrix) * aNormal; //  o mesmo espaço
    
    vColor = aColor;                    
    vTexcoord = aTexcoord;             
    gl_PointSize = 3.5; // define o tamanho do ponto ao renderizar pontos
}