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
local TestHelper = require "test/helper/agent"
local PathHelper = require "trajectory/pathhelper"
local BallRotate = require "trajectory/ballrotate"


local Task = Class("Test.Task.BallRotate.Task", require "task/base")

local obstacleTable = {
	ignorePass = true
}

function Task:_init()
end

function Task:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	self._robot.trajectory:update(BallRotate, 0.3, 0.2, true)
end


local TestBehaviour = TestHelper.staticBehavior(Task, {})


local BallAgent = Class("Test.Task.BallRotate.Agent", require "agent/base/simpleagent")
BallAgent._behaviors = {
	TestBehaviour
}
-- local SimpleAgent = require "agent/base/simpleagent"
-- function SimpleAgent.checkRobot(robot)
-- 	return robot ~= World.FriendlyKeeper and not robot.userControl
-- end



local run = TestHelper.defaultCoordinator("defend", BallAgent, 1)
Entrypoints.add("TaskTest/BallRotate", run)
