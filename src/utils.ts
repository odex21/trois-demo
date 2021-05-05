/**
 *  Calculates length of a line on Cartesian grid, then returns point that is X number of pixels down the line.
 *
 * @param  {Number} fromX - starting x point
 * @param  {Number} fromY - starting y point
 * @param  {Number} toX - ending x point for vector
 * @param  {Number} toY - ending y point for vector
 * @param  {Number} pxDistance - Number of pixels down line toward ending point to return
 * @return {Object} Returns x/y coords of point on line based on number of pixels given
 */
export function stortenLineDistance(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  pxDistance: number
) {
  //if line is vertical
  if (fromX === toX)
    return { x: toX, y: toY > fromY ? fromY + pxDistance : fromY - pxDistance }

  //if line is horizontal
  if (fromY === toY)
    return { y: toY, x: toX > fromX ? fromX + pxDistance : fromX - pxDistance }

  //get each side of original triangle length
  const adjacent = toY - fromY
  const opposite = toX - fromX
  const hypotenuse = Math.sqrt(Math.pow(opposite, 2) + Math.pow(adjacent, 2))

  //find the angle
  const angle = Math.acos(adjacent / hypotenuse)

  const newOpposite = Math.sin(angle) * pxDistance
  const newAdjacent = Math.cos(angle) * pxDistance

  //calculate new x/y, see which direction it's going
  const y = fromY + newAdjacent,
    x = fromX + newOpposite

  return { x, y }
}

/**
 * Given a compressed path, return a new path that has all the segments
 * in it interpolated.
 * @param {Array<Array<number>>} path The path
 * @return {Array<Array<number>>} expanded path
 */
export function expandPath(path: number[][]) {
  const expanded: number[][] = [],
    len = path.length
  let coord0: number[], coord1: number[], interpolated, interpolatedLen

  if (len < 2) {
    return expanded
  }

  for (let i = 0; i < len - 1; ++i) {
    coord0 = path[i]
    coord1 = path[i + 1]

    interpolated = interpolate(coord0[0], coord0[1], coord1[0], coord1[1])
    interpolatedLen = interpolated.length
    for (let j = 0; j < interpolatedLen - 1; ++j) {
      expanded.push(interpolated[j])
    }
  }
  expanded.push(path[len - 1])

  return expanded
}

/**
 * Given the start and end coordinates, return all the coordinates lying
 * on the line formed by these coordinates, based on Bresenham's algorithm.
 * http://en.wikipedia.org/wiki/Bresenham's_line_algorithm#Simplification
 * @param {number} x0 Start x coordinate
 * @param {number} y0 Start y coordinate
 * @param {number} x1 End x coordinate
 * @param {number} y1 End y coordinate
 * @return {Array<Array<number>>} The coordinates on the line
 */
export function interpolate(x0: number, y0: number, x1: number, y1: number) {
  var abs = Math.abs,
    line: Path = [],
    sx,
    sy,
    dx,
    dy,
    err,
    e2

  dx = abs(x1 - x0)
  dy = abs(y1 - y0)

  sx = x0 < x1 ? 1 : -1
  sy = y0 < y1 ? 1 : -1

  err = dx - dy

  let count = 0

  const len = dx ** 2 + dy ** 2
  if (len < 2)
    return [
      [x0, y0],
      [x1, y1],
    ]

  while (++count < 100) {
    line.push([x0, y0])

    if (x0 === x1 && y0 === y1) {
      break
    }

    e2 = 2 * err
    if (e2 > -dy) {
      err = err - dy
      x0 = x0 + sx
    }
    if (e2 < dx) {
      err = err + dx
      y0 = y0 + sy
    }
  }

  return line
}

type Path = number[][]
