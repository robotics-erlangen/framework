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
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local TestHelper = require "test/helper/agent"

local obstacleTable = {
	ignorePass = true
}

local ShootSpeedTest = Class("Test.Task.ShootSpeedTest", require "task/base")

function ShootSpeedTest:_init(speed)
	self._shootSpeed = speed
	self._ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
end

function ShootSpeedTest:run()
	local ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
	local shootDistance = math.max(0, math.abs(self._robot.pos.y) - self._robot.shootRadius - World.Ball.radius)
	if not ballInHalf and self._ballInHalf then
		log("Ball speed:  Look at the raw values in the plotter")
		log("Shoot speed: " .. tostring(self._robot:calculateShootSpeed(self._shootSpeed, math.abs(self._robot.pos.y))))
		log("Distance:    " .. tostring(shootDistance))
	end
	self._ballInHalf = ballInHalf

	local shootSpeed = self._robot:calculateShootSpeed(self._shootSpeed, shootDistance)
	self._robot:shoot(shootSpeed)
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, self._robot.pos, self._robot.pos.y < 0 and math.pi/2 or -math.pi/2)
end


local Agent = Class("Test.Task.ShootSpeedTest.Agent", require "agent/base/simpleagent")
Agent._behaviors = {
	TestHelper.staticBehavior(ShootSpeedTest, { 2 })
}


local run = TestHelper.defaultCoordinator("attack", Agent, 1)
Entrypoints.add("TaskTest/ShootSpeed", run)
