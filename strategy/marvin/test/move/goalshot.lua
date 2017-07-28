local GoalShot = Class("Test.Move.GoalShot", require "group/move/base")

local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local World = require "../base/world"
local Robot = require "../base/robot"
local World = require "../base/world"
local G = World.Geometry
local Ball = require "observer/ball"
local Default = require "agent/attacker/default"
local Halt

local ShootGoal = require "task/shootgoal"

GoalShot.MIN_ROBOTS = 1
GoalShot.MAX_ROBOTS = 1

local TIMES = 3 -- number of goalshots per distance
local INTERVAL = 0.5

function GoalShot.canStart()
	return true
end

function GoalShot:_init()
	self._shotTime = nil
	self._distance = 0
	self._times = 0
	log("")
	log("Distance: "..tostring(G.FieldHeightHalf - self._distance))
end

function GoalShot:_canContinue()
	return true
end

function GoalShot:_update()
	if self._shotTime and (World.Ball.pos.y < -G.FieldHeightHalf or World.Ball.pos:distanceTo(World.OpponentKeeper.pos) < self._robots[1].radius + World.Ball.radius + 0.02) then
		log("Try No. "..tostring(self._times+1)..":")
		log("Ball travel time: "..tostring(World.Time - self._shotTime))
		self._shotTime = nil
		self._times = self._times + 1
		if self._times == TIMES then
			self._distance = self._distance + INTERVAL
			self._times = 0
			log("")
			log("Distance: "..tostring(G.FieldHeightHalf - self._distance))
		end
	end
end

function GoalShot:_updateTasks()
	local taskAssignments = {}
	self:_update()

	local prep = World.RefereeState == "IndirectOffensive"
	local shoot = World.RefereeState == "DirectOffensive"
	local abort = World.RefereeState == "KickoffOffensivePrepare"

	local pos = Vector(0, self._distance)
	if abort then
		self._shotTime = nil
		taskAssignments[self._robots[1]] = {class = MoveToPos, params = {pos, math.pi/2}, restart = true}
	elseif prep then
		taskAssignments[self._robots[1]] = {class = MoveToPos, params = {pos, math.pi/2}, restart = true}
	elseif Ball.isShot() then
		self._shotTime = World.Time
		taskAssignments[self._robots[1]] = {class = MoveToPos, params = {pos, math.pi/2}, restart = true}
	elseif shoot then
		taskAssignments[self._robots[1]] = {class = ShootGoal}
	else
		taskAssignments[self._robots[1]] = {class = MoveToPos, params = {pos, math.pi/2}, restart = true}
	end


	return taskAssignments, self._robots[1]
end

return GoalShot
