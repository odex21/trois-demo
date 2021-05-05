import { defineComponent, watch } from '@vue/runtime-core'
import {
  BufferGeometry,
  Matrix4,
  Vector3,
  BufferAttribute,
  Raycaster,
  Ray,
  Sphere,
  Mesh as TMesh,
  Intersection,
  ShaderMaterial,
} from 'three'
import { bindProp, Mesh } from 'troisjs'
import type { PropType } from 'vue'

export const MeshLine = defineComponent({
  name: 'MeshLine',
  extends: Mesh,
  props: {
    points: {
      type: Array as PropType<Vector3[]>,
    },
  },
  created() {
    this.createGeometry()

    watch(
      () => this.points,
      () => {
        this.refreshGeometry()
      }
    )
  },
  methods: {
    createGeometry() {
      this.geometry = createGeometry(this)
    },
    initMesh() {
      const mesh = new TMesh(this.geometry, this.material)
      mesh.userData.component = this

      bindProp(this, 'castShadow', mesh)
      bindProp(this, 'receiveShadow', mesh)

      mesh.raycast = MeshLineRaycast

      if (
        this.onPointerEnter ||
        this.onPointerOver ||
        this.onPointerMove ||
        this.onPointerLeave ||
        this.onPointerDown ||
        this.onPointerUp ||
        this.onClick
      ) {
        if (this.renderer) this.renderer.three.addIntersectObject(mesh)
      }

      this.mesh = mesh
      this.initObject3D(mesh)
    },
  },
})

export function createGeometry(comp: any): any {
  return new MeshLineGeometory(comp.points)
}

export class MeshLineGeometory extends BufferGeometry {
  type = 'MeshLine'
  positions: number[] | Float32Array = []
  previous: number[] | Float32Array = []
  next: number[] = []
  side: number[] = []
  width: number[] = []
  indices_array: number[] = []
  uvs: number[] = []
  counters: number[] = []
  _points: Vector3[] | Float32Array = []
  _geom: number[] = []
  widthCallback?: Function
  isMeshLine = true

  _attributes!: {
    position: BufferAttribute
    previous: BufferAttribute
    next: BufferAttribute
    side: BufferAttribute
    width: BufferAttribute
    uv: BufferAttribute
    index: BufferAttribute
    counters: BufferAttribute
  }

  // Used to raycast
  matrixWorld = new Matrix4()

  get geometry() {
    return this
  }

  get points() {
    return this._points
  }

  set points(v: Vector3[] | Float32Array) {
    this.setPoints(v)
  }

  // get geom() {
  //   return this._geom
  // }

  // set geom(v: BufferGeometry) {
  //   this.setGeometry(v)
  // }
  constructor(v: Vector3[]) {
    super()
    this.setPoints(v)
  }

  setGeometry(g: BufferGeometry, c?: Function) {
    // this._geometry = g
    if (g instanceof BufferGeometry) {
      this.setPoints(g.getAttribute('position').array, c)
    } else {
      this.setPoints(g, c)
    }
  }

  setPoints(points: ArrayLike<number> | Vector3[], wcb?: Function) {
    if (!(points instanceof Float32Array) && !(points instanceof Array)) {
      console.error(
        'ERROR: The BufferArray of points is not instancied correctly.'
      )
      return
    }
    // as the points are mutated we store them
    // for later retreival when necessary (declaritive architectures)
    this._points = points
    this.widthCallback = wcb
    this.positions = []
    this.counters = []
    if (assertVector3Array(points)) {
      // could transform Vector3 array into the array used below
      // but this approach will only loop through the array once
      // and is more performant
      for (let j = 0; j < points.length; j++) {
        let p = points[j]
        let c = j / points.length
        this.positions.push(p.x, p.y, p.z)
        this.positions.push(p.x, p.y, p.z)
        this.counters.push(c)
        this.counters.push(c)
      }
    } else {
      for (let j = 0; j < points.length; j += 3) {
        let c = j / points.length
        this.positions.push(points[j], points[j + 1], points[j + 2])
        this.positions.push(points[j], points[j + 1], points[j + 2])
        this.counters.push(c)
        this.counters.push(c)
      }
    }
    this.process()
  }

