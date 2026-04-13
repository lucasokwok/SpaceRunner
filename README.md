# Space Runner

Practical project developed for the **Computer Graphics** course at **UNIFESP**.

This project is a 3D _space runner_ game in which the player controls a spaceship, avoids obstacles, fights enemies, and tries to achieve the highest score possible.

![Screenshot 1 of Space Runner](./img1-spacerunners.jpeg)

## About the project

**Space Runner** was created to apply in practice the main concepts studied during the Computer Graphics course.  
During its development, it was possible to build an interactive 3D scene, control the spaceship movement, and work with camera, projection, lighting, textures, and real-time game logic.

## Features

- Spaceship movement in a 3D environment
- Shooting system
- Asteroids/obstacles
- Level progression system
- HUD with score, lives, level, and speed
- Boss fight with health bar
- Game over screen with restart
- Camera mode switching

## What I learned in this course

Throughout the course, this project allowed me to apply and strengthen important Computer Graphics concepts, such as:

- Graphics pipeline
- Rendering with **WebGL**
- Use of **shaders** (vertex and fragment shaders)
- 3D object transformations:
  - translation
  - rotation
  - scaling
- Modeling, view, and projection matrices
- Camera control in a 3D scene
- Ambient and diffuse lighting
- Texture mapping
- 3D model loading
- Organizing a graphics project into modules
- Integration between game logic and real-time rendering

## Technologies used

- JavaScript
- WebGL
- HTML
- CSS
- GLSL

## Controls

- **W / A / S / D**: move the spaceship
- **Space**: shoot
- **1**: switch to one camera mode
- **2**: switch to another camera mode

## How to run

Since this project was developed for WebGL in the browser, you only need to:

1. Clone this repository
2. Open the project folder in an editor such as VS Code
3. Run it using a local server extension, such as **Live Server**

Alternatively, you can serve the files using any local web server.

## Project structure

```text
SpaceRunner/
├── assets/
├── game/
├── primitives/
├── shaders/
├── ui/
├── webgl/
├── index.html
├── main.js
└── m4.js
```

## Project images

### Screenshot 2

![Screenshot 2 of Space Runner](./img2-spacerunners.jpeg)

### Screenshot 3

![Screenshot 3 of Space Runner](./img3-spacerunners.jpeg)

## Final remarks

This project was important to consolidate, in practice, the content studied in class.  
Besides the technical learning, it also helped me improve code organization, modularization, and the integration of different parts of an interactive graphics system.

## License

This project is licensed under the MIT License.
