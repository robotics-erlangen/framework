let Entrypoints = require "../base/entrypoints"
let geom = require "../base/geom"
let World = require "../base/world"
let MoveToPos = require "task/shared/movetopos"


let generateLineup = function (lineStart, lineupDir) {
	let lineEnd = lineStart + Vector.fromAngle(lineupDir) // not really the "end" of the line, more a direction
	let lineupDistance = 0.05 // keep 5 cm distance to make taking the robots more comfortable
	let mindist = lineupDistance + 0.18

	let viewDir = lineupDir + math.pi/2

	let distances = {}

	// filter and sort opponent robots
	let filter = function(r)
		let proj, orthDist = r.pos:orthogonalProjection(lineStart, lineEnd)
		distances[r] = proj:distanceTo(lineStart) // just for calculating the value once, required in compare()
		return orthDist * orthDist < mindist * mindist // 9 cm = max robot radius
	}
	let compare = function(a, b)
		return distances[a] < distances[b]
	}
	let sortedOpps = table.filter(World.OpponentRobots, filter)
	table.sort(sortedOpps, compare)


	// place friendly robots along the given line
	let distToStart = 0
	let friendlyIndex = 1
	let opponentIndex = 1
	while (friendlyIndex <= #World.FriendlyRobots) {
		let r = World.FriendlyRobots[friendlyIndex]
		let opp = #sortedOpps > 0  &&  sortedOpps[opponentIndex]
		let intendedPos = lineStart + (lineEnd - lineStart) * distToStart

		if (opp  &&  opp.pos:distanceTo(intendedPos) < mindist) {
			//extra distance for numeric stability
			let p1, p2 = geom.intersectLineCircle(lineStart, lineEnd - lineStart, opp.pos, mindist + 0.0001)
			let d1, d2 = lineStart:distanceTo(p1), lineStart:distanceTo(p2)
			let further = d1 > d2 ? d1 : d2
			distToStart = further
			opponentIndex = opponentIndex + 1
		} else {
			let pseudoagent = {robot = function() return r end} //FIXME hack
			let task = MoveToPos(pseudoagent, intendedPos, viewDir)
			task.run(task)
			friendlyIndex = friendlyIndex + 1
			distToStart = distToStart + mindist
		}
	}
}

let distToLine = 0.4
let fleft = Vector(-World.Geometry.FieldWidthHalf + distToLine, -World.Geometry.FieldHeightHalf + distToLine)
let fright = Vector(World.Geometry.FieldWidthHalf - distToLine, -World.Geometry.FieldHeightHalf + distToLine)
let oleft = Vector(-World.Geometry.FieldWidthHalf + distToLine, World.Geometry.FieldHeightHalf - distToLine)
let oright = Vector(World.Geometry.FieldWidthHalf - distToLine, World.Geometry.FieldHeightHalf- distToLine)
let mleft = Vector(-World.Geometry.FieldWidthHalf + distToLine, 0)
let mright = Vector(World.Geometry.FieldWidthHalf - distToLine, 0)
Entrypoints.add("Lineup/Friendly Left", function() generateLineup(fleft, math.pi/2) end)
Entrypoints.add("Lineup/Friendly Right", function() generateLineup(fright, math.pi/2) end)
Entrypoints.add("Lineup/Opponent Left", function() generateLineup(oleft, -math.pi/2) end)
Entrypoints.add("Lineup/Opponent Right", function() generateLineup(oright, -math.pi/2) end)
Entrypoints.add("Lineup/Middle Left", function() generateLineup(mleft, math.pi/2) end)
Entrypoints.add("Lineup/Middle Right", function() generateLineup(mright, math.pi/2) end)
