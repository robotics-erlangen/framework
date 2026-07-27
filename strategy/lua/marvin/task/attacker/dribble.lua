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

local CatchBall = require "task/ability/catchball"
local SuggestPass = require "task/ability/suggestpass"
local Dribble = Class("Task.Dribble", require "task/base", SuggestPass, CatchBall)

local World = require "../base/world"
local Physics = require "observer/physics"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

-- Warning: This task has some very strict precoditions.
-- 1. It will only work if you have the ball in the dribbler at the start
-- 2. you have to make sure (somehow) that the (robotPos - waypoint[2]  {returned by path}):absoluteAngleDiff(viewDir) is pretty small

local obstacleTable = {
	ignoreBall = true,
	ignorePass = true
}
function Dribble:_init(pos, suggestPass, endSpeedLength)
	self._pos = pos
	self._dir = (pos - self._robot.pos):angle()
	self._suggestPassFlag = suggestPass
	self._endSpeedLength = endSpeedLength or 0
end

function Dribble:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot:setDribblerSpeed(0.7)

	local time
	if World.Ball.pos:distanceTo(self._robot.pos) > self._robot.radius + World.Ball.radius + 0.05 then
		local catchTime = self:_catchBall(self._pos, 0)
		time = catchTime + Physics.robotTimeToPos(self._robot, self._pos, Vector(0, 0))
	else
		local endSpeed = (self._pos - self._robot.pos):setLength(self._endSpeedLength)
		local _; _, time = self._robot.trajectory:update(ToTarget, self._pos, self._dir, 1.0, endSpeed, nil, true)
	end


	if self._suggestPassFlag then
		self:_suggestPass(self._pos, nil, time)
	end
end

return Dribble
