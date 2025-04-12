import * as THREE from "three";
import * as CANNON from "cannon";
import { Ball } from "./modules/Ball";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
// import { HDRCubeTextureLoader } from "./HDRCubeTextureLoader";
// import { RoughnessMipmapper } from './RoughnessMipmapper.js';
// import { RGBELoader } from './modules/RGBELoader.js';
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
// import hdr from './assets/mirrored_hall_1k.hdr'
import hdr from './modules/royal_esplanade_1k.hdr'
import Stats from './modules/stats.module.js';
import { GUI } from 'dat.gui';

let world, scene, camera, renderer, pmremGenerator
let stats;
let envMap;
const MAX_BALLS = 99;

const balls = []

const guiData = {
    isRunning: false,
    timeStep: 1.0 / 72.0,
    hdr: true,
}
let isRunning = guiData.isRunning
let hdrBg = guiData.hdr
let timeStep = guiData.timeStep

window['t'] = THREE

function init() {
    // STATS
    stats = Stats();
    // document.body.appendChild(stats.dom);

    window.addEventListener('resize', onWindowResize, false);

    var gui = new GUI();
    gui.add(guiData, 'isRunning').onChange(() => isRunning = !isRunning);
    gui.add(guiData, 'timeStep').min(0).max(0.030).step(0.001).onChange((val) => timeStep = val);
    gui.add(guiData, 'hdr').onChange(() => {
        hdrBg = !hdrBg
        if (hdrBg && envMap) {
            scene.background = envMap;
            scene.environment = envMap;
        } else {
            scene.background = new THREE.Color('gray')
            scene.environment = null;
        }
    })
    gui.open();
    console.log('')
    timeStep = 0.02;

    initControllEvents();
    initGraphics()
    initPhysics()
    createBalls()
}

function createBalls() {
    for (let i = 0; i < 49; i++) {
        setTimeout(() => {
            addBallScene();
        }, 25 * i);
    }
}

function addBallScene() {
    if (balls.length < MAX_BALLS) {
        const b = new Ball(balls.length);
        balls.push(b);
        scene.add(b.sphere);
        world.add(b.sphereBody);
        document.getElementById("ball-count").textContent = balls.length;
    }
}

function removeBallScene() {
    if (balls.length > 0) {
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
        onHoldCallback(); // trigger immediately
        timeout = setTimeout(() => {
            interval = setInterval(onHoldCallback, 100); // repeat every 100ms
        }, 1000); // start repeating after 500ms
    };

    const stopHolding = () => {
        clearTimeout(timeout);
        clearInterval(interval);
    };

    button.addEventListener('mousedown', startHolding);
    button.addEventListener('touchstart', startHolding);

    button.addEventListener('mouseup', stopHolding);
    button.addEventListener('mouseleave', stopHolding);
    button.addEventListener('touchend', stopHolding);
}

function initControllEvents() {
    const increaseBtn = document.getElementById("increase-btn");
    const decreaseBtn = document.getElementById("decrease-btn");

    increaseBtn.addEventListener("click", addBallScene);
    decreaseBtn.addEventListener("click", removeBallScene);
    addHoldClickBehavior(increaseBtn, addBallScene);
    addHoldClickBehavior(decreaseBtn, removeBallScene);

    document.getElementById("start-btn").addEventListener("click", () => {
        isRunning = !isRunning;
        document.getElementById("start-btn").textContent = isRunning ? "Stop" : "Start";
    });
}

// function initGraphics() {
//     scene = new THREE.Scene()

//     camera = new THREE.PerspectiveCamera(
//         60,
//         window.innerWidth / window.innerHeight,
//         0.1,
//         1000
//     )
//     camera.position.set(20, 20, 20)
//     camera.lookAt({ x: 0, y: 0, z: 0 })

//     renderer = new THREE.WebGLRenderer({ antialias: true });
//     // renderer.setClearColor(0xeeeeee, 1.0)
//     renderer.shadowMap.enabled = true
//     renderer.shadowMap.type = 2
//     renderer.toneMapping = THREE.ACESFilmicToneMapping;
//     renderer.toneMappingExposure = 1.5;
//     renderer.outputColorSpace = THREE.SRGBColorSpace;
//     renderer.setPixelRatio(window.devicePixelRatio);
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     renderer.useLegacyLights = false;

//     document.body.appendChild(renderer.domElement);

//     scene.environmentIntensity = 2.0;

