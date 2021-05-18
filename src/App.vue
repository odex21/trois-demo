<template>
  <div class="h-full">
    <Renderer
      ref="renderer"
      antialias
      resize
      :orbit-ctrl="{
        enableDamping: true,
        dampingFactor: 0.05,
        enableRotate: false,
      }"
      pointer
      shadow
    >
      <Stats />
      <!-- <OrthographicCamera /> -->
      <Raycaster @pointer-move="handleOver" />
      <Camera
        ref="cameraRef"
        :fov="60"
        :position="{ z, y, x: 0 }"
        :far="5000"
      />
      <Scene ref="sceneRef">
        <AmbientLight color="#FFA716" />
        <PointLight
          ref="lightRef"
          cast-shadow
          :position="lightPos"
          :shadow-map-size="{ x: 1024, y: 1024 }"
          :intensity="0.42"
        />
        <InstancedMesh cast-shadow ref="heightImeshRef" :count="NUM_INSTANCES">
          <BoxGeometry :size="SIZE" />
          <MatcapMaterial
            :wireframeLinewidth="1"
            src="/2A4BA7_1B2D44_1F3768_233C81-128px.png"
          />
        </InstancedMesh>

        <InstancedMesh receive-shadow ref="imeshRef" :count="NUM_INSTANCES">
          <BoxGeometry :size="SIZE" />
          <PhongMaterial color="#E9FBFE" />
          <!-- <matcap-material
            :wireframeLinewidth="1"
            src="/5B4CBC_B59AF2_9B84EB_8F78E4-128px.png"
          /> -->
          <!-- <LineCubeMaterial color="#E9FBFE" /> -->
        </InstancedMesh>

        <InstancedMesh
          ref="startImeshRef"
          :count="NUM_INSTANCES"
          cast-shadow
          receive-shadow
        >
          <BoxGeometry :size="SIZE" />
          <basic-material
            color="#F01D2D"
            :wireframe="true"
            :wireframeLinewidth="1"
          />
        </InstancedMesh>

        <InstancedMesh
          ref="endImeshRef"
          :count="NUM_INSTANCES"
          cast-shadow
          receive-shadow
        >
          <BoxGeometry :size="SIZE" />
          <basic-material
            color="#27D0E3"
            :wireframe="true"
            :wireframeLinewidth="1"
          />
        </InstancedMesh>

        <Plane
          :width="W * 2"
          :height="H * 2"
          :position="{ z: -1 }"
          receive-shadow
        >
          <PhongMaterial color="#60FCDE" />
        </Plane>

        <template v-for="(p, i) in routeMap" :key="i">
          <MeshLine
            ref="tubeMeshRef"
            :points="pathtoPoints(p, i)"
            v-if="i === curRouteIndex"
          >
            <mesh-line-material
              :ref="($event) => materialRef(i, $event)"
              :uniforms="lineAnimateMaterialUnitforms"
            ></mesh-line-material>
          </MeshLine>
        </template>
        <MeshLine :points="currentRotue">
          <mesh-line-material
            :uniforms="lineMaterialUnitforms"
          ></mesh-line-material>
        </MeshLine>
        <!-- <Box ref="enemyRef" :size="1.5">
          <BasicMaterial>
            <Texture :src="enemyPic" />
          </BasicMaterial>
        </Box> -->
        <Image
          ref="enemyRef"
          :width="100"
          :height="100"
          :src="enemyPic"
          keepSize
        >
        </Image>
      </Scene>
    </Renderer>

    <div class="h-300px top-0 right-3 max-w-300px w-full z-10 absolute">
      <div class="flex w-full items-center">
        <span class="mr-6 text-white"> 当前路线： {{ curRouteIndex }} </span>
        <ElSlider
          class="flex-1"
          v-model="curRouteIndex"
          :min="0"
          :max="routeMap.length - 1"
        ></ElSlider>
        {{ routeMap.length - 1 }}
      </div>
      <div class="text-right">
        <ElButton @click="play" type="primary">播放</ElButton>
        <ElButton
          @click="setEnableRotate"
          :type="enableRotate ? 'primary' : 'default'"
        >
          旋转</ElButton
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from '@vue/runtime-core'
import {
  AmbientLight,
  BoxGeometry,
  Camera,
  InstancedMesh,
  PhongMaterial,
  Plane,
  PointLight,
  Renderer,
  Scene,
  OrthographicCamera,
  Tube,
  StandardMaterial,
  SphereGeometry,
  ToonMaterial,
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
  HalftonePass,
  MatcapMaterial,
  TubeGeometry,
  BasicMaterial,
  Raycaster,
  Mesh,
  CubeTexture,
  FXAAPass,
  Box,
  Texture,
  Image,
} from 'troisjs'
import type { ThreeInterface } from 'troisjs/src/core/useThree'
import {
  Object3D,
  InstancedMesh as TInstancedMesh,
  TubeGeometry as TypeTubeGeometry,
  Camera as TypeCamera,
  CameraHelper,
  PerspectiveCamera,
  BufferGeometry,
  Vector3,
  Line,
  Scene as TScene,
  LineBasicMaterial,
  LineDashedMaterial,
  Mesh as TMesh,
  Sphere,
  Material,
  SphereBufferGeometry,
  MeshBasicMaterial,
  BoxHelper,
  GridHelper,
  ShaderMaterial,
  Color,
  PlaneGeometry,
  BoxGeometry as TBoxGeometry,
  BufferAttribute,
  BoxBufferGeometry,
} from 'three'
import type { Intersection } from 'three'
import { Text } from 'troika-three-text'

