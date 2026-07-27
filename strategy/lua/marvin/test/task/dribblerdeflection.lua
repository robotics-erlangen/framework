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

local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"

local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Pass = require "task/shared/pass"
local Trainer = require "trainer/trainer"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local DRIBBLER_SPEED = 1

local obstacleTable = {
	ignorePass = true
}

local Position = Class("Test.Task.DribblerDeflection.Position", require "agent/base/behavior")
function Position:run()
	self._robot:setDribblerSpeed(DRIBBLER_SPEED)

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, self._robot.pos, (World.Ball.pos - self._robot.pos):angle())
end

local ShooterBehaviour = Class("Test.Task.DribblerDeflection.ShooterBehaviour", require "agent/base/behavior")
function ShooterBehaviour:check()
	self._send.attackerFlag("all")
	local mainAttacker = self._inbox.mainAttacker().trainer
	if mainAttacker and false then
		log(tostring(self._robot).." "..tostring(self._inbox.mainAttacker()))
	end
	if not mainAttacker or mainAttacker == self._robot then
		self:_applyForMainAttacker()
		return true
	end
	return false
end

function ShooterBehaviour:_stop()
	self._framesSinceMove = 0
end

function ShooterBehaviour:_updateTask()
	if (World.Ball.speed:length() < 0.4 or self._robot.pos:distanceTo(World.Ball.pos) < 0.3)  and
			math.abs(World.Ball.pos.x) < World.Geometry.FieldWidthHalf and
			math.abs(World.Ball.pos.y) < World.Geometry.FieldHeightHalf then

		self._framesSinceMove = self._framesSinceMove + 1
		if self._framesSinceMove > 10 then
			local otherRobot = next(self._inbox.attackerFlag())
			return Pass, {otherRobot}
		end
	else
		self._framesSinceMove = 0
	end
	return Position, {}
end

local PositionBehaviour = Class("Test.Task.DribblerDeflection.PositionBehaviour", require "agent/base/behavior")
function PositionBehaviour:check()
	return true
end

function PositionBehaviour:_updateTask()
	return Position, {}
end

local DribblerDeflectionAgent = Class("Test.Task.DribblerDeflectionAgent", require "agent/base/simpleagent")
DribblerDeflectionAgent._behaviors = {
	ShooterBehaviour,
	PositionBehaviour
}

local coord = nil

local function run()
	if coord == nil then
		local trainer = Trainer()
		local pools = { pass = AgentPool(DribblerDeflectionAgent, 2) }
		local poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/DribblerDeflection", run)
