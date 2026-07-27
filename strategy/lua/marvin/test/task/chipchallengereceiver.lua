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
local Shoot = require "task/ability/shoot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local TestHelper = require "test/helper/agent"
local debug = require "../base/debug"

local ChipChallengeReceiver = Class("Test.Task.ChipChallengeReceiver", require "task/base", Shoot)

local obstacleTable = {
	ignoreGoals = true,
	ignoreDefenseArea = true,
	ignorePass = true,
	pathRadius = 0,
	stopBallDistance = 0.1
}

function ChipChallengeReceiver:_init()
	self._ballKicked = false
	self._moveDest =  World.Geometry.FriendlyGoal -- random fallback
end

function ChipChallengeReceiver:run()
	local ball = World.Ball

	if World.Ball.posZ > 0 then
		self._ballKicked = true
	end


	local kickingRobot = World.OpponentRobots[1]
	if self._ballKicked and kickingRobot and kickingRobot.pos:distanceTo(World.Ball.pos) > 1.5 then
		self._moveDest = World.Ball.touchdownPos
	elseif kickingRobot and World.Ball.speed:length() < 0.3 then
		debug.set("ball speed", World.Ball.speed:length())
		local bp = World.Ball.pos
		self._moveDest = bp + Vector.fromAngle(kickingRobot.dir):setLength(3.1)
	end

	local toBall = (ball.pos - self._robot.pos):angle()

	PathHelper.setDefaultObstaclesByTable(self._robot, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, self._moveDest, toBall)
end


local Agent = Class("Test.Task.ChipChallengeReceiver.Agent", require "agent/base/simpleagent")
Agent._behaviors = {
	TestHelper.staticBehavior(ChipChallengeReceiver, { 1 })
}


local run = TestHelper.defaultCoordinator("attack", Agent, 1)
Entrypoints.add("TaskTest/ChipChallengeReceiver", run)
