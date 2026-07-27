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

local moveToBall = Class("Task.moveToBall", require "task/base")

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local vis = require "../base/vis"


function moveToBall:_init(ballAddSpeed)
	self._addspeed = ballAddSpeed or 0
	self._angleWeight = 1
	self._obstacleTable = {
		ignoreBall = true,
		ignorePass = true,
		ignoreDefenseArea = true,
		ignoreOpponentDefenseArea = false,
	}
end

function moveToBall:run()
	local ball = World.Ball
	local offset = (self._robot.pos - ball.pos):setLength(self._robot.shootRadius + World.Ball.radius)
	offset.y = 0
	local pos = ball.pos - offset
	-- self._robot.pos * 0.5 + ball.pos/2 - Vector(0, self._robot.radius/3) + ball.speed/10
	vis.addCircle("toball", pos, ball.pos:distanceTo(pos), vis.colors.redHalf, true)
	local dir = ball.pos - pos
	local dir2 = World.Geometry.OpponentGoal - pos
	dir = dir / dir2:lengthSq() + dir2 / dir:lengthSq()
	dir = dir:angle()

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)
	self._robot.trajectory:update(ToTarget, pos, dir, nil, ball.speed * 0.98 + Vector(dir2:setLength(0.1).x, self._addspeed))

end

return moveToBall
