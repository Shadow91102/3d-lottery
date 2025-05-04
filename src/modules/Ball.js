import * as THREE from "three";
import * as CANNON from "cannon";

const radius = 0.8;
const sharedGeo = new THREE.SphereGeometry(radius, 32, 32);

var imageCanvas = document.createElement("canvas"),
  context = imageCanvas.getContext("2d");

// const billiardBallColors = {
//     1: '#f1c40f', // Bright Yellow
//     2: '#3498db', // Bright Blue
//     3: '#e74c3c', // Bright Red
//     4: '#9b59b6', // Bright Purple
//     5: '#e67e22', // Bright Orange
//     6: '#2ecc71', // Bright Green
//     7: '#f39c12', // Bright Maroon (Golden)
//     8: '#ffffff', // White (Cue Ball)
//     9: '#f1c40f', // Bright Yellow (Stripe)
//     10: '#3498db', // Bright Blue
//     11: '#e74c3c', // Bright Red
//     12: '#9b59b6', // Bright Purple
//     13: '#e67e22', // Bright Orange
//     14: '#2ecc71', // Bright Green
//     15: '#f39c12', // Bright Maroon (Golden)
//     16: '#ffffff'  // Cue Ball (White)
// };

// function makeTexture(num) {
//     const size = 100;
//     imageCanvas.width = imageCanvas.height = size;
//     context.clearRect(0, 0, size, size);

//     // Bright, non-dark color mapping
//     const ballColor = billiardBallColors[num] || '#3498db'; // Default to Bright Blue if not found

//     // Full background color for the ball
//     context.fillStyle = ballColor;
//     context.beginPath();
//     context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
//     context.closePath();
//     context.fill();

//     // White circle for label background
//     context.beginPath();
//     context.arc(size / 2, size / 2, size / 4, 0, Math.PI * 2);
//     context.closePath();
//     context.fillStyle = '#ffffff'; // White background for the number
//     context.fill();

//     // Number label in the center of the ball
//     context.fillStyle = '#000000';  // Number color (Black for contrast)
//     context.font = 'bold 36px sans-serif';
//     context.textAlign = 'center';
//     context.textBaseline = 'middle';
//     context.fillText(num + '', size / 2, size / 2);

//     // Creating texture from the canvas
//     const textureCanvas = new THREE.CanvasTexture(imageCanvas);
//     textureCanvas.wrapS = THREE.RepeatWrapping;
//     textureCanvas.wrapT = THREE.RepeatWrapping;
//     textureCanvas.repeat.set(1, 1);
//     textureCanvas.needsUpdate = true;

//     return textureCanvas;
// }

function makeTexture(num) {
  const size = 110;
  imageCanvas.width = imageCanvas.height = size;

  context.fillStyle = "rgb(255,255,255)";
  context.fillRect(0, 0, size, size);

  // Draw the left (top) plane label
  context.fillStyle = "rgb(0,0,0)";
  context.font = "30px fantasy";
  context.textAlign = "center";
  context.textBaseline = "middle";

  // Top plane label (above the center)
  context.fillText(num + "", size / 4, size / 2);

  // Draw the right (bottom) plane label
  // Bottom plane label (below the center)
  context.fillText(num + "", (size / 4) * 3, size / 2);

  var textureCanvas = new THREE.CanvasTexture(imageCanvas);
  // textureCanvas.repeat.set(2, 1); // Repeat the texture horizontally, but not vertically
  // textureCanvas.wrapS = THREE.RepeatWrapping;
  // textureCanvas.wrapT = THREE.RepeatWrapping;

  return textureCanvas;
}

export class Ball {
  static sphereCM;
  sphere;
  sphereBody;
  /** @type {THREE.Scene} */
  // scene;
  // world;
  radius;
  isSelected;
  isEnd;
  isOnTable;
  number;
  userData;
  /** @param scene {THREE.Scene} */
  constructor(num) {
    // this.scene = scene;
    // this.world = world;
    this.radius = radius;
    this.number = num;
    this.isSelected = false;
    this.isEnd = false;
    this.isOnTable = false;
    this.initGraphics();
    this.initPhysics();
    this.userData = {
      angle: undefined,
      speed: 1,
      isMoving: false
    };
  }

  initGraphics() {
    let sphereGeometry = sharedGeo;
    let sphereMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffff00'),
      // color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
      map: makeTexture(this.number),
      // emissive: 0x364a55,
      roughness: 0.01,
      metalness: 0.07,
      reflectivity: 0.2,
      // transparent: true,
      // opacity: .9,
      clearcoat: 0.1,
      clearcoatRoughness: 0.0,
    });
    this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.sphere.castShadow = true;
    this.sphere.receiveShadow = true;
    // this.scene.add(this.sphere);
  }
  initPhysics() {
    let sphereShape = new CANNON.Sphere(this.radius);
    // let sphereCM = new CANNON.Material()
    const speed = -12;
    this.sphereBody = new CANNON.Body({
      mass: 2.5,
      shape: sphereShape,
      position: new CANNON.Vec3(0, -8, 0),
      material: Ball.sphereCM,
      velocity: new CANNON.Vec3(
        Math.random() - 0.5,
        Math.random() * speed,
        Math.random() - 0.5
      ),
    });
    // this.world.add(this.sphereBody);
  }
  updateDisplayNumber(newDisplayNumber) {
    this.number = newDisplayNumber;
    if (this.sphere && this.sphere.material) {
      this.sphere.material.map = makeTexture(this.number);
      this.sphere.material.needsUpdate = true;
    }
  }
  release() {
    if (this.sphere) {
      this.sphere.geometry.dispose();
      if (this.sphere.material.map) {
        this.sphere.material.map.dispose();
      }
      this.sphere.material.dispose();
      this.sphere = null;
    }
  }
  moveToDrawBowl(index) {
    // Stop physics motion
    // this.sphereBody.velocity.set(0, 0, 0);
    // this.sphereBody.angularVelocity.set(0, 0, 0);
    // this.sphereBody.type = CANNON.Body.STATIC; // freeze completely

    // Calculate position in the bowl
    const angle = 90 * (Math.PI / 8); // spread around a quarter-circle
    // const angle = index * (Math.PI / 8); // spread around a quarter-circle
    const radius = 10;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const y = -12 + 0.8; // slightly above the container

    this.sphereBody.position.copy(new THREE.Vector3(x, y, z));
    this.sphereBody.quaternion.copy(this.sphereBody.quaternion);
    this.isOnTable = true;
  }
}
