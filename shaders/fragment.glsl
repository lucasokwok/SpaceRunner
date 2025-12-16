precision mediump float;           

varying vec4 vColor;                  
varying vec2 vTexcoord;              
varying vec3 vNormal;              
varying vec3 vPosition;              

uniform sampler2D uTexture;          
uniform bool uUseTexture;            
uniform vec3 uLightPosition;          
uniform vec3 uViewPosition;           
uniform float uEmissive; // intensidade de luz emitida pelo objeto

void main() {
    vec3 baseColor;                   
    
    if (uUseTexture) {
        baseColor = texture2D(uTexture, vTexcoord).rgb; //textura usando as coordenadas
    } else {
        baseColor = vColor.rgb; //cor vinda do vertex shader
    }
    
    float normalLength = length(vNormal);
    if (normalLength > 0.01) {         
        vec3 normal = normalize(vNormal); 
        vec3 lightDir = normalize(uLightPosition - vPosition); // direção da luz ate o fragmento
        
        float diff = max(dot(normal, lightDir), 0.0); // fator de iluminação difusa
        
        vec3 ambient = 0.5 * baseColor;// componente de luz ambiente constante
        vec3 diffuse = 0.8 * diff * baseColor; // luz difusa
        
        vec3 color = ambient + diffuse + (uEmissive * baseColor); // soma iluminação e emissão
        gl_FragColor = vec4(color, 1.0);  // define a cor final do fragmento
    } else {
        gl_FragColor = vec4(baseColor + (uEmissive * baseColor), 1.0); // renderiza 
    }
}