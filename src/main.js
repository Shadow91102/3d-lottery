import * as THREE from "three";
import * as CANNON from "cannon";
import { Ball } from "./modules/Ball";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
// import hdr from './assets/mirrored_hall_1k.hdr'
import hdr from "./modules/royal_esplanade_1k.hdr";
import Stats from "./modules/stats.module.js";
import { GUI } from "dat.gui";

let world, scene, camera, renderer, pmremGenerator;
let stats;
let envMap;
let holeY;
let holeRadius;
let containerCenter;
let selectedBalls = new Set();
const displaySlotPosition = new THREE.Vector3(15, 10, 0); // top-right corner of the screen
const ballSpacing = 4;
const selectedBallIds = new Set(); // Keep track of which balls are already shown
let lotteryStartTime;
let drawnBalls = [];
let preselectedNumbers = [];
let leftNumbers = [];
let isEnd;
const BALL_RADIUS = 0.4;
const CIRCLE_RADIUS = 10;
const NUM_BALLS = 5;
const angleBetweenBalls = Math.asin((2 * BALL_RADIUS + 0.2) / CIRCLE_RADIUS); // +0.2 safety
const targetAngles = [];
const MAX_BALLS = 99;
const rotationSpeed = 0.5;

const balls = [];

const guiData = {
  isRunning: false,
  timeStep: 1.0 / 72.0,
  hdr: true,
};
let isRunning = guiData.isRunning;
let hdrBg = guiData.hdr;
let timeStep = guiData.timeStep;

window["t"] = THREE;

function init() {
  // STATS
  stats = Stats();
  // document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize, false);

  var gui = new GUI();
  gui.add(guiData, "isRunning").onChange(() => (isRunning = !isRunning));
  gui
    .add(guiData, "timeStep")
    .min(0)
    .max(0.03)
    .step(0.001)
    .onChange((val) => (timeStep = val));
  gui.add(guiData, "hdr").onChange(() => {
    hdrBg = !hdrBg;
    if (hdrBg && envMap) {
      scene.background = envMap;
      scene.environment = envMap;
    } else {
      scene.background = new THREE.Color("gray");
      scene.environment = null;
    }
  });
  gui.open();
  console.log("");
  timeStep = 0.02;

  initControllEvents();
  initGraphics();
  initPhysics();
  createBalls();
}

function createBalls(count = 49) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      addBallScene();
    }, 25 * i);
  }
}

function initGame() {}

function addBallScene() {
  if (balls.length < MAX_BALLS && !isRunning) {
    const b = new Ball(balls.length);
    balls.push(b);
    scene.add(b.sphere);
    world.add(b.sphereBody);
    document.getElementById("ball-count").textContent = balls.length;
  }
}

function removeBallScene() {
  if (balls.length > 0 && !isRunning) {
    const ball = balls.pop();
    scene.remove(ball.sphere);
    world.remove(ball.sphereBody);
    document.getElementById("ball-count").textContent = balls.length;
  }
}

function addHoldClickBehavior(button, onHoldCallback) {
  let interval = null;
  let timeout = null;

  const startHolding = () => {
    // onHoldCallback(); // trigger immediately
    timeout = setTimeout(() => {
      interval = setInterval(onHoldCallback, 100); // repeat every 100ms
    }, 500); // start repeating after 500ms
  };

  const stopHolding = () => {
    clearTimeout(timeout);
    clearInterval(interval);
  };

  button.addEventListener("mousedown", startHolding);
  button.addEventListener("touchstart", startHolding);

  button.addEventListener("mouseup", stopHolding);
  button.addEventListener("mouseleave", stopHolding);
  button.addEventListener("touchend", stopHolding);
}

