import {
  AmbientLight,
  AxesHelper,
  DirectionalLight,
  GridHelper,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Raycaster,
  Vector2,
  MeshLambertMaterial,
  MeshBasicMaterial
} from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {IFCLoader} from "web-ifc-three";
import { computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";

//Creates the Three.js scene
const scene = new Scene();

//Object to store the size of the viewport
const size = {
  width: window.innerWidth,
  height: window.innerHeight,
};

//Creates the camera (point of view of the user)
const camera = new PerspectiveCamera(75, size.width / size.height);
camera.position.z = 15;
camera.position.y = 13;
camera.position.x = 8;


//Creates the lights of the scene
const lightColor = 0xffffff;

const ambientLight = new AmbientLight(lightColor, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(lightColor, 2);
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

//Sets up the renderer, fetching the canvas of the HTML
const threeCanvas = document.getElementById("three-canvas");
const renderer = new WebGLRenderer({ canvas: threeCanvas, alpha: true });
renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

//Creates grids and axes in the scene
const grid = new GridHelper(50, 30);
scene.add(grid);

const axes = new AxesHelper();
axes.material.depthTest = false;
axes.renderOrder = 1;
scene.add(axes);

//Creates the orbit controls (to navigate the scene)
const controls = new OrbitControls(camera, threeCanvas);
controls.enableDamping = true;
controls.target.set(-2, 0, 0);

//Animation loop
const animate = () => {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();

//Adjust the viewport to the size of the browser
window.addEventListener("resize", () => {
  (size.width = window.innerWidth), (size.height = window.innerHeight);
  camera.aspect = size.width / size.height;
  camera.updateProjectionMatrix();
  renderer.setSize(size.width, size.height);
});




// IFC Loading
const loader = new IFCLoader();
const input = document.getElementById('file-input');

loader.ifcManager.setupThreeMeshBVH(computeBoundsTree, disposeBoundsTree, acceleratedRaycast);

const ifcModels = [];

input.addEventListener('change', async () =>{
  const file = input.files[0];
  const url = URL.createObjectURL(file);
  const model = await loader.loadAsync(url);
  scene.add(model);
  ifcModels.push(model);
});


// IFC selecting and higlithing
const raycaster = new Raycaster();
raycaster.firstHitOnly = true;
const mouse = new Vector2();

const highlightMaterial = new MeshBasicMaterial({
  transparent: true,
  opacity: 0.6,
  color: 0xff88ff,
  depthTest: false
});

const selectionMaterial = new MeshBasicMaterial({
  transparent: true,
  opacity: 0.6,
  color: 0xaa88aa,
  depthTest: false
});


function cast(event) {
  const bounds = threeCanvas.getBoundingClientRect();
  const x1 = event.clientX - bounds.left;
  const x2 = bounds.right - bounds.left;
  mouse.x = (x1/x2)*2 -1;

  const y1 = event.clientY - bounds.top;
  const y2 = bounds.bottom - bounds.top;
  mouse.y = -(y1/y2) * 2 + 1;

  raycaster.setFromCamera(mouse,camera);

  return raycaster.intersectObjects(ifcModels)[0];

}


let lastModel;

async function pick(event,material,getProps) {
  const found = cast(event);
  if(found) {
    const index = found.faceIndex;
    lastModel = found.object;
    const geometry = found.object.geometry;
    const id  = loader.ifcManager.getExpressId(geometry,index);
    console.log(id);

    if(getProps){
      const props = await loader.ifcManager.getItemProperties(found.object.modelID,id);
      console.log(props);
      const typeProps = await loader.ifcManager.getPropertySets(found.object.modelID,id);
      console.log(typeProps);
    }
    
  
    loader.ifcManager.createSubset({
      modelID: found.object.modelID,
      ids: [id],
      material: material,
      scene,
      removePrevious: true
    });
  }else if(lastModel){
    loader.ifcManager.removeSubset(lastModel.modelID,material);
    lastModel = undefined;
  }
}

threeCanvas.onmousemove = (event) => pick(event,highlightMaterial,false);
threeCanvas.ondblclick = (event) => pick(event,selectionMaterial,true);

