import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";
import { ease } from "./ease.js";


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
camera.position.z = 3;
const scene = new THREE.Scene();

//store materials for later manipulation

//wireframe mesh material
const wireMaterial = new THREE.ShaderMaterial({
    wireframe: true,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime:{value:0}, uOpacity:{value:1.0} },
    fragmentShader: `uniform float uOpacity;
        void main() { gl_FragColor = vec4(vec3(1.0, 1.0, 1.0), uOpacity); }`
});

//create standard material and inject shader code so that
//vertex displacement shader is compatible with lighting
const wobbleMaterial = new THREE.MeshStandardMaterial();
wobbleMaterial.onBeforeCompile = (shader) =>
{
    shader.uniforms.uTime = { value: 0 };

    //pass uniforms
    shader.vertexShader = `uniform float uTime;
        ` + shader.vertexShader;
    //begin_vertex is where transformed is calculated from vertex position
    shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>", `#include <begin_vertex>
        transformed.y += sin(transformed.x * 10.0 + uTime) * 0.1;`);

    //store for later access
    wobbleMaterial.userData.shader = shader;
    //apply vertex displacement to wireframe material
    wireMaterial.vertexShader = shader.vertexShader;
};

//see-through material
const seeMaterial = new THREE.MeshStandardMaterial({ color: "purple", flatShading: true });
seeMaterial.onBeforeCompile = (shader) =>
{
    shader.uniforms.uCullPoint = { value: new THREE.Vector3(0, 0, 0) };
    shader.uniforms.uCullRadius = { value: 0.0 };
    shader.uniforms.uResolution = { value: new THREE.Vector2(w, h) };

    //pass clip position and projection matrix to fragment shader
    shader.vertexShader = shader.vertexShader.replace(
        "#include <common>", `#include <common>
        varying vec4 vClipPosition;
        varying mat4 vProjectionMatrix;`);
    shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>", `#include <begin_vertex>
        vClipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vProjectionMatrix = projectionMatrix;`);

    //pass uniforms and varyings
    shader.fragmentShader = `varying vec4 vClipPosition;
        varying mat4 vProjectionMatrix;
        uniform vec3 uCullPoint;
        uniform float uCullRadius;
        uniform vec2 uResolution;
        ` + shader.fragmentShader;

    //cut see-through hole
    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
        vec4 cullClip = vProjectionMatrix * viewMatrix * vec4(uCullPoint, 1.0);
        vec2 cullNDC = cullClip.xy / cullClip.w;
        vec2 fragNDC = vClipPosition.xy / vClipPosition.w;
        //correct for aspect ratio
        vec2 cullCorrected = vec2(cullNDC.x * (uResolution.x / uResolution.y), cullNDC.y);
        vec2 fragCorrected = vec2(fragNDC.x * (uResolution.x / uResolution.y), fragNDC.y);
        float radiusNDC = uCullRadius / uResolution.y;
        if(distance(fragCorrected, cullCorrected) < radiusNDC) discard;
        `);

    //store for later access
    seeMaterial.userData.shader = shader;
};

//gltf loader
const modelLoader = new GLTFLoader();
let frog;
let wireMesh;
modelLoader.load(
    "./gremlin_frog/scene.gltf",
    function(gltf)
    {
        gltf.scene.traverse( (child) => {
            if(child.isMesh)
            {
                //create frog wireframe mesh using wireMaterial
                wireMesh = new THREE.Mesh(child.geometry, wireMaterial);
                wireMesh.scale.setScalar(1.001);
                scene.add(wireMesh);
                
                //apply frog texture to wobbleMaterial
                wobbleMaterial.map = child.material.map;
                //apply wobbleMaterial to frog
                child.material = wobbleMaterial;
            }
        });
        frog = gltf.scene;
        scene.add(frog);
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


const obst = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 2), seeMaterial);
scene.add(obst);
obst.position.z = -2;


//tick
let frogHole = 0;
let lastTime = 0;
function animate(t = 0)
{
    requestAnimationFrame(animate);
    let dt = t - lastTime;
    lastTime = t;
    
    //pulse wireMaterial opacity
    wireMaterial.uniforms.uOpacity.value = Math.sin(t * 0.001) / 2;
    wireMaterial.uniforms.uTime.value = t * 0.001;

    //update wobbleMaterial time
    if(wobbleMaterial.userData.shader)
        wobbleMaterial.userData.shader.uniforms.uTime.value = t * 0.001;

    //oscillate frog position
    if(frog)
    {
        frog.position.x = Math.sin(t * 0.001);
        wireMesh.position.x = frog.position.x;
    }
    
    //seeMaterial
    if(seeMaterial.userData.shader && frog)
    {
        seeMaterial.userData.shader.uniforms.uCullPoint.value = frog.position;

        const camToPoint = frog.position.clone().sub(camera.position);

        //see if frog is obscured and needs see-through cut-out
        const raycaster = new THREE.Raycaster();
        raycaster.set(camera.position, camToPoint.clone().normalize());
        raycaster.far = camToPoint.length();
        const intersects = raycaster.intersectObjects([ obst ], true);
        const obscured = intersects.length > 0;

        //size cullRadius relative to world size of object + easing
        const prevFrogHole = frogHole;
        frogHole = ease(frogHole, dt, 0.5, obscured);
        console.log(frogHole);
        if(frogHole > 0)
        {
            const distance = camToPoint.dot(camera.getWorldDirection(new THREE.Vector3()));
            const fovRad = camera.fov * (Math.PI / 180);
            const radiusPixels = (2.5 * h) / (2 * Math.tan(fovRad / 2) * distance);
            seeMaterial.userData.shader.uniforms.uCullRadius.value = radiusPixels * frogHole;
        }
        else if(prevFrogHole > 0)
            seeMaterial.userData.shader.uniforms.uCullRadius.value = 0;
    }

    //adapt to resized window
    if(window.innerWidth != w || window.innerHeight != h)
    {
        w = window.innerWidth;
        h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if(seeMaterial.userData.shader)
            seeMaterial.userData.shader.uniforms.uResolution.value = new THREE.Vector2(w, h);
    }

    renderer.render(scene, camera);
    controls.update();
}
animate();