function initControllEvents() {
  const increaseBtn = document.getElementById("increase-btn");
  const decreaseBtn = document.getElementById("decrease-btn");

  increaseBtn.addEventListener("click", addBallScene);
  decreaseBtn.addEventListener("click", removeBallScene);
  addHoldClickBehavior(increaseBtn, addBallScene);
  addHoldClickBehavior(decreaseBtn, removeBallScene);

  document.getElementById("start-btn").addEventListener("click", () => {
    if (!isRunning) {
      showDrawDialog(balls.length, function (selectedNumbers) {
        preselectedNumbers = selectedNumbers;
        leftNumbers = [...selectedNumbers];
        isRunning = true;
        lotteryStartTime = performance.now();
        drawnBalls.length = 0;
        chageStartButtonText();
        // You can store selectedNumbers if needed
      });
    } else {
      isRunning = false;
      clear();
      chageStartButtonText();
    }
  });
}

function chageStartButtonText() {
  document.getElementById("start-btn").textContent = isRunning
    ? "Stop"
    : "🎲 Start Lottery";
}

function showDrawDialog(totalBalls, onConfirm) {
  const dialog = document.getElementById("draw-dialog");
  const numbersContainer = document.getElementById("draw-numbers");

  // Generate 5 unique random numbers
  const selectedNumbers = [];
  const numbersPool = Array.from({ length: totalBalls }, (_, i) => i + 1);
  for (let i = 0; i < 5; i++) {
    const index = Math.floor(Math.random() * numbersPool.length);
    selectedNumbers.push(numbersPool.splice(index, 1)[0]);
  }

  // Populate numbers visually
  numbersContainer.innerHTML = "";
  selectedNumbers.forEach((n) => {
    const span = document.createElement("span");
    span.textContent = n;
    numbersContainer.appendChild(span);
  });

  // Show the dialog
  dialog.classList.remove("hidden");

  // Event handlers
  document.getElementById("confirm-draw-btn").onclick = () => {
    dialog.classList.add("hidden");
    onConfirm(selectedNumbers); // Pass numbers to your startDraw logic
  };

  document.getElementById("cancel-draw-btn").onclick = () => {
    dialog.classList.add("hidden");
  };
}

