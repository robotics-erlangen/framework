local Victory = Class("Group.Move.Victory", require "group/move/base")

local World = require "../base/world"
local G = World.Geometry

local MoveToPos = require "task/movetopos"
local VictoryTask = require "task/victory"

local vis = require "../base/vis"

Victory.MIN_ROBOTS = 4
Victory.MAX_ROBOTS = 5

function Victory.canStart() -- TODO
	return true
end

function Victory:_init()
	self._state = "init"
end

function Victory:_canContinue() -- TODO
	return true
end

function Victory:_updateTasks()
	local taskAssignments = {}

	local nRobots = #self._robots
	-- TODO: radius sinnvoller
	local radius = (G.FieldHeightHalf - G.DefenseRadius) / 2
	local center = Vector(0, -radius)
	radius = radius - 0.5
	log("center = "..radius..", radius = "..radius)
	vis.addCircle("test", center, 0.05, vis.colors.yellow, true)
	local angleStep = 2 * math.pi / nRobots

	if self._state == "init" then -- todo startposition fixen
		log("ho")
		for i, _ in ipairs(self._robots) do
			local angle = i * angleStep
			local moveLine = Vector.fromAngle(angle):setLength(radius/2)
			log("moveLine = "..tostring(moveLine))
			local pos = center - Vector(0, -radius/2) + moveLine
			taskAssignments[self._robots[i]] = { class = MoveToPos, params = {pos}}
			if self._robots[i].pos:distanceTo(pos) > 0.1 then
				self._state = "circle"
			end
		end
	elseif self._state == "circle" then
		for i, _ in ipairs(self._robots) do
			local angle = (i-1) * angleStep
			taskAssignments[self._robots[i]] = { class = VictoryTask, params = {center, 0, angle, radius}}
		end
	end

	return taskAssignments
end
return Victory