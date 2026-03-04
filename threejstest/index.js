import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";


let w = window.innerWidth;
let h = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

const fov = 75;
const aspect = w / h;
const near = 0.1;
const far = 10;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 2;
const scene = new THREE.Scene();

//gltf loader
const modelLoader = new GLTFLoader();
modelLoader.load(
    "./gremlin_frog/scene.gltf",
    function(gltf) { scene.add(gltf.scene) }
)

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

/*const geo = new THREE.IcosahedronGeometry(1.0, 2);
const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);

const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
const wireMesh = new THREE.Mesh(geo, wireMat);
wireMesh.scale.setScalar(1.001);
mesh.add(wireMesh);*/

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000);
scene.add(hemiLight);


function animate()
{
    requestAnimationFrame(animate);
    
    //adapt to resized window
    if(window.innerWidth != w || window.innerHeight != h)
    {
        w = window.innerWidth;
        h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    controls.update();
}
animate();