function initGraphics() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(40, 10, 0);
  camera.lookAt({ x: 0, y: 0, z: 0 });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  // renderer.setClearColor(0xeeeeee, 1.0)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = 2;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.useLegacyLights = true;
  document.body.appendChild(renderer.domElement);

  var pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // loadENV(pmremGenerator)

  new RGBELoader().load(hdr, (texture) => {
    const gen = new THREE.PMREMGenerator(renderer);
    gen.compileEquirectangularShader();
    const envMap = gen.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    scene.background = envMap;

    texture.dispose();
    gen.dispose();
  });

  const controls = new OrbitControls(camera, renderer.domElement);

  let ambientLight = new THREE.AmbientLight(0x404040, 1);
  scene.add(ambientLight);
  // let spotLight = new THREE.SpotLight(0x999999)
  // spotLight.position.set(-10, 30, 20)
  // scene.add(spotLight)
  let pointLight = new THREE.PointLight("white", 3, 20);
  pointLight.castShadow = true;
  pointLight.position.set(0, 4, 0);
  scene.add(pointLight);

  // Ground
  let groundGeometry = new THREE.PlaneGeometry(200, 200, 32);
  let groundMaterial = new THREE.MeshPhysicalMaterial({
    side: THREE.DoubleSide,
    color: new THREE.Color("black"),
    // emissive: 0x364a55,
    roughness: 0.3,
    metalness: 0,
    reflectivity: 0.3,
    // transparent: true,
    // transparency: .7,
    clearcoat: 1,
    clearcoatRoughness: 0.3,

    // wireframe: true
  });
  let ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -46;
  ground.receiveShadow = true;
  scene.add(ground);

  // Glass
  // let glassGeo = new THREE.SphereGeometry(12, 32, 32);
  let glassGeo = new THREE.SphereGeometry(
    12, // radius
    64,
    32, // segments
    0,
    Math.PI * 2, // full circle horizontally
    0.035 * Math.PI,
    Math.PI // only bottom half vertically = bowl
  );

  // let glassMat = new THREE.MeshPhysicalMaterial({
  //     side: THREE.DoubleSide,
  //     color: new THREE.Color('gray'),
  //     // emissive: 0x364a55,
  //     roughness: 0,
  //     metalness: .65,
  //     reflectivity: 1,
  //     transparent: true,
  //     opacity: .3,
  //     clearcoat: 1,
  //     clearcoatRoughness: .5,
  //     // wireframe: true
  // });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0, // Glass is non-metallic
    roughness: 0, // Perfectly smooth for clear glass
    transmission: 1.0, // Enables transparency using real refraction
    thickness: 0.1, // Thickness of the glass (in world units)
    ior: 1.0, // Index of Refraction for glass
    transparent: true,
    opacity: 0.9, // Combined with transmission
    envMapIntensity: 2.0, // Environment reflection intensity
    clearcoat: 0.7, // For extra shine
    clearcoatRoughness: 0.0,
  });

  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  // glassMesh.castShadow = true;
  scene.add(glassMesh);

  // glassMesh.rotation.x = -Math.PI / 2; // Flip it to be bowl-shaped

  // Ball radius (e.g., from your project)
  // const ballRadius = 1.0;
  // const holeRadius = 12 * Math.sin(Math.PI * 0.03); // Adjusted to match the bowl's radius

  // // Hole Cylinder Geometry
  // const holeGeo = new THREE.CylinderGeometry(holeRadius, holeRadius, 24, 64); // height must be large enough
  // const holeMesh = new THREE.Mesh(holeGeo, glassMat.clone());
  // holeMesh.rotation.z = Math.PI / 2; // Orient vertically
  // holeMesh.position.set(0, 0, 0); // Centered on top

  // // Subtract hole from bowl
  // const bowlCSG = CSG.fromMesh(glassMesh);
  // const holeCSG = CSG.fromMesh(holeMesh);
  // const finalCSG = bowlCSG.subtract(holeCSG);

  // const finalGlassMesh = CSG.toMesh(finalCSG, glassMesh.matrix, glassMat);
  // scene.add(finalGlassMesh);

  // Axes Helper
  var axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // THREE.js mesh
  //   const drawBowlGeometry = new THREE.BoxGeometry(4, 1, 2); // width, height, depth
  //   const drawBowlMaterial = new THREE.MeshStandardMaterial({
  //     color: 0xdddddd,
  //     // transparent: true,
  //     opacity: 0.4,
  //   });
  //   const drawBowlMesh = new THREE.Mesh(drawBowlGeometry, drawBowlMaterial);
  //   drawBowlMesh.position.set(0, 0 - 8, 10); // Place above container
  //   scene.add(drawBowlMesh);

  holeY = 12 * Math.cos(0.035 * Math.PI);
  holeRadius = 12 * Math.sin(0.035 * Math.PI);
  containerCenter = glassMesh.position;

  // Base Cylinder
  var cylinderGeo = new THREE.CylinderGeometry(8, 11, 38, 32, 3, true);
  var material = new THREE.MeshPhysicalMaterial({
    side: THREE.DoubleSide,
    color: new THREE.Color("rgb(60,60,60)"),
    // emissive: new THREE.Color('rgb(78,0,0)'),
    // emissiveIntensity: .1,
    roughness: 0.1,
    metalness: 0.6,
    reflectivity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.3,
  });
  var base = new THREE.Mesh(cylinderGeo, material);
  base.position.y -= 31.5;
  scene.add(base);

  // Base Circle
  const circleGeo = new THREE.CircleGeometry(8, 18);
  const circle = new THREE.Mesh(circleGeo, material);
  circle.receiveShadow = true;
  circle.rotation.x = 1.6;
  circle.position.y = -12;
  scene.add(circle);

  // Hollow Circle
  var arcShape = new THREE.Shape()
    .moveTo(0, 0)
    .absarc(0, 0, 60, 0, Math.PI * 2, false);

  var holePath = new THREE.Path()
    .moveTo(-0, 0)
    .absarc(0, 0, 50, 0, Math.PI * 2, true);

  arcShape.holes.push(holePath);
  var hcGeometry = new THREE.ExtrudeGeometry(arcShape, {
    depth: 18,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 2,
    bevelSize: 1,
    bevelThickness: 1,
  });

  var hcMesh = new THREE.Mesh(hcGeometry, material);
  hcMesh.position.set(0, -10, 0);
  hcMesh.rotation.set(1.6, 0, 0);
  hcMesh.scale.set(0.1, 0.1, 0.1);
  hcMesh.receiveShadow = true;
  scene.add(hcMesh);

  // Solid Circle
  arcShape = new THREE.Shape()
    .moveTo(0, 0)
    .absarc(0, 0, 120, 0, Math.PI * 2, false);

  var scGeo = new THREE.ExtrudeGeometry(arcShape, {
    depth: 4,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 2,
    bevelSize: 1,
    bevelThickness: 1,
  });

  var scMesh = new THREE.Mesh(scGeo, material);
  scMesh.position.set(0, -12, 0);
  scMesh.rotation.set(1.6, 0, 0);
  scMesh.scale.set(0.1, 0.1, 0.1);
  scMesh.receiveShadow = true;
  scene.add(scMesh);
}

