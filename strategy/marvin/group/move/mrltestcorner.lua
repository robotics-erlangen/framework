local MrlTestCorner = Class("Group.Move.MrlTestCorner", require "group/move/base")

local geom = require "../base/geom"
local Referee = require "../base/referee"
local World = require "../base/world"
local Freekick = require "agent/attacker/freekick"
local AcceptPass = require "task/acceptpass"
local MoveToPos = require "task/movetopos"
local StopAttack = require "task/stopattack"
local Striker = require "task/striker"
local MovesHelper = require "util/moveshelper"
local Attack = require "util/attack"
local G = World.Geometry

MrlTestCorner.MIN_ROBOTS = 5
MrlTestCorner.MAX_ROBOTS = 5

function MrlTestCorner.canStart()
	return  World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 and Referee.opponentTouchedLast()
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		and World.RefereeState == "Stop"
end

function MrlTestCorner:_init()
	local ballSide = (World.Ball.pos.x > 0) and -1 or 1
	local goalDist = G.DefenseRadius + 0.4
	self._distractorPositions = {
		Vector(0.3, G.OpponentGoal.y - goalDist),
		Vector(0.0, G.OpponentGoal.y - goalDist),
		Vector(-0.3, G.OpponentGoal.y - goalDist)
	}

	self._activeRobotInitPos = Vector(ballSide * G.FieldWidthHalf / 1.4, G.FieldHeightHalf - 1)
	self._activeRobotShootPos = Vector(-ballSide * G.FieldWidthHalf / 2, G.FieldHeightHalf * 0.3)
	self._restart = true
end

function MrlTestCorner:_canContinue()
	if Referee.isFriendlyFreeKickState() then
		return true
	end
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		and World.RefereeState == "Stop"
end

function MrlTestCorner:_updateTasks()

	-- draw circles where robots cannot shoot a volley
	local center1, center2, radius = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, 55 / 180 * math.pi)
	local circle = center1.y < center2.y and center1 or center2

	if self._activeRobotShootPos:distanceTo(circle) <= radius then
		local posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2
		local intersectionWithCircle = geom.intersectLineCircle(posToShiftFrom, self._activeRobotShootPos - posToShiftFrom, circle, radius)
		self._activeRobotShootPos = posToShiftFrom + (intersectionWithCircle - posToShiftFrom):setLength(intersectionWithCircle:distanceTo(posToShiftFrom) + 0.1)
	end
	local taskAssignments = {}

	if World.RefereeState == "Stop" then
		taskAssignments[self._robots[1]] = { class = StopAttack, params = { } }
	elseif Referee.isFriendlyFreeKickState() then
		taskAssignments[self._robots[1]] = { behavior = Freekick }
		self._restart = false
	end

	local _, passInfoTable = next(self._inbox.passInfo())
	local acceptPass = Attack.checkPassInfos(self._robots[2], passInfoTable, false)
	if acceptPass then
		taskAssignments[self._robots[2]] = { class = AcceptPass }
	else
		taskAssignments[self._robots[2]] = { class = Striker, params = { self._activeRobotInitPos, self._activeRobotShootPos }}
	end

	taskAssignments[self._robots[3]] = { class = MoveToPos, params = { self._distractorPositions[1] }}
	taskAssignments[self._robots[4]] = { class = MoveToPos, params = { self._distractorPositions[2] }}
	taskAssignments[self._robots[5]] = { class = MoveToPos, params = { self._distractorPositions[3] }}

	return taskAssignments, self._robots[1]
end

return MrlTestCorner
