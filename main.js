
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );

const euler = new THREE.Euler( 0, 0, 0, 'YXZ' );
const vector = new THREE.Vector3();

let sky, sun;

function initSky() {

    // Add Sky
    sky = new Sky();
    sky.scale.setScalar( 450000 );
    scene.add( sky );

    sun = new THREE.Vector3();
    sun.setFromSphericalCoords( 1, 180, 90 )
    sky.material.uniforms[ 'turbidity' ].value = 10;
    sky.material.uniforms[ 'rayleigh' ].value = 3;
    sky.material.uniforms[ 'mieCoefficient' ].value = 0.005;
    sky.material.uniforms[ 'mieDirectionalG' ].value = 0.7;

	const phi = THREE.MathUtils.degToRad( 90 - 2 );
	const theta = THREE.MathUtils.degToRad( 180 );

	sun.setFromSphericalCoords( 1, phi, theta );

	sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
}
const world = new CANNON.World()
world.gravity.set(0, -9.8, 0) 

var upVector = new CANNON.Vec3(0, 1, 0);
var contactNormal = new CANNON.Vec3(0, 0, 0);

let player = {
    speed: {
        x: 0,
        y: 0,
        z: 0
    },
    maxSpeed: {
        horizontal: 0,
        vertical: 0
    },
    position: {
        x: 0,
        y: 0,
        z: 0
    },
    isFlying: false,
    flyMode: false
}
let modelHeight = 3
let flyMode, speedSide = 0, speedForward = 0, speedForwardmax, vSpeed = 0
let sensitivity = 1
let boxes = [], helpers = [], modelBodies = []
let prevPosition = {}
const loader = new THREE.GLTFLoader();
let model
   loader.load('aimmap.glb', (glb) =>  {
        if (glb){
            console.log(glb.scene)
            model = glb.scene
            model.scale.set(1, 1, 1)
            model.position.set(0, 0, 0)
            model.rotation.set(0, 0, 0)
            model.castShadow = true
            scene.add(model);
            // console.log(model.children[11].rotation.x)
            model.children.forEach(child => {
                let box = new THREE.Box3;
                box.setFromObject(child);
                let modelBody = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3((box.max.x+box.min.x)/2, (box.max.y+box.min.y)/2, (box.max.z+box.min.z)/2),
                    shape: new CANNON.Box( new CANNON.Vec3(child.scale.x, child.scale.y, child.scale.z))
                })
                modelBody.quaternion.set(child.quaternion.x, child.quaternion.y, child.quaternion.z, child.quaternion.w)
                modelBody.quaternion.normalize()
                world.addBody(modelBody)
                modelBodies.push(modelBody)
            })
            model.updateMatrixWorld( true )
        }})        
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild( renderer.domElement );

const playerModel = new THREE.Mesh( new THREE.BoxGeometry( 2, 4, 2 ), new THREE.MeshBasicMaterial(  { color: 'transparent' }) );
playerModel .castShadow = true;
playerModel.receiveShadow = true;
playerModel.visible = false
scene.add( playerModel )

var playerModelBody = new CANNON.Body({
    mass: 10,
    position: new CANNON.Vec3(0, 2, 0),
    shape: new CANNON.Box( new CANNON.Vec3(1, 2, 1) ),
    fixedRotation: true
})
world.addBody(playerModelBody)
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
renderer.shadowMap.enabled = true;

let cube = new THREE.Mesh( new THREE.BoxGeometry(500, 0.01, 500), new THREE.MeshPhongMaterial( { color: 'chocolate' } ) );
cube.receiveShadow = true;
scene.add( cube );

// const sphere = new THREE.Mesh( new THREE.SphereGeometry(0.5, 100, 100), new THREE.MeshPhongMaterial( { color: 'blue'} ) );
// sphere.castShadow = true;
// sphere.receiveShadow = true;
// scene.add( sphere );

const stats = Stats()
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );




let groundBody = new CANNON.Body({
    mass: 0
}) 
let groundShape = new CANNON.Plane(0.1, 0.2) 
groundBody.addShape(groundShape) 
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2) 
world.addBody(groundBody) 

// let sphereBody = new CANNON.Body({
//     mass: 9,
//     position: new CANNON.Vec3(0, 5, 0) 
// })
// let sphereShape = new CANNON.Sphere(0.5) 
// sphereBody.addShape(sphereShape)
// world.addBody(sphereBody)

