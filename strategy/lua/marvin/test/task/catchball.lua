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

local TestHelper = require "test/helper/agent"
local PathHelper = require "trajectory/pathhelper"
local CatchballAbility = require "task/ability/catchball"

local CatchballTask = Class("Test.Task.Catchball.Task", require "task/base", CatchballAbility)

local obstacleTable = {
	ignorePass = true
}

function CatchballTask:_init()
end

function CatchballTask:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot:setDribblerSpeed(1)
	self:_catchBall(World.Geometry.OpponentGoal)
end

local CatchballBehavior = TestHelper.staticBehavior(CatchballTask, {})

local CatchballAgent = Class("Test.Task.Catchball.Agent", require "agent/base/simpleagent")
CatchballAgent._behaviors = {
	CatchballBehavior
}

local run = TestHelper.defaultCoordinator("attack", CatchballAgent, 1)
Entrypoints.add("TaskTest/Catchball", run)
