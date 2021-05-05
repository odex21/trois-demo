const flyPath = require('./r.json')

const PF = require('pathfinding')

/**
 * @type {{x:number; y: nmumber}[]}
 */
const aPath = flyPath.map((e) => e.points ?? []).flat()
// .slice(0, 4)

console.log('path', aPath)
// PF.Util.expandPath(aPath.map((p) => [p.x, p.y]))