function initPhysics() {
  world = new CANNON.World();
  world.gravity.set(0, -100, 0);
  world.broadphase = new CANNON.NaiveBroadphase();

  // let sphereShape = new CANNON.Sphere(1)
  Ball.sphereCM = new CANNON.Material();
  // sphereBody = new CANNON.Body({
  //     mass: 5,
  //     shape: sphereShape,
  //     position: new CANNON.Vec3(0, 10, 0),
  //     material: Ball.sphereCM
  // })
  // world.addBody(sphereBody)

  let groundShape = new CANNON.Plane();
  let groundCM = new CANNON.Material();
  let groundBody = new CANNON.Body({
    mass: 0,
    shape: groundShape,
    material: groundCM,
  });
  groundBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(1, 0, 0),
    -Math.PI / 2
  );

  //   Cannon.js body (optional, if balls will collide with it)
  const drawBowlShape = new CANNON.Box(new CANNON.Vec3(2, 0.5, 1));
  const drawBowlBody = new CANNON.Body({
    mass: 0, // Static
    shape: drawBowlShape,
    position: new CANNON.Vec3(0, 0 - 8, 10),
  });
  world.addBody(drawBowlBody);
  // world.addBody(groundBody)

  // let sphereGroundContact = new CANNON.ContactMaterial(groundCM, Ball.sphereCM, {
  //     friction: 0,
  //     restitution: .7
  // })
  // world.addContactMaterial(sphereGroundContact)
}

function isInHole(sphere) {
  // console.log('-containerCenter', containerCenter.x)
  const dx = sphere.position.x - containerCenter.x;
  // console.log('-containerCenter', containerCenter)
  const dz = sphere.position.z - containerCenter.z;
  const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);
  // console.log('-------------------distanceFromCenter------------------', (sphere.position.y + 0.8) >= holeY)
  return sphere.position.y + 0.8 >= holeY && distanceFromCenter <= holeRadius;
}

// function intersect(sphere, other) {
//     // we are using multiplications because it's faster than calling Math.pow
//     var distance = Math.sqrt((sphere.position.x - other.position.x) * (sphere.position.x - other.position.x) +
//         (sphere.position.y - other.position.y) * (sphere.position.y - other.position.y) +
//         (sphere.position.z - other.position.z) * (sphere.position.z - other.position.z));
//     return distance < (sphere.shapes[0].radius + other.radius);
// }