import { addRoutes, calcPosition } from './addRoute'

import { debounce, over, throttle } from 'lodash-es'
import PF from 'pathfinding'

import Stats from 'troisjs/src/components/misc/Stats.js'
import {
  MeshLine,
  MeshLineMaterial,
  buildMeshLineUniforms,
  MeshLineGeometory,
} from './MeshLine'

import { LineCubeMaterial } from './CubeMaterial'

import map from '~/assets/level_camp_r_01.json'
// import map from '~/assets/level_act18d0_ex06.json'
import type { Pos } from './mapdata'

import { expandPath } from './utils'
import type { PFResArr } from './type'

ref: curRouteIndex = 1

const enemyPic = 'enemy_1513_dekght_2.jpg'

const SIZE = 10,
  NX = 20,
  NY = 20,
  PADDING = 0
const SIZEP = SIZE + PADDING
const W = NX * SIZEP - PADDING
const H = NY * SIZEP - PADDING

const OFFSET_Y = SIZE * 0.2
const OFFSET_Z = SIZE * 0.5

// camera
const r = 100
const z = 1 * Math.sqrt(3) * r
const y = -1 * r

let l = 30

const lightPos = {
  x: l * 4,
  y: -l * 4,
  z: l * 7,
}

const mapData = map.mapData
const { width, height } = mapData

const NUM_INSTANCES = mapData.width * mapData.height

let dummy: Object3D

ref: renderer = null as any
ref: lightRef = null as any
ref: imeshRef = null as any
ref: heightImeshRef = null as any
ref: tubeMeshRef = null as any
ref: sceneRef = null as any

ref: lowImesh = computed(() => imeshRef?.mesh as TInstancedMesh)
ref: heightImesh = computed(() => heightImeshRef?.mesh as TInstancedMesh)
ref: scene = computed(() => sceneRef.scene as TScene)

ref: troisTree = computed(() => renderer.three as ThreeInterface)

const x0 = (-mapData.width * SIZEP) / 2 + PADDING
const y0 = (-mapData.height * SIZEP) / 2 + PADDING
const route = map.routes[13]!

const grid = new PF.Grid(mapData.width, mapData.height)

interface TileCube {
  x: number
  y: number
  tile: {
    tileKey: string
    heightType: number
    buildableType: number
    passableMask: number
    playerSideMask: number
    blackboard: Record<string, any> | null
  }
}

const startCubes: TileCube[] = []
const endCubes: TileCube[] = []

