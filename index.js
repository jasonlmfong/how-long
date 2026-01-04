import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import getStars from "./src/stars.js";
import initMarkerUI from "./src/markerUI.js";
import createGlobe from "./src/globe.js";
import initUI from "./src/ui.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    35,
    innerWidth / innerHeight,
    0.1,
    1000,
);
camera.position.set(0, 0, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const orbitCtrl = new OrbitControls(camera, renderer.domElement);
orbitCtrl.enableDamping = true;

const textureLoader = new THREE.TextureLoader();
const starSprite = textureLoader.load("./textures/circle.png");
const colorMap = textureLoader.load("./textures/earthmap4k.jpg");
const bumpMap = textureLoader.load("./textures/earthbump.jpg");

const globeGroup = createGlobe({ colorMap, bumpMap });
scene.add(globeGroup);

// for the location markers
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080820, 1.2);
scene.add(hemiLight);

const markerUI = initMarkerUI(globeGroup);
initUI(markerUI, orbitCtrl, camera);

const stars = getStars({ numStars: 4500, sprite: starSprite });
scene.add(stars);

function animate() {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
    orbitCtrl.update();
}
animate();

window.addEventListener(
    "resize",
    function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    },
    false,
);
