local Entrypoints = require "../base/entrypoints"
local geom = require "../base/geom"
local World = require "../base/world"
local MoveToPos = require "task/movetopos"


local function generateLineup(lineStart, lineupDir)
	local lineEnd = lineStart + Vector.fromAngle(lineupDir) -- not really the "end" of the line, more a direction
	local lineupDistance = 0.05 -- keep 5 cm distance to make taking the robots more comfortable
	local mindist = lineupDistance + 0.18

	local viewDir = lineupDir + math.pi/2

	local distances = {}

	-- filter and sort opponent robots
	local filter = function(r)
		local proj, orthDist = r.pos:orthogonalProjection(lineStart, lineEnd)
		distances[r] = proj:distanceTo(lineStart) -- just for calculating the value once, required in compare()
		return orthDist * orthDist < mindist * mindist -- 9 cm = max robot radius
	end
	local compare = function(a, b)
		return distances[a] < distances[b]
	end
	local sortedOpps = table.filter(World.OpponentRobots, filter)
	table.sort(sortedOpps, compare)


	-- place friendly robots along the given line
	local distToStart = 0
	local friendlyIndex = 1
	local opponentIndex = 1
	while friendlyIndex <= #World.FriendlyRobots do
		local r = World.FriendlyRobots[friendlyIndex]
		local opp = #sortedOpps > 0 and sortedOpps[opponentIndex]
		local intendedPos = lineStart + (lineEnd - lineStart) * distToStart

		if opp and opp.pos:distanceTo(intendedPos) < mindist then
			--extra distance for numeric stability
			local p1, p2 = geom.intersectLineCircle(lineStart, lineEnd - lineStart, opp.pos, mindist + 0.0001)
			local d1, d2 = lineStart:distanceTo(p1), lineStart:distanceTo(p2)
			local further = d1 > d2 and d1 or d2
			distToStart = further
			opponentIndex = opponentIndex + 1
		else
			local pseudoagent = {robot = function() return r end} --FIXME hack
			local task = MoveToPos(pseudoagent, intendedPos, viewDir)
			task.run(task)
			friendlyIndex = friendlyIndex + 1
			distToStart = distToStart + mindist
		end
	end
end

local fleft = Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
local fright = Vector(World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
local oleft = Vector(-World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf)
local oright = Vector(World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf)
local mleft = Vector(-World.Geometry.FieldWidthHalf, 0)
local mright = Vector(World.Geometry.FieldWidthHalf, 0)
Entrypoints.add("Lineup/Friendly Left", function() generateLineup(fleft, math.pi/2) end)
Entrypoints.add("Lineup/Friendly Right", function() generateLineup(fright, math.pi/2) end)
Entrypoints.add("Lineup/Opponent Left", function() generateLineup(oleft, -math.pi/2) end)
Entrypoints.add("Lineup/Opponent Right", function() generateLineup(oright, -math.pi/2) end)
Entrypoints.add("Lineup/Middle Left", function() generateLineup(mleft, math.pi/2) end)
Entrypoints.add("Lineup/Middle Right", function() generateLineup(mright, math.pi/2) end)