ref: startImeshRef = null as any
ref: startImesh = computed(() => startImeshRef.mesh as TInstancedMesh)

ref: endImeshRef = null as any
ref: endImesh = computed(() => endImeshRef.mesh as TInstancedMesh)

const cubes = (() => {
  const arr = []
  for (let y = height - 1; y > -1; y--) {
    const top = []
    const bottom = []

    // todo gird
    const gridArr: number[] = []

    for (let x = width - 1; x > -1; x--) {
      const tile = mapData.tiles[y * width + x]
      grid.setWalkableAt(x, y, tile.passableMask === 3)
      arr.push({
        x,
        y,
        tile,
      })

      if (tile.tileKey === 'tile_start') {
        startCubes.push({
          x,
          y,
          tile,
        })
      } else if (tile.tileKey === 'tile_end') {
        endCubes.push({
          x,
          y,
          tile,
        })
      }
    }
  }
  return arr
})()

const routeMap = map.routes.map((r, i) => {
  if (!r) {
    return []
  }

  const path = addRoutes(r!, grid)

  return path
})

ref: currentRotue = computed(() => {
  const path = routeMap[curRouteIndex].map((e) => e.points ?? []).flat()

  const raw = map.routes[curRouteIndex]

  return path.map(
    (e) =>
      new Vector3(
        x0 + e.x * SIZEP,
        y0 + e.y * SIZEP,
        raw?.motionMode ? SIZE + OFFSET_Z : SIZE / 2 + OFFSET_Z
      )
  )
})

const pathtoPoints = (path: PFResArr[], i: number) => {
  const raw = map.routes[i]

  if (!raw) return []
  const s = path[0].points![0]
  const startV = new Vector3(
    x0 + s.x * SIZEP,
    y0 + s.y * SIZEP,
    raw?.motionMode ? 2.5 : 1.5
  )

  if (enemyRef?.mesh) {
    const mesh = enemyRef.mesh as TBoxGeometry
    dummy.position.set(startV.x, startV.y - 2, startV.z + 5)
    dummy.updateMatrix()
    mesh.applyMatrix4(dummy.matrix)
  }
  return Array.from({ length: 100 }, (v, i) => startV.clone())
}

const getPathColor = (i: number) => {
  const raw = map.routes[i]
  return raw?.motionMode ? new Color('red') : new Color('yellow')
}

const heightCube = cubes.filter((cube) => cube.tile.heightType)
const lowCube = cubes.filter((cube) => !cube.tile.heightType)

ref: cameraRef = null as any as { camera: PerspectiveCamera }

const c = new Color('#fff')

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const indexColor = 0x9966ff

const FONT_SIZE = 7

const colIndexText = Array.from({ length: mapData.width }, (v, i) => {
  const testText = new Text()
  testText.text = i
  testText.fontSize = FONT_SIZE
  testText.color = indexColor
  testText.position.z = 0.5
  testText.position.x = x0 + i * SIZEP - SIZEP / 2
  testText.position.y = y0 - SIZEP //x0 + i * SIZEP
  testText.textAlign = 'center'

  return testText
})

const rowIndexText = Array.from({ length: mapData.height }, (v, i) => {
  const testText = new Text()
  testText.text = alphabet[i]
  testText.fontSize = FONT_SIZE
  testText.color = indexColor
  testText.position.z = SIZEP + OFFSET_Z
  testText.position.y = y0 + i * SIZEP + SIZEP / 4
  testText.position.x = x0 - SIZEP //x0 + i * SIZEP
  testText.textAlign = 'center'

  return testText
})

