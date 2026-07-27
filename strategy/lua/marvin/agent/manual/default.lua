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

local Base = require "agent/base/behavior"
local Default = Class("Agent.Manual.Default", Base)

local geom = require "../base/geom"
local World = require "../base/world"

local Manual = require "task/manual/manual"
local Pass = require "task/shared/pass"
local ShootGoal = require "task/attacker/shootgoal"


function Default:_stop()
	self._shootTarget = nil
end

function Default:check()
	self:_applyForMainAttacker()

	return true
end

function Default:_chooseShootTarget()
	local targets = {}

	table.insert(targets, { pos = World.Geometry.OpponentGoal })
	for attacker in pairs(self._inbox.attackerFlag()) do
		table.insert(targets, attacker)
	end

	local bestTarget = nil
	local bestTargetAngleDiff = math.huge
	for _, target in ipairs(targets) do
		local targetAngleDiff = math.abs(geom.normalizeAngle((target.pos - self._robot.pos):angle() - self._robot.dir))
		if targetAngleDiff < bestTargetAngleDiff then
			bestTarget = target
			bestTargetAngleDiff = targetAngleDiff
		end
	end

	self._shootTarget = bestTarget
end

function Default:_shootBall()
	if not self._shootTarget then
		self:_chooseShootTarget()
	end

	if self._shootTarget.pos == World.Geometry.OpponentGoal then
		return ShootGoal
	else
		local ballPos = self._shootTarget.pos + Vector.fromAngle(self._shootTarget.dir) * (World.Ball.radius + self._shootTarget.shootRadius)
		self._send.passInfo("all", {{ target = self._shootTarget, ballPos = ballPos, time = World.Time }})
		return Pass, { self._shootTarget }
	end
end

function Default:_updateTask()
	local input = self._robot.userControl
	local requestBallFlag = input.dribblerSpeed and input.dribblerSpeed > 0
	local shootBallFlag = input.kickPower and input.kickPower > 0

	if shootBallFlag and self._inbox.mainAttacker().trainer == self._robot then
		return self:_shootBall(shootBallFlag)
	else
		self._shootTarget = nil
	end

	if requestBallFlag then
		local ballPos = self._robot.pos + (World.Ball.pos - self._robot.pos):setLength(World.Ball.radius + self._robot.shootRadius)
		self._send.passSuggestion("all",
			{ ballPos = ballPos, time = 0 , manual = true })
	end

	return Manual
end

return Default