// scene.background = new THREE.Color( 'skyblue' )

const hemiLight = new THREE.HemisphereLight( 0xffeeb1, 0x080820, 4 );
scene.add( hemiLight );
const spotLight = new THREE.SpotLight( 0xffa95c,4 );
spotLight.castShadow = true;
spotLight.receiveShadow = true;
spotLight.shadow.bias = -0.0001;
spotLight.shadow.mapSize.width = 1024*16
spotLight.shadow.mapSize.height = 1024*16
scene.add( spotLight );
    spotLight.position.set(
        0,
        camera.position.y + 200,
        0,
    )

    const pointLight = new THREE.PointLight( 'white', 4, 100 );
    pointLight.position.set( 118, 50, -2 );
    scene.add( pointLight )


renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = 2.3
renderer.shadowMap.enabled = true

// cube.castShadow = true;
// floor.receiveShadow = true

// camera.position.set(118, modelHeight, -25)
camera.position.set(10, modelHeight, 25)
camera.rotation.order = 'YXZ'

// const cannonDebugRenderer = new THREE.CannonDebugRenderer(scene, world)
initSky()
animate();
function animate() {
    requestAnimationFrame(animate)
    stats.update()

    world.step(1 / 60)
    // cannonDebugRenderer.update()

    player.isFlying = Math.round(playerModel.position.y * 100) - Math.round(playerModelBody.position.y * 100) !== 0

    playerModel.position.copy( playerModelBody.position )
    playerModel.quaternion.copy( playerModelBody.quaternion )

    if (!player.flyMode){
        camera.position.x = playerModelBody.position.x
        camera.position.y = playerModelBody.position.y + playerModelBody.shapes[0].halfExtents.y
        camera.position.z = playerModelBody.position.z
    }

    // sphere.position.copy( sphereBody.position )
    // sphere.quaternion.copy( sphereBody.quaternion )

    getAdvancedData()

    stats.begin()
    renderer.render( scene, camera );
    stats.end()
};
window.addEventListener('resize', onResize)
document.oncontextmenu = document.body.oncontextmenu = function() {return false;}

function onResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener('beforeunload', function(e){
        e.stopPropagation();e.preventDefault();return false;
    },true);