const initMapCubes = () => {
  let x, y, z

  const update = (mesh: TInstancedMesh, initZ?: number) => (cube: TileCube) => {
    x = x0 + cube.x * SIZEP
    y = y0 + cube.y * SIZEP
    z = initZ ?? (cube.tile.heightType ? SIZEP / 2 : 0)

    dummy.position.set(x, y, z)
    dummy.updateMatrix()
    const id = cube.x + mapData.width * cube.y
    mesh.setMatrixAt(id, dummy.matrix)
    if (!initZ) mesh.setColorAt(id, c)
  }

  heightCube.forEach(update(heightImesh))
  lowCube.forEach(update(lowImesh))
  startCubes.forEach(update(startImesh, SIZE))
  endCubes.forEach(update(endImesh, SIZE))

  if (lowImesh.instanceColor) lowImesh.instanceColor.needsUpdate = true
  if (heightImesh.instanceColor) heightImesh.instanceColor.needsUpdate = true

  lowImesh.instanceMatrix.needsUpdate = true
  heightImesh.instanceMatrix.needsUpdate = true
}

const lineMaterialUnitforms = buildMeshLineUniforms({ lineWidth: 1 })
const lineAnimateMaterialUnitforms = buildMeshLineUniforms({
  lineWidth: 1,
  color: new Color('yellow'),
})

ref: routeRefs = new Map<number, any>()
ref: materialRef = (i: number, mr: any) => {
  routeRefs.set(i, mr)
}

ref: enemyRef = null as any

const tasks = new Map<string, Function>()

onMounted(() => {
  dummy = new Object3D()

  let size = mapData.width + 4
  if (size % 2 !== 1) size++
  console.log(size)
  const gridHelper = new GridHelper(size * SIZEP, size)
  gridHelper.rotateX(Math.PI / 2)
  scene.add(gridHelper)
  gridHelper.translateX(-SIZEP / 2)
  gridHelper.translateY(SIZEP / 2 + 0.5)
  gridHelper.translateZ(-SIZEP / 2)
  rowIndexText.forEach((t) => scene.add(t))
  colIndexText.forEach((t) => scene.add(t))

  // const helper = new CameraHelper(cameraRef.camera)
  // sceneRef.scene.add(helper)
  initMapCubes()

  renderer.onBeforeRender((e: { time: number }) => {
    tasks.forEach((t) => t(e.time))
  })

  renderer.onBeforeRender((e: { tiem: number }) => {})

  loadSpine()
})

const overMap = new Map<number, Function>()

const handleOver = (e: { component: any; intersect: Intersection }) => {
  if (e.component.geometry.type === 'BoxGeometry') {
    if (!e.intersect) return
    const mesh = e.intersect.object as TInstancedMesh
    const instanceId = e.intersect.instanceId
    if (typeof instanceId === 'undefined') return
    if (instanceId === lastInstanceId) return
    lastInstanceId = instanceId

    resetIndex(rowIndexText)
    resetIndex(colIndexText)
    overMap.forEach((e) => e())

    setColor(mesh, instanceId, new Color('#AEE7F0'))
  }
}

let lastInstanceId: number
function setColor(mesh: TInstancedMesh, instanceId: number, color: Color) {
  set(instanceId, color)

  const { x, y } = idToXY(instanceId)

  const sc = color.multiplyScalar(1.5)
  const rowStart = y * mapData.width

  for (let i = rowStart; i < rowStart + mapData.width; i++) {
    if (i === instanceId) continue
    set(i, sc)
  }

  for (let i = x; i < NUM_INSTANCES; i += mapData.width) {
    if (i === instanceId) continue
    set(i, sc)
  }

  const rowIndex = rowIndexText[y]
  rowIndex.color = 'red'
  rowIndex.sync()

  const colIndex = colIndexText[x]
  colIndex.color = 'red'
  colIndex.sync()

  if (heightImesh.instanceColor) heightImesh.instanceColor.needsUpdate = true
  if (lowImesh.instanceColor) lowImesh.instanceColor.needsUpdate = true

  function set(id: number, color: Color) {
    const targetTail = mapData.tiles[id]
    const mesh = targetTail.heightType ? heightImesh : lowImesh
    mesh.setColorAt(id, color)

    const r = () => {
      set(id, c)
      overMap.delete(id)
    }
    overMap.set(id, r)
  }
}
function resetIndex(arr: any[]) {
  arr.forEach((e) => {
    e.color = indexColor
    e.sync()
  })
}

const idToXY = (id: number) => {
  return {
    y: Math.floor(id / mapData.width),
    x: id % mapData.width,
  }
}