  process() {
    let l = this.positions.length / 6

    this.previous = []
    this.next = []
    this.side = []
    this.width = []
    this.indices_array = []
    this.uvs = []

    let w: number

    let v: number[]
    // initial previous points
    if (this.compareV3(0, l - 1)) {
      v = this.copyV3(l - 2)
    } else {
      v = this.copyV3(0)
    }
    this.previous.push(v[0], v[1], v[2])
    this.previous.push(v[0], v[1], v[2])

    for (let j = 0; j < l; j++) {
      // sides
      this.side.push(1)
      this.side.push(-1)

      // widths
      if (this.widthCallback) w = this.widthCallback(j / (l - 1))
      else w = 1
      this.width.push(w)
      this.width.push(w)

      // uvs
      this.uvs.push(j / (l - 1), 0)
      this.uvs.push(j / (l - 1), 1)

      if (j < l - 1) {
        // points previous to poisitions
        v = this.copyV3(j)
        this.previous.push(v[0], v[1], v[2])
        this.previous.push(v[0], v[1], v[2])

        // indices
        let n = j * 2
        this.indices_array.push(n, n + 1, n + 2)
        this.indices_array.push(n + 2, n + 1, n + 3)
      }
      if (j > 0) {
        // points after poisitions
        v = this.copyV3(j)
        this.next.push(v[0], v[1], v[2])
        this.next.push(v[0], v[1], v[2])
      }
    }

    // last next point
    if (this.compareV3(l - 1, 0)) {
      v = this.copyV3(1)
    } else {
      v = this.copyV3(l - 1)
    }
    this.next.push(v[0], v[1], v[2])
    this.next.push(v[0], v[1], v[2])

    // redefining the attribute seems to prevent range errors
    // if the user sets a differing number of vertices
    if (
      !this._attributes ||
      this._attributes.position.count !== this.positions.length
    ) {
      this._attributes = {
        position: new BufferAttribute(new Float32Array(this.positions), 3),
        previous: new BufferAttribute(new Float32Array(this.previous), 3),
        next: new BufferAttribute(new Float32Array(this.next), 3),
        side: new BufferAttribute(new Float32Array(this.side), 1),
        width: new BufferAttribute(new Float32Array(this.width), 1),
        uv: new BufferAttribute(new Float32Array(this.uvs), 2),
        index: new BufferAttribute(new Uint16Array(this.indices_array), 1),
        counters: new BufferAttribute(new Float32Array(this.counters), 1),
      }
    } else {
      this._attributes.position.copyArray(new Float32Array(this.positions))
      this._attributes.position.needsUpdate = true
      this._attributes.previous.copyArray(new Float32Array(this.previous))
      this._attributes.previous.needsUpdate = true
      this._attributes.next.copyArray(new Float32Array(this.next))
      this._attributes.next.needsUpdate = true
      this._attributes.side.copyArray(new Float32Array(this.side))
      this._attributes.side.needsUpdate = true
      this._attributes.width.copyArray(new Float32Array(this.width))
      this._attributes.width.needsUpdate = true
      this._attributes.uv.copyArray(new Float32Array(this.uvs))
      this._attributes.uv.needsUpdate = true
      this._attributes.index.copyArray(new Uint16Array(this.indices_array))
      this._attributes.index.needsUpdate = true
    }

    this.setAttribute('position', this._attributes.position)
    this.setAttribute('previous', this._attributes.previous)
    this.setAttribute('next', this._attributes.next)
    this.setAttribute('side', this._attributes.side)
    this.setAttribute('width', this._attributes.width)
    this.setAttribute('uv', this._attributes.uv)
    this.setAttribute('counters', this._attributes.counters)

    this.setIndex(this._attributes.index)

    this.computeBoundingSphere()
    this.computeBoundingBox()
  }

  advance(position: Vector3) {
    const positions = this._attributes.position.array as number[]
    const previous = this._attributes.previous.array as number[]
    const next = this._attributes.next.array as number[]
    const l = positions.length

    // PREVIOUS
    memcpy(positions, 0, previous, 0, l)

    // POSITIONS
    memcpy(positions, 6, positions, 0, l - 6)

    positions[l - 6] = position.x
    positions[l - 5] = position.y
    positions[l - 4] = position.z
    positions[l - 3] = position.x
    positions[l - 2] = position.y
    positions[l - 1] = position.z

    // NEXT
    memcpy(positions, 6, next, 0, l - 6)

    next[l - 6] = position.x
    next[l - 5] = position.y
    next[l - 4] = position.z
    next[l - 3] = position.x
    next[l - 2] = position.y
    next[l - 1] = position.z

    this._attributes.position.needsUpdate = true
    this._attributes.previous.needsUpdate = true
    this._attributes.next.needsUpdate = true
  }

