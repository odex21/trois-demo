import { Pos, RoutePos } from './mapdata'
import Pathfinding, { Grid } from 'pathfinding'

export interface Options {
  [index: string]: any
}
export type P = (...args: any[]) => Promise<any>

export interface GradientParm {
  vector: Vector
  colors: GradientColor[]
}

export interface GradientColor {
  color: string
  p: number
}

export interface Vector {
  p1: Pos
  p2: Pos
}

export interface SimplePathPoint extends RoutePos {
  type?: number
  reachOffset?: Pos
}

export interface PFResArr {
  points?: [Pos, Pos]
  len: number
  time?: number
  stop?: {
    time: number
    pos: Pos
  }
}

export interface MyGird extends Grid {
  nodes: Pathfinding.Node[][]
}

export interface ArrayPoint extends Array<number> {
  0: number
  1: number
}