//     // var pmremGenerator = new THREE.PMREMGenerator(renderer);
//     // pmremGenerator.compileEquirectangularShader();

//     // loadENV(pmremGenerator)

//     const hdrUrl = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/abandoned_greenhouse_1k.hdr'
//     new RGBELoader().load(hdr, texture => {
//         const gen = new THREE.PMREMGenerator(renderer)
//         gen.compileEquirectangularShader();
//         const envMap = gen.fromEquirectangular(texture).texture
//         scene.environment = envMap
//         scene.background = envMap

//         texture.dispose()
//         gen.dispose()
//     })

//     const controls = new OrbitControls(camera, renderer.domElement)

//     // let ambientLight = new THREE.AmbientLight(0x404040, 1)
//     // scene.add(ambientLight)

//     let ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
//     scene.add(ambientLight);

//     // let spotLight = new THREE.SpotLight(0x999999)
//     // spotLight.position.set(-10, 30, 20)
//     // scene.add(spotLight)
//     let pointLight = new THREE.PointLight(0xccffcc, 3, 30)
//     pointLight.castShadow = true
//     pointLight.position.set(0, 10, 0)
//     scene.add(pointLight)

//     const sun = new THREE.DirectionalLight(0xffffff, 1);
//     sun.position.set(10, 30, 10);
//     sun.castShadow = true;
//     scene.add(sun);


//     // const sun = new THREE.DirectionalLight(0xffffff, 1);
//     // sun.position.set(10, 20, 10);
//     // sun.castShadow = true;
//     // scene.add(sun);

//     // Ground
//     let groundGeometry = new THREE.PlaneGeometry(200, 200, 32)
//     let groundMaterial = new THREE.MeshPhysicalMaterial({
//         color: new THREE.Color('grey'),
//         roughness: 0.0,
//         metalness: 0.0,
//         reflectivity: 1.0,
//         clearcoat: 1.0,
//         clearcoatRoughness: 0.0,
//         transmission: 1.0,
//         opacity: 1.0,
//         transparent: true,
//         envMapIntensity: 2.0,
//     })
//     let ground = new THREE.Mesh(groundGeometry, groundMaterial)
//     ground.rotation.x = -Math.PI / 2
//     ground.position.y = -46
//     ground.receiveShadow = true
//     scene.add(ground)

//     // Glass
//     let glassGeo = new THREE.SphereGeometry(12, 32, 32);
//     let glassMat = new THREE.MeshPhysicalMaterial({
//         side: THREE.DoubleSide,
//         color: new THREE.Color('grey'),
//         // emissive: 0x364a55,
//         roughness: 0,
//         metalness: .2,
//         reflectivity: 1,
//         transparent: true,
//         opacity: .3,
//         clearcoat: 1,
//         clearcoatRoughness: .35,
//         transmission: 1,
//         envMapIntensity: 2.0
//         // roughness: 0.0,
//         // thickness: 0
//         // wireframe: true
//     });
//     const glassMesh = new THREE.Mesh(glassGeo, glassMat);
//     // glassMesh.castShadow = true;
//     scene.add(glassMesh);

//     // Axes Helper
//     // var axesHelper = new THREE.AxesHelper(5);
//     // scene.add(axesHelper);

//     // Base Cylinder
//     var cylinderGeo = new THREE.CylinderGeometry(8, 11, 38, 32, 3, true);
//     var material = new THREE.MeshPhysicalMaterial({
//         side: THREE.DoubleSide,
//         color: new THREE.Color('rgb(60,60,60)'),
//         // emissive: new THREE.Color('rgb(78,0,0)'),
//         // emissiveIntensity: .1,
//         roughness: .1,
//         metalness: .6,
//         reflectivity: 1,
//         clearcoat: 1,
//         clearcoatRoughness: .3,
//     })
//     var base = new THREE.Mesh(cylinderGeo, material);
//     base.position.y -= 31.5
//     scene.add(base);

//     // Base Circle
//     const circleGeo = new THREE.CircleGeometry(8, 18);
//     const circle = new THREE.Mesh(circleGeo, material)
//     circle.receiveShadow = true
//     circle.rotation.x = 1.6
//     circle.position.y = -12
//     scene.add(circle)

//     // Hollow Circle
//     var arcShape = new THREE.Shape()
//         .moveTo(0, 0)
//         .absarc(0, 0, 60, 0, Math.PI * 2, false);