  compareV3(a: number, b: number) {
    const aa = a * 6
    const ab = b * 6
    return (
      this.positions[aa] === this.positions[ab] &&
      this.positions[aa + 1] === this.positions[ab + 1] &&
      this.positions[aa + 2] === this.positions[ab + 2]
    )
  }

  copyV3(a: number) {
    const aa = a * 6
    return [this.positions[aa], this.positions[aa + 1], this.positions[aa + 2]]
  }

  setMatrixWorld(m: Matrix4) {
    this.matrixWorld = m
  }
}

function assertVector3Array(arr: any): arr is Vector3[] {
  return !!arr.length && arr[0] instanceof Vector3
}

const _inverseMatrix = /*@__PURE__*/ new Matrix4()
const _ray = /*@__PURE__*/ new Ray()
const _sphere = /*@__PURE__*/ new Sphere()
const _intersectionPointWorld = /*@__PURE__*/ new Vector3()

function MeshLineRaycast(
  this: TMesh,
  raycaster: Raycaster,
  intersects: Intersection[]
) {
  const geometry = this.geometry
  const material = this.material as ShaderMaterial
  const matrixWorld = this.matrixWorld

  if (material === undefined) return

  // Checking boundingSphere distance to ray

  if (geometry.boundingSphere === null) geometry.computeBoundingSphere()

  _sphere.copy(geometry.boundingSphere!)
  _sphere.applyMatrix4(matrixWorld)

  if (raycaster.ray.intersectsSphere(_sphere) === false) return

  _inverseMatrix.copy(matrixWorld).invert()
  _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix)

  //  不检查 boundingBox
  // if (geometry.boundingBox !== null) {
  //   if (_ray.intersectsBox(geometry.boundingBox) === false) return
  // }

  let vStart = new Vector3()
  let vEnd = new Vector3()
  let interSegment = new Vector3()
  let step = 1
  let attributes = geometry.attributes

  const index = geometry.index
  const position = geometry.attributes.position

  if (index !== null) {
    let indices = index.array
    let positions = position.array
    let widths = attributes.width.array

    for (let i = 0, l = indices.length - 1; i < l; i += step) {
      const a = indices[i]
      const b = indices[i + 1]

      vStart.fromArray(positions, a * 3)
      vEnd.fromArray(positions, b * 3)
      const width =
        widths[Math.floor(i / 3)] != undefined ? widths[Math.floor(i / 3)] : 1
      const precision =
        raycaster.params.Line!.threshold +
        (material.uniforms.lineWidth.value * width) / 2
      const precisionSq = precision * precision

      const distSq = _ray.distanceSqToSegment(
        vStart,
        vEnd,
        _intersectionPointWorld,
        interSegment
      )

      if (distSq > precisionSq) continue

      _intersectionPointWorld.applyMatrix4(this.matrixWorld) //Move back to world space for distance calculation

      const distance = raycaster.ray.origin.distanceTo(_intersectionPointWorld)

      if (distance < raycaster.near || distance > raycaster.far) continue

      intersects.push({
        distance: distance,
        // What do we want? intersection point on the ray or on the segment??
        point: _intersectionPointWorld.clone(),
        // point: interSegment.clone().applyMatrix4(this.matrixWorld),
        index: i,
        object: this,
      })

      // make event only fire once
      break
    }
  }
}

function memcpy(
  src: Float32Array | number[],
  srcOffset: number,
  dst: Float32Array,
  dstOffset: number,
  length: number
) {
  var i

  src = src.subarray || src.slice ? src : src.buffer
  dst = dst.subarray || dst.slice ? dst : dst.buffer

  src = srcOffset
    ? src.subarray
      ? src.subarray(srcOffset, length && srcOffset + length)
      : src.slice(srcOffset, length && srcOffset + length)
    : src

  if (dst.set) {
    dst.set(src, dstOffset)
  } else {
    for (i = 0; i < src.length; i++) {
      dst[i + dstOffset] = src[i]
    }
  }

  return dst
}
