--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

local MrlTestCorner = Class("Group.Move.MrlTestCorner", require "group/move/base")

local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local Freekick = require "agent/attacker/freekick"
local AcceptPass = require "task/attacker/acceptpass"
local MoveToPos = require "task/shared/movetopos"
local StopAttack = require "task/attacker/stopattack"
local Striker = require "task/attacker/striker"
local MovesHelper = require "util/moveshelper"
local Attack = require "util/attack"
local G = World.Geometry

MrlTestCorner.MIN_ROBOTS = 5
MrlTestCorner.MAX_ROBOTS = 5

function MrlTestCorner.canStart()
	return  World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 and MrlTestCorner.Referee.opponentTouchedLast()
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		and World.RefereeState == "Stop"
end

function MrlTestCorner:_init()
	local goalDist = G.DefenseRadius + 0.4
	self._distractorPositions = {
		Vector(0.3, G.OpponentGoal.y - goalDist),
		Vector(0.0, G.OpponentGoal.y - goalDist),
		Vector(-0.3, G.OpponentGoal.y - goalDist)
	}
	self._distractorAttackPos = {}
	for i=1,3 do
		self._distractorAttackPos[i] = self._distractorPositions[i] - Vector((i)*0.3 + 0.3, 0.5)
	end

	self._activeRobotInitPos = Vector(-G.FieldWidthHalf / 1.4, G.FieldHeightHalf - 1)
	self._activeRobotShootPos = Vector(G.FieldWidthHalf / 2, G.FieldHeightHalf * 0.3)
	self._restart = true
end

function MrlTestCorner:_canContinue()
	if MrlTestCorner.Referee.isFriendlyFreeKickState() then
		return true
	end
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		and World.RefereeState == "Stop"
end

local function getRobotsInRect(c1, c2, robots, buffer)
	local r = {}
	vis.addAxisAlignedRectangle("g/m/mrlTestCorner: Rect", c1+Vector(-buffer, buffer), c2+Vector(buffer, -buffer), vis.colors.red);
	for _,v in ipairs(robots) do
		if geom.insideRect(c1 + Vector(-buffer, buffer), c2 + Vector(buffer, -buffer), v.pos) then
			table.insert(r, v)
		end
	end
	return r
end
local function taskAssignment( passInfoTable, pos1, pos2, robot, enemyAmm)
	local ballSide = (World.Ball.pos.x > 0) and 1 or -1
	local acceptPass = Attack.checkPassInfos(robot, passInfoTable, false)
	if acceptPass then
		return { class = AcceptPass }
	elseif enemyAmm > 0 then
		return { class = MoveToPos, params = {Vector(pos1.x * ballSide, pos1.y)}}
	else
		return { class = Striker, params = { Vector(pos1.x * ballSide, pos1.y), Vector(pos2.x * ballSide, pos2.y) }}
	end
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
	elseif MrlTestCorner.Referee.isFriendlyFreeKickState() then
		taskAssignments[self._robots[1]] = { behavior = Freekick }
		self._restart = false
	end

	local _, passInfoTable = next(self._inbox.passInfo())

	local buffer = 0.1
	taskAssignments[self._robots[2]] = taskAssignment(passInfoTable, self._activeRobotInitPos, self._activeRobotShootPos, self._robots[2], 0)

	local enemyRobots = getRobotsInRect(self._distractorPositions[1], self._distractorPositions[3] + Vector(-0.6,0.4), World.OpponentRobots, buffer)
	for i=1,3 do
		taskAssignments[self._robots[i+2]] = taskAssignment(passInfoTable, self._distractorPositions[i], self._distractorAttackPos[i], self._robots[i+2], #enemyRobots)
	end

	return taskAssignments, self._robots[1]
end

return MrlTestCorner