function intersect(sphere, other) {
  const dx = sphere.position.x - other.position.x;
  const dy = sphere.position.y - other.position.y;
  const dz = sphere.position.z - other.position.z;

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  return distance < sphere.shapes[0].radius + other.radius;
}

function showResultDialog(expectedNumbers, drawnBalls) {
  const dialog = document.getElementById("result-dialog");
  const expectedContainer = document.getElementById("expected-numbers");
  const drawnContainer = document.getElementById("drawn-numbers");

  expectedContainer.innerHTML = "";
  drawnContainer.innerHTML = "";

  // Normalize both lists for comparison
  const expectedSet = new Set(expectedNumbers);
  const drawnNumbers = drawnBalls.map((ball) => ball.number); // You must store number on each ball

  expectedNumbers.forEach((n) => {
    const span = document.createElement("span");
    span.textContent = n;
    expectedContainer.appendChild(span);
  });

  drawnNumbers.forEach((n) => {
    const span = document.createElement("span");
    span.textContent = n;
    if (expectedSet.has(n)) span.classList.add("match");
    drawnContainer.appendChild(span);
  });

  dialog.classList.remove("hidden");

  document.getElementById("close-result-btn").onclick = () => {
    let ball;
    while ((ball = balls.pop())) {
      scene.remove(ball.sphere);
      world.remove(ball.sphereBody);
    }
    chageStartButtonText();
    clear();

    const count = document.getElementById("ball-count").textContent;
    createBalls(count);

    dialog.classList.add("hidden");
  };
}

function clear() {
  document.getElementById("selected-balls-container").innerHTML = "";
  drawnBalls.length = 0;
  targetAngles.length = 0;
  preselectedNumbers.length = 0;
  leftNumbers.length = 0;
  selectedBalls.clear();
}

function loadENV(pmremGenerator) {
  // new RGBELoader()
  //     .setDataType(THREE.UnsignedByteType)
  //     .load(hdr, function (texture) {
  //         envMap = pmremGenerator.fromEquirectangular(texture).texture;
  //         if (hdrBg) {
  //             scene.background = texture;
  //             scene.environment = texture;
  //         }

  //         texture.dispose();
  //         pmremGenerator.dispose();
  //     });

  new RGBELoader().load(hdr, (texture) => {
    const gen = new THREE.PMREMGenerator(renderer);
    gen.compileEquirectangularShader();
    pmremGenerator = gen.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    scene.background = envMap;

    texture.dispose();
    gen.dispose();
  });
}

async function displaySelectedBall(ball) {
  if (selectedBalls.has(ball.number)) return; // Avoid duplicates
  selectedBalls.add(ball.number);

  drawnBalls.push(ball);
  // Render ball in top-right slot logic already here...

  // const currentIndex = drawnBalls.length - 1;
  // const centerIndex = Math.floor(drawnBalls.length / 2);
  // targetAngles.push(currentIndex * angleBetweenBalls);
  // ball.userData.targetAngle = targetAngles[currentIndex];
  // ball.userData.isMoving = true;

  if (drawnBalls.length === 5) {
    isRunning = false;
    setTimeout(() => {
      showResultDialog(preselectedNumbers, drawnBalls);
    }, 1000); // Optional delay to show last ball before result
  }

  const container = document.getElementById("selected-balls-container");

  const ballDiv = document.createElement("div");
  ballDiv.className = "selected-ball";
  ballDiv.textContent = ball.number;
  container.appendChild(ballDiv);
}

function getCircularSlotPosition(index, total = 30) {
  index -= 2;
  const angle = (index / total) * Math.PI * 2;
  const x = 10 * Math.cos(angle);
  const z = 10 * Math.sin(angle);
  return new THREE.Vector3(x, -11, z);
}

async function moveBallToFrontDisplay(ball, index) {
  world.removeBody(ball.sphereBody); // stop physics

  const pos = getCircularSlotPosition(index);
  ball.sphere.position.copy(pos);
  ball.sphere.rotation.set(0, Math.PI / 2, 0);
}

