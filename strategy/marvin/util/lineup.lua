local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local MoveToPos = require "task/movetopos"


local function generateLineup(lineStart, lineupDir) 
	local lineEnd = Vector.fromAngle(lineupDir) -- not really the "end" of the line, more a direction
	local lineupDistance = 0.08 -- keep 8 cm distance to make taking the robots more comfortable
	local opponentDistance = 0.03 -- always keep at least 3 cm safety distance to opponent robots
	
	--FIXME
	local viewDir = lineupDir + math.pi/2 
	
	local distances = {}
	
	-- filter and sort opponent robots
	local filter = function(r)
		local proj, orthDist = r.pos:orthogonalProjection(lineStart, lineEnd)
		distances[r] = proj:distanceTo(lineStart) -- just for calculating the value once, required in compare()
		return orthDist < 0.09 + opponentDistance + r.radius -- 9 cm = max robot radius
	end
	local compare = function(a, b)
		return distances[a] < distances[b]
	end
	local sortedOpps = table.copy(World.OpponentRobots)
	table.filter(sortedOpps, filter)
	table.sort(sortedOpps, compare)
	
	-- place frienly robots along the given line
	local distToStart = 0
	local friendlyIndex = 1
	local opponentIndex = 1
	while friendlyIndex <= #World.FriendlyRobots do
		local r = World.FriendlyRobots[friendlyIndex]
		local opp = World.OpponentRobots[opponentIndex]
		
		local intendedPos = lineStart + lineEnd * distToStart
		if opp.pos:distanceTo(intendedPos) < r.radius + opponentDistance + opp.radius then
			local distIncrease = (distances[opp] - distToStart) * 2
			assert(distIncrease > 0, "BUG")
			distToStart = distToStart + distIncrease
			opponentIndex = opponentIndex + 1
		else
			local pseudoagent = {robot = function(...) return r end} --FIXME hack
			local task = MoveToPos.create(pseudoagent, intendedPos, viewDir)
			task.run(task)
			friendlyIndex = friendlyIndex + 1
			distToStart = distToStart + lineupDistance + 2*r.radius
		end
	end
end

local fleft = Vector.create(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
Entrypoints.add("Lineup/Friendly Left", function()
	generateLineup(fleft, math.pi/2)
end)
