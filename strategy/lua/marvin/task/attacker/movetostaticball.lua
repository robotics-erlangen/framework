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

local MoveToStaticBall = Class("Task.MoveToStaticBall", require "task/base")

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function MoveToStaticBall:_init(rotation, distanceToBall)
	self._rotation = rotation or math.pi/2
	self._distanceToBall = distanceToBall or 0.03
	self._obstacleTable = {extraBallDistance = self._distanceToBall, ignorePass = true, ignorePenaltyDistance = true}
end

function MoveToStaticBall:run()
	local absDistToBall = self._distanceToBall + self._robot.radius + World.Ball.radius
	local pos = World.Ball.pos - Vector.fromAngle(self._rotation) * absDistToBall

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	self._robot.trajectory:update(ToTarget, pos, self._rotation)

	-- send the position of the ball
	self._send.attackPosition("all", World.Ball.pos)
end

return MoveToStaticBall
