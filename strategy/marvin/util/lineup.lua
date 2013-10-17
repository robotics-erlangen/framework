local Entrypoints = require "../base/entrypoints"
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
		log("orthdist = "..orthDist)
		distances[r] = proj:distanceTo(lineStart) -- just for calculating the value once, required in compare()
		return orthDist * orthDist < mindist * mindist -- 9 cm = max robot radius
	end
	local compare = function(a, b)
		return distances[a] < distances[b]
	end
	local sortedOpps = table.filter(World.OpponentRobots, filter)
	table.sort(sortedOpps, compare)

	log(#sortedOpps)
	for i = 1, #sortedOpps do
	    log(sortedOpps[i])
	end

	-- place friendly robots along the given line
	local distToStart = 0
	local friendlyIndex = 1
	local opponentIndex = 1
	while friendlyIndex <= #World.FriendlyRobots do
		local r = World.FriendlyRobots[friendlyIndex]
		local opp = #sortedOpps > 0 and sortedOpps[opponentIndex]
		local intendedPos = lineStart + (lineEnd - lineStart) * distToStart

		if opp and opp.pos:distanceTo(intendedPos) < mindist then
			local xdiff = opp.pos.x - lineStart.x
			distToStart = opp.pos.y - lineStart.y + math.sqrt(mindist * mindist - xdiff * xdiff)	
			opponentIndex = opponentIndex + 1
		else
			local pseudoagent = {robot = function(...) return r end} --FIXME hack
			local task = MoveToPos.create(pseudoagent, intendedPos, viewDir)
			task.run(task)
			friendlyIndex = friendlyIndex + 1
			distToStart = distToStart + mindist
		end
	end
end

local fleft = Vector.create(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
Entrypoints.add("Lineup/Friendly Left", function()
	generateLineup(fleft, math.pi/2)
end)
