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
camera.position.z = 4;
const scene = new THREE.Scene();

//store materials for later manipulation

//wireframe mesh material
const wireMaterial = new THREE.ShaderMaterial({
    wireframe: true,
    transparent: true,
    uniforms: { uTime:{value:0}, uOpacity:{value:1.0} },
    fragmentShader: `uniform float uOpacity;
        void main() { gl_FragColor = vec4(vec3(1.0, 1.0, 1.0), uOpacity); }`
});

//silhouette material
const silMaterial = new THREE.ShaderMaterial({
    color: "white",
    depthTest: true,
    depthWrite: false,
    depthFunc: THREE.GreaterDepth,
    transparent: true,
    colorWrite: true,
    uniforms: { uTime:{value:0} },
    fragmentShader: `
        void main() { gl_FragColor = vec4(vec3(1.0, 1.0, 1.0), 1.0); }`
})

//create standard material and inject shader code so that
//vertex displacement shader is compatible with lighting
const wobbleMaterial = new THREE.MeshStandardMaterial({ color: "white" });
wobbleMaterial.onBeforeCompile = (shader) =>
{
    shader.uniforms.uTime = { value: 0 };

    shader.vertexShader = `uniform float uTime;
        ` + shader.vertexShader;
    //begin_vertex is where transformed is calculated from vertex position
    shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>", `#include <begin_vertex>
        transformed.y += sin(transformed.x * 10.0 + uTime) * 0.1;
        `);

    //store for later access
    wobbleMaterial.userData.shader = shader;
    //apply vertex displacement to wireframe material
    wireMaterial.vertexShader = shader.vertexShader;
    silMaterial.vertexShader = shader.vertexShader;
};

//gltf loader
const modelLoader = new GLTFLoader();
modelLoader.load(
    "./gremlin_frog/scene.gltf",
    function(gltf)
    {
        gltf.scene.traverse( (child) => {
            if(child.isMesh)
            {
                //create frog wireframe mesh using wireMaterial
                const wireMesh = new THREE.Mesh(child.geometry, wireMaterial);
                wireMesh.scale.setScalar(1.001);
                scene.add(wireMesh);

                //add silhouette mesh using silMaterial
                const silMesh = new THREE.Mesh(child.geometry, silMaterial);
                scene.add(silMesh);
                
                //apply frog texture to wobbleMaterial
                wobbleMaterial.map = child.material.map;
                //apply wobbleMaterial to frog
                child.material = wobbleMaterial;
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
const hemiLight = new THREE.HemisphereLight("red", "blue");
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight("white", 2);
dirLight.position.set(-5, 5, 5);
scene.add(dirLight);

const pointLight = new THREE.PointLight("green", 2, 50);
pointLight.position.set(0.75, -0.25, 0);
scene.add(pointLight);


const obst = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.0, 2),
    new THREE.MeshStandardMaterial({ color: "purple", flatShading: true })
)
scene.add(obst);
obst.position.z = 2;


//tick
function animate(t = 0)
{
    requestAnimationFrame(animate);
    
    //pulse wireMaterial opacity
    wireMaterial.uniforms.uOpacity.value = Math.sin(t * 0.001) / 2;
    wireMaterial.uniforms.uTime.value = t * 0.001;
    silMaterial.uniforms.uTime.value = t * 0.001;
    if(wobbleMaterial.userData.shader)
        wobbleMaterial.userData.shader.uniforms.uTime.value = t * 0.001;

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