async function detectOutBall(ball) {
  if (leftNumbers.findIndex((number) => number === ball.number) === -1) {
    const randomIndex = Math.floor(Math.random() * leftNumbers.length);
    const left = balls.find(
      (item) => item.number === leftNumbers[randomIndex]
    );
    if (left) {
      left.updateDisplayNumber(ball.number);
    }
    ball.updateDisplayNumber(leftNumbers[randomIndex]);
    leftNumbers.splice(randomIndex, 1);
  }
  ball.isEnd = true;
}

function render() {
  world.step(timeStep);

  const now = performance.now();
  const elapsed = (now - lotteryStartTime) / 1000; // in seconds

  if (balls) {
    balls.forEach( async (ball) => {
      const p = ball.sphereBody.position;
      const v = ball.sphereBody.velocity;

      // Calculate if the ball is near the top hole
      const dx = p.x,
        dz = p.z;
      const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);
      const holeRadius = 3;
      const topThreshold = 11.5;
      const isAtTopHole = p.y > topThreshold && distanceFromCenter < holeRadius;

      if (isRunning && isInHole(ball.sphereBody) && !ball.isEnd) {
        ball.isSelected = true;
        // ball.sphere.material.color.set('gold');  // Optional: highlight selected ball

        // Launch the ball (keep this as you already have)
        // const launchMultiplier = 1;
        // const v = ball.sphereBody.velocity;
        // ball.sphereBody.velocity.set(
        //   v.x * launchMultiplier,
        //   v.y * launchMultiplier,
        //   v.z * launchMultiplier
        // );

        if (!ball.isEnd) {
          await detectOutBall(ball);


          // ball.moveToDrawBowl(drawnBalls.length - 1);
        }

        // Now add the ball to the top-right display
        // drawnBalls.push(ball);
        await displaySelectedBall(ball); // Display the ball in the slot
        await moveBallToFrontDisplay(ball, drawnBalls.length - 1);
      }

      // When ball is NOT selected
      if (!ball.isSelected) {
        // If it escapes through the top hole
        if (
          !intersect(ball.sphereBody, {
            position: { x: 0, y: 0, z: 0 },
            radius: 10,
          })
        ) {
          ball.sphereBody.velocity.copy(new CANNON.Vec3(-p.x, -p.y, -p.z));
        }

        // If it's at the bottom, bounce it up
        else if (p.y < -9) {
          const speed = isRunning ? 140 : 20;
          ball.sphereBody.velocity.copy(
            new CANNON.Vec3(
              Math.random() - 0.5,
              Math.random() * speed,
              Math.random() - 0.5
            )
          );
        }
        ball.sphere.position.copy(p);
        ball.sphere.quaternion.copy(ball.sphereBody.quaternion);
      }


      
      // if (ball.isSelected && ball.isOnTable) {
      //   ball.isEnd = true;
      //   // updateSphereBallMovement(ball);
      //   // updateBallMovement(ball, new THREE.Vector3(0, -12, 0), 10);
      //   // updateBalls(0.2);
      //   // updateSelectedBallMovement(ball);
      // } else {
      // Sync visual with physics

      // }
    });

    // updateBalls(0.2)
  }

  requestAnimationFrame(render);
  renderer.render(scene, camera);
  stats.update();
}