const play = () => {
  let begin: number

  const targetRef = routeRefs.get(curRouteIndex)
  if (!targetRef) return
  const material = targetRef.material as ShaderMaterial
  const color = getPathColor(curRouteIndex)
  material.uniforms.color.value = color

  const r = routeMap[curRouteIndex]
  const mesh = tubeMeshRef.geometry as MeshLineGeometory
  const calc = calcPosition(r)

  let err = false
  const raw = map.routes[curRouteIndex]
  if (!raw) return
  const z = raw.motionMode ? SIZEP + OFFSET_Z : OFFSET_Z
  const ez = z + OFFSET_Z / 3
  const enemyMesh = enemyRef.mesh as TMesh<BoxBufferGeometry>
  console.log('e', enemyRef.position, enemyRef)
  enemyMesh.rotation.x = Math.PI / 3

  tasks.set('route', (time: number) => {
    if (err) return
    // if (!begin) begin = time
    try {
      const pos = calc(time)
      if (!pos) {
        tasks.delete('route')
        console.log('done')
        return
      }
      const v3 = new Vector3(
        x0 + pos.x * SIZEP,
        y0 + pos.y * SIZEP,
        z + OFFSET_Z * 1.2
      )

      mesh.advance(v3)
      // enemyMesh.position.set(v3.x, v3.y - 0.2, ez + 0.5)

      skeletonMesh.position.set(v3.x, v3.y - OFFSET_Y * 1.5, ez)
    } catch (e) {
      console.log(e)
      err = true
    }
  })
}

ref: enableRotate = false

const setEnableRotate = () => {
  enableRotate = !enableRotate
  // console.log('r',)
  troisTree.cameraCtrl!.enableRotate = enableRotate ? true : false
}

import { skel2Json } from './spine/skel2Json.js'
import { AssetManager, SkeletonMesh } from './spine-three'

let skeletonMesh: SkeletonMesh
async function loadSpine() {
  const assetManager = new AssetManager()
  assetManager.loadText('/assets/enemy_1000_gopro.atlas')
  assetManager.loadTexture('/assets/enemy_1000_gopro.png')
  const skelBuffer = await fetch('/assets/enemy_1000_gopro.skel', {
    method: 'get',
  }).then((res) => res.arrayBuffer())

  const json = skel2Json(skelBuffer)
  const animates = Object.keys(json.animations)
  console.log('a ', animates)

  requestAnimationFrame(load)

  function load() {
    if (assetManager.isLoadingComplete()) {
      const geometry = new TBoxGeometry() //new THREE.BoxGeometry(200, 200, 200);
      const material = new MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
      })

      const mesh = new TMesh(geometry, material)

      scene.add(mesh)

      const atlas = new spine.TextureAtlas(
        assetManager.get('/assets/enemy_1000_gopro.atlas'),
        (path) => assetManager.get('/assets/' + path)
      )

      const atlasLoader = new spine.AtlasAttachmentLoader(atlas)

      const skeletonJson = new spine.SkeletonJson(atlasLoader)

      skeletonJson.scale = 0.05
      const skeletonData = skeletonJson.readSkeletonData(json)

      console.log('skel data', skeletonJson, skeletonData)

      skeletonMesh = new SkeletonMesh(skeletonData)
      skeletonMesh.rotateX((Math.PI / 180) * 60)
      skeletonMesh.position.set(1, -5.5, 10)
      skeletonMesh.state.setAnimation(0, 'Run_Loop', true)
      // skeletonMesh.state.timeScale = 1

      mesh.add(skeletonMesh)

      let lastTime = Date.now()
      let lastFrameTime: number = 0

      renderer.onBeforeRender((e: { time: number }) => {
        const now = e.time / 1000
        const delta = now - lastFrameTime
        lastFrameTime = now
        skeletonMesh.update(delta)
      })
    } else requestAnimationFrame(load)
  }
}
</script>

<style>
#app {
  height: 100vh;
}

body {
  margin: 0;
}
</style>