let keys = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    KeyQ: false,
    KeyE: false,
    ShiftLeft: false,
    ControlLeft: false,
    Space: false
}
let smoothlyMove, smoothlyJump, wSpeed = 0, xMax = 10, zMax = 10
console.log(playerModelBody)
function playerMove(){
    clearInterval( smoothlyMove )
    smoothlyMove = setInterval(() => {
        if (Math.abs(player.speed.x) + Math.abs(player.speed.z) > player.maxSpeed.horizontal){
            player.speed.x = Math.abs(player.speed.x) > player.maxSpeed.horizontal / 2 ? player.speed.x / 2 : player.speed.x
            player.speed.z = Math.abs(player.speed.z) > player.maxSpeed.horizontal / 2 ? player.speed.z / 2 : player.speed.z
        } else {
            player.speed.x = Math.abs(player.speed.x) > 0 ? player.maxSpeed.horizontal * (player.speed.x / Math.abs(player.speed.x)) : player.speed.x
            player.speed.z = Math.abs(player.speed.z) > 0 ? player.maxSpeed.horizontal * (player.speed.z / Math.abs(player.speed.z)) : player.speed.z
        }
        if (player.speed.x !== 0 || player.speed.y !== 0 || player.speed.z !== 0){
            if (player.flyMode){
                camera.translateZ( -player.speed.z * 20 )
                camera.translateX( player.speed.x * 20 )
            } else {
                if (player.speed.z > 0){
                    playerModelBody.position.x += Math.sin(camera.rotation.y) * -player.speed.z + playerModelBody.velocity.x / 20
                    playerModelBody.position.z += Math.cos(Math.PI - camera.rotation.y) * player.speed.z + playerModelBody.velocity.z / 20
                }
                if (player.speed.z < 0){
                    playerModelBody.position.x += Math.sin(camera.rotation.y) * -player.speed.z + playerModelBody.velocity.x / 20
                    playerModelBody.position.z += -Math.cos(camera.rotation.y) * player.speed.z + playerModelBody.velocity.z / 20
                    
                }
                if (player.speed.x > 0){
                    playerModelBody.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * player.speed.x + playerModelBody.velocity.x / 20
                    playerModelBody.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -player.speed.x + playerModelBody.velocity.z / 20
                }
                if (player.speed.x < 0){
                    playerModelBody.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -player.speed.x + playerModelBody.velocity.x / 20
                    playerModelBody.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * player.speed.x + playerModelBody.velocity.z / 20
                }
            }
        } else {
            clearInterval( smoothlyMove )
        }
    }, 5)
    
}
let isFuseSpamSpace
console.log(playerModelBody)
function makeJump(){
    if (!player.isFlying && !isFuseSpamSpace){
        isFuseSpamSpace = true
        setTimeout(() => {
            isFuseSpamSpace = false
        }, 350)
        playerModelBody.velocity.y += 8
    }
}
function makeDuck(front){
    if (front){
        playerModelBody.shapes[0].halfExtents = new CANNON.Vec3( 1, 1, 1 ) 
        playerModelBody.shapes[0].boundingSphereRadiusNeedsUpdate = true;
        playerModelBody.shapes[0].updateConvexPolyhedronRepresentation();
        playerModelBody.computeAABB();
        playerModelBody.position.y -= 1
        playerModel.scale.y = 0.5
    } else {
        playerModelBody.shapes[0].halfExtents = new CANNON.Vec3( 1, 2, 1 ) 
        playerModelBody.shapes[0].boundingSphereRadiusNeedsUpdate = true;
        playerModelBody.shapes[0].updateConvexPolyhedronRepresentation();
        playerModelBody.computeAABB();
        playerModelBody.position.y += 1
        playerModel.scale.y = 1
    }
}
function offKeyboard(event){
    event.preventDefault();
        switch (event.code) {
        case 'KeyW':
            if (keys.KeyS){
                player.speed.z = -player.maxSpeed.horizontal
            } else {
                player.speed.z = 0
            }
            wSpeed = 0
            break;
        case 'KeyA':
            if (keys.KeyD){
                player.speed.x = player.maxSpeed.horizontal
            } else {
                player.speed.x = 0
            }
            break;
        case 'KeyS':
            if (keys.KeyW){
                player.speed.z = player.maxSpeed.horizontal
            } else {
                player.speed.z = 0
            }
            break;
        case 'KeyD':
            if (keys.KeyA){
                player.speed.x = -player.maxSpeed.horizontal
            } else {
                player.speed.x = 0
            }
            break;
        case 'ControlLeft':
            if (!isFuseSpamCtrl && keys.ControlLeft){
                isFuseSpamCtrl = true
                    let offCtrl = setInterval(() => {
                        player.maxSpeed.horizontal = 0.1
                        isFuseSpamCtrl = false
                        makeDuck(false)
                        clearInterval(offCtrl)
                    }, 10)
            }
            break;
        case 'ShiftLeft':
            player.maxSpeed.horizontal = 0.1
            break;
        case 'F2':
            onAdvancedInfo()
            helpers.forEach(element => element.visible = !element.visible)
            break;
        }
        keys[event.code] = false
}
let isFuseSpamCtrl, isCtrlStamina
function onKeyboard(event){
    event.preventDefault();
    if (!keys[event.code]){
        keys[event.code] = true
        switch (event.code) {
        case 'KeyW':
            player.speed.z = player.maxSpeed.horizontal
            playerMove()
            break;
        case 'KeyA':
            player.speed.x = -player.maxSpeed.horizontal
            playerMove()
            break;
        case 'KeyS':
            player.speed.z = -player.maxSpeed.horizontal
            playerMove()
            break;
        case 'KeyD':
            player.speed.x = player.maxSpeed.horizontal
            playerMove()
            break;
        case 'ControlLeft':
            if (!isCtrlStamina){
                isCtrlStamina = true
                player.maxSpeed.horizontal = 0.04
                makeDuck(true)
                setTimeout(() => {
                    isCtrlStamina = false
                }, 500)
            } else {
                keys[event.code] = false
            }
            break;
        case 'ShiftLeft':
            player.maxSpeed.horizontal = 0.06
            break;
        case 'Space':
            makeJump()
            break;
        }
    }
}
document.getElementById('onPlay').addEventListener('click', onPlay)

