<template>
  <div class="h-full">
    <Renderer
      ref="renderer"
      antialias
      resize
      :orbit-ctrl="{ enableDamping: true, dampingFactor: 0.05 }"
      pointer
      shadow
    >
      <Stats />
      <OrthographicCamera />
      <Camera
        ref="cameraRef"
        :fov="60"
        :position="{ z, y, x: 0 }"
        :far="2000"
      />
      <Scene ref="sceneRef">
        <AmbientLight color="#FFA716" />
        <PointLight
          ref="lightRef"
          cast-shadow
          :shadow-map-size="{ width: 1024, height: 1024 }"
          :intensity="0.56"
        />
        <!-- :position="{ z: 3, y: 4 }" -->

        <InstancedMesh
          ref="imeshRef"
          :count="NUM_INSTANCES"
          cast-shadow
          receive-shadow
        >
          <BoxGeometry :size="SIZE" />
          <PhongMaterial color="#2EFEC9" />
        </InstancedMesh>

        <InstancedMesh
          ref="heightImeshRef"
          :count="NUM_INSTANCES"
          cast-shadow
          receive-shadow
        >
          <BoxGeometry :size="SIZE" />
          <PhongMaterial color="#E9FBFE" />
        </InstancedMesh>

        <Plane
          :width="W * 2"
          :height="H * 2"
          :position="{ z: -10 }"
          receive-shadow
        >
          <PhongMaterial color="#60FCDE" />
        </Plane>
        <Tube
          :points="points"
          :radius="0.1"
          :radialSegments="8"
          :tubularSegments="8"
          cast-shadow
          receive-shadow
        >
          <ToonMaterial color="#56AEE8" />
        </Tube>
      </Scene>
    </Renderer>
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
} from 'troisjs'
import {
  Object3D,
  InstancedMesh as TypeInstancedMesh,
  Camera as TypeCamera,
  CameraHelper,
  PerspectiveCamera,
  BufferGeometry,
  Vector3,
  Line,
} from 'three'

import { throttle } from 'lodash-es'

import Stats from 'troisjs/src/components/misc/Stats.js'

import SimplexNoise from 'simplex-noise'
const simplex = new SimplexNoise()

import map from '~/assets/level_act18d0_ex06.json'

const SIZE = 1.5,
  NX = 20,
  NY = 20,
  PADDING = 0.02
const SIZEP = SIZE + PADDING
const W = NX * SIZEP - PADDING
const H = NY * SIZEP - PADDING

const NUM_INSTANCES = NX * NY

let dummy: Object3D

ref: renderer = null as any
ref: lightRef = null as any
ref: imeshRef = null as any
ref: heightImeshRef = null as any

ref: light = computed(() => lightRef?.light)
ref: imesh = computed(() => imeshRef?.mesh as TypeInstancedMesh)
ref: heightImesh = computed(() => heightImeshRef?.mesh as TypeInstancedMesh)

ref: pointer = computed(() => renderer?.three.pointer)

const x0 = -W / 4 + PADDING
const y0 = -H / 4 + PADDING + H / 4
const route = map.routes[1]!
const points = [
  route.startPosition,
  ...route.checkpoints.map((p) => p.position),
  route.endPosition,
].map((p) => new Vector3(x0 + p.col * SIZEP, y0 + p.row * SIZEP, -9))
const geometry = new BufferGeometry().setFromPoints(points)
new Line()
//.startPosition

const debounceLog = throttle(console.log, 1000)

const r = 3
const z = 1 * Math.sqrt(3) * r
const y = -1 * r

let err = false
const animate = () => {
  // light.position.x = pointer.positionV3.x
  // light.position.y = pointer.positionV3.y
  debounceLog(light.position)
  // if (!err) {
  //   try {
  //   } catch (err) {
  //     err = true
  //   }
  // }
}

const mapData = map.mapData

const { width, height } = mapData
// const grids: number[][] = []
const cubes = (() => {
  const arr = []
  for (let y = height - 1; y > -1; y--) {
    const top = []
    const bottom = []

    // todo gird
    const gridArr: number[] = []

    for (let x = width - 1; x > -1; x--) {
      const tile = mapData.tiles[y * width + x]
      arr.push({
        x,
        y,
        tile,
      })
    }
  }
  return arr
})()

const heightCube = cubes.filter((cube) => cube.tile.heightType)
const lowCube = cubes.filter((cube) => !cube.tile.heightType)

ref: cameraRef = (null as any) as { camera: PerspectiveCamera }

const updateInstanceMatrix = () => {
  const time = Date.now() * 0.0001
  const mx = pointer.positionN.x * 0.1
  const my = pointer.positionN.y * 0.1
  const noise = 0.005
  let x, y, z, nx, ny, rx, ry

  // console.log('x', x0)

  const update = (imesh: TypeInstancedMesh) => (cube) => {
    // x
    x = x0 + cube.x * SIZEP
    y = y0 + cube.y * SIZEP
    z = cube.tile.heightType ? -9.5 : -10

    dummy.position.set(x, y, z)
    dummy.updateMatrix()
    imesh.setMatrixAt(cube.x * NY + cube.y, dummy.matrix)
  }
  // // lowCube.forEach(update(imesh))
  // // heightCube.forEach(update(heightImesh))

  heightCube.forEach(update(imesh))
  lowCube.forEach(update(heightImesh))

  // for (let i = 0; i < NX; i++) {
  //   for (let j = 0; j < NY; j++) {
  //     x = x0 + i * SIZEP
  //     y = y0 + j * SIZEP
  //     nx = x * noise + mx
  //     ny = y * noise + my
  //     rx = simplex.noise3D(nx, ny, time) * Math.PI
  //     ry = simplex.noise3D(ny, nx, time) * Math.PI
  //     dummy.position.set(x, y, -10)
  //     dummy.rotation.set(rx, ry, 0)
  //     dummy.updateMatrix()
  //     imesh.setMatrixAt(i * NY + j, dummy.matrix)
  //   }
  // }

  imesh.instanceMatrix.needsUpdate = true
}
ref: sceneRef = null as any
onMounted(() => {
  dummy = new Object3D()
  let l = 1
  light.position.x = l * 2
  light.position.y = -l * 5
  light.position.z = l * 2

  renderer.onBeforeRender(animate)

  const helper = new CameraHelper(cameraRef.camera)
  sceneRef.scene.add(helper)
  updateInstanceMatrix()
})
</script>

<style>
#app {
  height: 100vh;
}

body {
  margin: 0;
}
</style>