//     var holePath = new THREE.Path()
//         .moveTo(-0, 0)
//         .absarc(0, 0, 50, 0, Math.PI * 2, true);

//     arcShape.holes.push(holePath);
//     var hcGeometry = new THREE.ExtrudeGeometry(arcShape, { depth: 18, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 });

//     var hcMesh = new THREE.Mesh(hcGeometry, material);
//     hcMesh.position.set(0, -10, 0);
//     hcMesh.rotation.set(1.6, 0, 0);
//     hcMesh.scale.set(.1, .1, .1);
//     hcMesh.receiveShadow = true
//     scene.add(hcMesh)

//     // Solid Circle
//     arcShape = new THREE.Shape()
//         .moveTo(0, 0)
//         .absarc(0, 0, 120, 0, Math.PI * 2, false);

//     var scGeo = new THREE.ExtrudeGeometry(arcShape, { depth: 4, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 });

//     var scMesh = new THREE.Mesh(scGeo, material);
//     scMesh.position.set(0, -12, 0);
//     scMesh.rotation.set(1.6, 0, 0);
//     scMesh.scale.set(.1, .1, .1);
//     scMesh.receiveShadow = true
//     scene.add(scMesh)
// }

function initGraphics() {
    scene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(20, 20, 20)
    camera.lookAt({x: 0, y: 0, z: 0})

    renderer = new THREE.WebGLRenderer({ antialias: true });
    // renderer.setClearColor(0xeeeeee, 1.0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = 2
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.useLegacyLights = true;
    document.body.appendChild(renderer.domElement)

    var pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // loadENV(pmremGenerator)

    new RGBELoader().load(hdr, texture => {
        const gen = new THREE.PMREMGenerator(renderer)
        gen.compileEquirectangularShader();
        const envMap = gen.fromEquirectangular(texture).texture
        scene.environment = envMap
        scene.background = envMap

        texture.dispose()
        gen.dispose()
    })

    const controls = new OrbitControls(camera, renderer.domElement)

    let ambientLight = new THREE.AmbientLight(0x404040, 1)
    scene.add(ambientLight)
    // let spotLight = new THREE.SpotLight(0x999999)
    // spotLight.position.set(-10, 30, 20)
    // scene.add(spotLight)
    let pointLight = new THREE.PointLight('white', 3, 20)
    pointLight.castShadow = true
    pointLight.position.set(0, 4, 0)
    scene.add(pointLight)

    // Ground
    let groundGeometry = new THREE.PlaneGeometry(200, 200, 32)
    let groundMaterial = new THREE.MeshPhysicalMaterial({
        side: THREE.DoubleSide,
        color: new THREE.Color('black'),
        // emissive: 0x364a55,
        roughness: .3,
        metalness: 0,
        reflectivity: .3,
        // transparent: true,
        // transparency: .7,
        clearcoat: 1,
        clearcoatRoughness: .3,
        
        // wireframe: true
    })
    let ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -46
    ground.receiveShadow = true
    scene.add(ground)

    // Glass
    let glassGeo = new THREE.SphereGeometry(12, 32, 32);
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
        metalness: 0,              // Glass is non-metallic
        roughness: 0,              // Perfectly smooth for clear glass
        transmission: 1.0,         // Enables transparency using real refraction
        thickness: 0.1,            // Thickness of the glass (in world units)
        ior: 1.0,                 // Index of Refraction for glass
        transparent: true,
        opacity: 0.9,              // Combined with transmission
        envMapIntensity: 2.0,      // Environment reflection intensity
        clearcoat: 0.7,            // For extra shine
        clearcoatRoughness: 0.0
      });

      
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    // glassMesh.castShadow = true;
    scene.add(glassMesh);

    // Axes Helper
    // var axesHelper = new THREE.AxesHelper( 5 );
    // scene.add( axesHelper );

    // Base Cylinder
    var cylinderGeo = new THREE.CylinderGeometry(8, 11, 38, 32, 3, true);
    var material = new THREE.MeshPhysicalMaterial({
        side: THREE.DoubleSide,
        color: new THREE.Color('rgb(60,60,60)'),
        // emissive: new THREE.Color('rgb(78,0,0)'),
        // emissiveIntensity: .1,
        roughness: .1,
        metalness: .6,
        reflectivity: 1,
        clearcoat: 1,
        clearcoatRoughness: .3,
    })
    var base = new THREE.Mesh(cylinderGeo, material);
    base.position.y -= 31.5
    scene.add(base);

    // Base Circle
    const circleGeo = new THREE.CircleGeometry(8, 18);
    const circle = new THREE.Mesh(circleGeo, material)
    circle.receiveShadow = true
    circle.rotation.x = 1.6
    circle.position.y = -12
    scene.add(circle)

    // Hollow Circle
    var arcShape = new THREE.Shape()
        .moveTo(0, 0)
        .absarc(0, 0, 60, 0, Math.PI * 2, false);

    var holePath = new THREE.Path()
        .moveTo(-0, 0)
        .absarc(0, 0, 50, 0, Math.PI * 2, true);

    arcShape.holes.push(holePath);
    var hcGeometry = new THREE.ExtrudeGeometry(arcShape, { depth: 18, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 });

    var hcMesh = new THREE.Mesh(hcGeometry, material);
    hcMesh.position.set(0, -10, 0);
    hcMesh.rotation.set(1.6, 0, 0);
    hcMesh.scale.set(.1, .1, .1);
    hcMesh.receiveShadow = true
    scene.add(hcMesh)

    // Solid Circle
    arcShape = new THREE.Shape()
        .moveTo(0, 0)
        .absarc(0, 0, 120, 0, Math.PI * 2, false);

    var scGeo = new THREE.ExtrudeGeometry(arcShape, { depth: 4, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 });

    var scMesh = new THREE.Mesh(scGeo, material);
    scMesh.position.set(0, -12, 0);
    scMesh.rotation.set(1.6, 0, 0);
    scMesh.scale.set(.1, .1, .1);
    scMesh.receiveShadow = true
    scene.add(scMesh)
}