function onPlay(){
    document.getElementById('menuBg').style.display = 'none'
    player.flyMode = document.getElementById('playOrDevChoose').checked
    if (flyMode){
        player.maxSpeed.horizontal = 0.2
    } else {
        player.maxSpeed.horizontal = 0.1
    }
    speedSide = 0, speedForward = 0, speedSide = 0, speedForwardmax = 0
    document.querySelector('canvas').requestPointerLock = document.querySelector('canvas').requestPointerLock ||
    document.querySelector('canvas').mozRequestPointerLock ||
    document.querySelector('canvas').webkitRequestPointerLock;
    document.querySelector('canvas').requestPointerLock()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyboard, false)
    window.addEventListener('keyup', offKeyboard, false)
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
    }
}
function onMenu(){
    document.getElementById('onPlay').removeEventListener('click', onPlay)
    document.getElementById('menuBg').style.display = 'grid'
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('keydown', onKeyboard)
    window.removeEventListener('keyup', offKeyboard)
    setTimeout(() => {document.getElementById('onPlay').addEventListener('click', onPlay)}, 2500)
    keys = {
        KeyW: false,
        KeyA: false,
        KeyS: false,
        KeyD: false,
        KeyQ: false,
        KeyE: false,
        ShiftLeft: false,
        ControlLeft: false,
        Space: false
    }
}

function onMouseMove( event ){
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
	const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    euler.x -= movementY / (1 / sensitivity * 1000)
    euler.y -= movementX / (1 / sensitivity * 1000)

    euler.x = Math.max(Math.min(Math.PI/1.5, euler.x), -Math.PI/1.5)
    camera.quaternion.setFromEuler( euler );
}

document.addEventListener('pointerlockerror', lockError, false);
document.addEventListener('mozpointerlockerror', lockError, false);
document.addEventListener('webkitpointerlockerror', lockError, false);

function lockError(e) {
    document.getElementById('menuBg').style.display = 'grid'
}

if ("onpointerlockchange" in document) {
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
  } else if ("onmozpointerlockchange" in document) {
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
  } else if ("onwebkitpointerlockchange" in document) {
    document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
  }
  
  function lockChangeAlert() {
    if(document.pointerLockElement === document.querySelector('canvas') ||
    document.mozPointerLockElement === document.querySelector('canvas') ||
    document.webkitPointerLockElement === document.querySelector('canvas')) {

    } else {
        onMenu()
    }
  }
  function onAdvancedInfo(){
    if (document.getElementById('advancedInfoBlock').style.display !== 'none'){
        document.getElementById('advancedInfoBlock').style.display = 'none'
    } else {
        document.getElementById('advancedInfoBlock').style.display = 'grid'
    }
  }

document.getElementById('sensSilder').addEventListener('input', onSensSilder)
document.getElementById('sensInp').addEventListener('input', onSensInp)

function onSensSilder(){
    document.getElementById('sensInp').value = document.getElementById('sensSilder').value / 10
    sensitivity = document.getElementById('sensInp').value
}
function onSensInp(){
    document.getElementById('sensSilder').value = document.getElementById('sensInp').value * 10
    sensitivity = document.getElementById('sensInp').value
}
function getAdvancedData(){
    document.getElementById('xCords').innerText = String(camera.position.x).slice(0, 5)
    document.getElementById('zCords').innerText = String(camera.position.z).slice(0, 5)
    document.getElementById('yCords').innerText = String(camera.position.y).slice(0, 5)
    document.getElementById('povX').innerText = String(camera.rotation.x / (Math.PI * 2) * 100).slice(0, 5)
    document.getElementById('povY').innerText = String(camera.rotation.y / (Math.PI * 2) * 100).slice(0, 5)
    document.getElementById('povZ').innerText = String(camera.rotation.z / (Math.PI * 2) * 100).slice(0, 5)
    let povY = camera.rotation.y / (Math.PI * 2) - Math.floor(camera.rotation.y / (Math.PI * 2))
    if (povY > 0.875){
        document.getElementById('axis').innerText = 'x'
    } else if (povY > 0.625){
        document.getElementById('axis').innerText = '-z'
    } else if (povY > 0.375){
        document.getElementById('axis').innerText = '-x'
    } else if (povY > 0.125){
        document.getElementById('axis').innerText = 'z'
    } else {
        document.getElementById('axis').innerText = 'x'
    }
}







