import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";


//set up canvas
let w = window.innerWidth;
let h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

//set up scene
const fov = 75;
const aspect = w / h;
const near = 0.1;
const far = 10;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 2;
const scene = new THREE.Scene();

//store wireMaterial for later manipulation
const wireMaterial = new THREE.MeshBasicMaterial({
    color: "white",
    wireframe: true,
    transparent: true,
    opacity: 1
});

//gltf loader
const modelLoader = new GLTFLoader();
modelLoader.load(
    "./gremlin_frog/scene.gltf",
    function(gltf)
    {
        gltf.scene.traverse( (child) => {
            if(child.isMesh)
            {
                const wireMesh = new THREE.Mesh(child.geometry, wireMaterial);
                wireMesh.scale.setScalar(1.001);
                scene.add(wireMesh);
            }
        });
        scene.add(gltf.scene)
    }
)

//orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

//lighting
const hemiLight = new THREE.HemisphereLight("white", "black");
scene.add(hemiLight);


//tick
function animate(t = 0)
{
    requestAnimationFrame(animate);
    
    //pulse wireMaterial opacity
    wireMaterial.opacity = Math.sin(t * 0.001) / 2;

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