function initPhysics() {
    world = new CANNON.World()
    world.gravity.set(0, -60, 0)
    world.broadphase = new CANNON.NaiveBroadphase()

    // let sphereShape = new CANNON.Sphere(1)
    Ball.sphereCM = new CANNON.Material()
    // sphereBody = new CANNON.Body({
    //     mass: 5,
    //     shape: sphereShape,
    //     position: new CANNON.Vec3(0, 10, 0),
    //     material: Ball.sphereCM
    // })
    // world.addBody(sphereBody)

    let groundShape = new CANNON.Plane()
    let groundCM = new CANNON.Material()
    let groundBody = new CANNON.Body({
        mass: 0,
        shape: groundShape,
        material: groundCM
    })
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    // world.addBody(groundBody)

    // let sphereGroundContact = new CANNON.ContactMaterial(groundCM, Ball.sphereCM, {
    //     friction: 0,
    //     restitution: .7
    // })
    // world.addContactMaterial(sphereGroundContact)

}

function intersect(sphere, other) {
    // we are using multiplications because it's faster than calling Math.pow
    var distance = Math.sqrt((sphere.position.x - other.position.x) * (sphere.position.x - other.position.x) +
        (sphere.position.y - other.position.y) * (sphere.position.y - other.position.y) +
        (sphere.position.z - other.position.z) * (sphere.position.z - other.position.z));
    return distance < (sphere.shapes[0].radius + other.radius);
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

    new RGBELoader().load(hdr, texture => {
        const gen = new THREE.PMREMGenerator(renderer)
        gen.compileEquirectangularShader();
        pmremGenerator = gen.fromEquirectangular(texture).texture
        scene.environment = envMap
        scene.background = envMap

        texture.dispose()
        gen.dispose()
    })
}

function render() {
    world.step(timeStep)
    if (balls) {
        balls.forEach(ball => {
            if (!intersect(ball.sphereBody, { position: { x: 0, y: 0, z: 0 }, radius: 10 })) {
                // console.log(1);
                const v = ball.sphereBody.velocity
                const p = ball.sphereBody.position
                ball.sphereBody.velocity.copy(new CANNON.Vec3(-p.x, -p.y, -p.z))
            } else {
                const speed = isRunning ? 80 : 20
                if (ball.sphereBody.position.y < -9)
                    ball.sphereBody.velocity.copy(new CANNON.Vec3((Math.random() - 0.5), Math.random() * speed, (Math.random() - 0.5)))
            }

            ball.sphere.position.copy(ball.sphereBody.position)
            ball.sphere.quaternion.copy(ball.sphereBody.quaternion)
        })
    }

    requestAnimationFrame(render)
    renderer.render(scene, camera)
    stats.update();
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

init()
render()