function updateSelectedBallMovement(ball) {
  const CIRCLE_RADIUS = 10;
  const MOVE_SPEED = 2.5; // Slightly faster than rotation speed
  const ROTATE_SPEED = 0.01; // Constant rotation
  if (!ball.userData.angle) ball.userData.angle = 0;
  ball.userData.angle += ROTATE_SPEED;

  // Calculate new target position on circle
  const targetX = CIRCLE_RADIUS * Math.sin(ball.userData.angle);
  const targetZ = -CIRCLE_RADIUS * Math.cos(ball.userData.angle);
  const targetY = -12; // Set height of circle path (your platform Y position)

  const currentPos = ball.sphereBody.position;
  const targetPos = new THREE.Vector3(targetX, targetY, targetZ);

  // Calculate direction to move
  const direction = new THREE.Vector3();
  direction.subVectors(targetPos, currentPos).normalize();

  ball.sphereBody.velocity.set(
    direction.x * MOVE_SPEED,
    direction.y * MOVE_SPEED,
    direction.z * MOVE_SPEED
  );
  console.log("------ball.sphereBody.velocity------", ball.sphereBody.velocity);

  // --- Stop when arriving in front of camera ---
  const ballWorldPos = new THREE.Vector3();
  ball.sphere.getWorldPosition(ballWorldPos);

  const cameraWorldPos = new THREE.Vector3();
  camera.getWorldPosition(cameraWorldPos);

  const cameraDir = new THREE.Vector3();
  camera.getWorldDirection(cameraDir);

  const toBall = new THREE.Vector3();
  toBall.subVectors(ballWorldPos, cameraWorldPos).normalize();

  const horizontalCameraDir = new THREE.Vector3(
    cameraDir.x,
    0,
    cameraDir.z
  ).normalize();
  const horizontalToBall = new THREE.Vector3(toBall.x, 0, toBall.z).normalize();
  const angleBetween = horizontalCameraDir.angleTo(horizontalToBall);

  if (angleBetween < THREE.MathUtils.degToRad(8)) {
    // only horizontal
    ball.userData.isMoving = false;
    ball.sphereBody.velocity.set(0, 0, 0);

    // Final snap to exact circle point
    ball.sphereBody.position.set(targetX, targetY, targetZ);
  }
}

function updateBalls(deltaTime) {
  drawnBalls.forEach((ball) => {
    if (!ball.userData.isMoving && ball.isEnd) {
      ball.sphereBody.position.set(ball.sphereBody.position);
      ball.sphere.position.set(ball.sphere.position);
    }
    // console.log('----------ball----------', drawnBalls.length)

    // Get current position
    const ballWorldPos = new THREE.Vector3();
    ball.sphere.getWorldPosition(ballWorldPos);

    // Calculate current angle
    const currentAngle = Math.atan2(ballWorldPos.x, -ballWorldPos.z);

    // Calculate the difference between target and current
    let angleDiff = ball.userData.targetAngle - currentAngle;

    // Normalize angle to [-PI, PI]
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

    if (Math.abs(angleDiff) < THREE.MathUtils.degToRad(2)) {
      // Close enough, snap to final target angle
      const finalX = CIRCLE_RADIUS * Math.sin(ball.userData.targetAngle);
      const finalZ = -CIRCLE_RADIUS * Math.cos(ball.userData.targetAngle);

      const finalPosition = ball.sphereBody.position.clone();

      ball.sphereBody.velocity.set(0, 0, 0);
      ball.sphereBody.angularVelocity.set(0, 0, 0);
      ball.sphereBody.position.set(finalX, -11, finalZ);
      ball.sphere.position.copy(ball.sphereBody.position);
      ball.sphereBody.position.copy(ball.sphereBody.position);
      ball.userData.isMoving = false;
    } else {
      // Move along circle path
      const angularVelocity = (angleDiff > 0 ? 1 : -1) * rotationSpeed;

      const currentRadius = Math.sqrt(
        ballWorldPos.x ** 2 + ballWorldPos.z ** 2
      );
      const moveAngle = currentAngle + angularVelocity * deltaTime;

      const newX = currentRadius * Math.sin(moveAngle);
      const newZ = -currentRadius * Math.cos(moveAngle);

      ball.sphereBody.velocity.set(0, 0, 0);
      ball.sphereBody.angularVelocity.set(0, 0, 0);
      ball.sphereBody.position.set(newX, -11, newZ);
      ball.sphere.position.copy(ball.sphereBody.position);
    }
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
render();
