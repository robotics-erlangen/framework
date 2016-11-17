local Armada = Class("Group.Move.Armada", require "groups/moves/base")

local Referee = require "../base/referee"
local World = require "../base/world"
local MoveToPos = require "task/movetopos"
local MoveToStaticBall = require "task/movetostaticball"
local StopAttack = require "task/stopattack"
local ArmadaTask = require "groups/moves/armadatask"
local G = World.Geometry

Armada.N_ROBOTS = 5

-- the armada has 4 steps to form stairs, depending on ball distance
local X_POSITIONS_ORIG = {
	G.FieldWidthHalf * 5/8,
	G.FieldWidthHalf * 1/4,
	-G.FieldWidthHalf * 1/4,
	-G.FieldWidthHalf * 5/8
}
local Y_BALL_DISTS_RIGHT_ORIG = {
	-G.FieldHeightHalf * 1/4,
	0,
	G.FieldHeightHalf * 1/4,
	G.FieldHeightHalf * 1/2,
}
local Y_BALL_DISTS_LEFT_ORIG = {
	G.FieldHeightHalf * 1/2,
	G.FieldHeightHalf * 1/4,
	0,
	-G.FieldHeightHalf * 1/4
}

local MAX_RANDOM_POSITION_OFFSET = 0.3
local CIRCLE_CENTER_ORIG = Vector(0,-1)

function Armada.canStart()
	return  World.Ball.pos.y > G.FieldHeightHalf / 5 --and Referee.opponentTouchedLast()
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		and World.RefereeState == "Stop"
end

local function getRandomOffsetVector()
	local result = Vector(0,0)
	result.x = (math.random()-0.5)*2 * MAX_RANDOM_POSITION_OFFSET
	result.y = (math.random()-0.5)*2 * MAX_RANDOM_POSITION_OFFSET
	return result
end

function Armada:_init()
	self._circleCenter = Vector(0,0) + getRandomOffsetVector()
	self._yPosOrig = World.Ball.pos.x > 0 and Y_BALL_DISTS_RIGHT_ORIG or Y_BALL_DISTS_LEFT_ORIG
end

function Armada:_canContinue()
	if Referee.isFriendlyFreeKickState() then
		return true
	end
	return World.Ball.pos.y > G.FieldHeightHalf / 5 - 0.2 
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		and World.RefereeState == "Stop"
end

function Armada:_updateTasks()
	local taskAssignments = {}
	taskAssignments[self._robots[1]] = { class = StopAttack, params = { } }
	taskAssignments[self._robots[2]] = { class = ArmadaTask, params = { 1, self._circleCenter,
		Vector(X_POSITIONS_ORIG[1], self._yPosOrig[1]) + getRandomOffsetVector() } }
	taskAssignments[self._robots[3]] = { class = ArmadaTask, params = { 2, self._circleCenter,
		Vector(X_POSITIONS_ORIG[2], self._yPosOrig[2]) + getRandomOffsetVector() } }
	taskAssignments[self._robots[4]] = { class = ArmadaTask, params = { 3, self._circleCenter,
		Vector(X_POSITIONS_ORIG[3], self._yPosOrig[3]) + getRandomOffsetVector() } }
	taskAssignments[self._robots[5]] = { class = ArmadaTask, params = { 4, self._circleCenter,
		Vector(X_POSITIONS_ORIG[4], self._yPosOrig[4]) + getRandomOffsetVector() } }
	return taskAssignments 
end

return Armada
