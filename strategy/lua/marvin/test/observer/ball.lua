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

local BallTest = {}

local vis = require "../base/vis"
local Constants = require "../base/constants"
local Field = require "../base/field"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"


function BallTest.testBallOwner()
	local fowner = Ball.friendlyBallOwner()
	if fowner then
		vis.addCircle("test: Ball Owner", fowner.pos, 0.2, vis.colors.skyBlueHalf, true)
	end

	local oowner = Ball.opponentBallOwner()
	if oowner then
		vis.addCircle("test: Ball Owner", oowner.pos, 0.2, vis.colors.blueHalf, true)
	end
end


function BallTest.testBallCatchProbability()
	if World.Ball.speed:length() > 0.1 then
		local endOfField = Field.nextLineCut(World.Ball.pos, World.Ball.speed)
		local corridorHalf = World.Ball.speed:perpendicular():setLength(World.Ball.radius + Constants.positionError) * 2
		for _,robot in ipairs(World.OpponentRobots) do
			local pointOnLine = robot.pos:nearestPosOnLine(World.Ball.pos, endOfField)
			local ballRollTime = Physics.ballRollTime(World.Ball, pointOnLine:distanceTo(World.Ball.pos))
			local chance = Ball.ballCatchProbability(robot, 0, ballRollTime, pointOnLine, corridorHalf)
			if chance == chance then
				vis.addCircle("test: BallCatchProb", robot.pos, 0.2, vis.fromTemperature(chance), true)
			end
		end
	end
end

function BallTest.testReceivesPass()
	for _,robot in ipairs(World.OpponentRobots) do
		local color = Ball.receivesPass(robot) and vis.colors.orangeHalf or vis.colors.skyBlueHalf
		vis.addCircle("test: ReceivesPass", robot.pos, 0.2, color, true)
	end
end



local isShotCooldown = 0.3
local lastShootTime = 0
local lastShootRobotPos = nil

function BallTest.testIsShot()
	local r = Ball.isShot()
	if r then
		lastShootTime = World.Time
		lastShootRobotPos = r.pos
	end
	if World.Time <= lastShootTime + isShotCooldown then
		vis.addCircle("test: Is Shot", lastShootRobotPos, 0.15, vis.colors.magentaHalf, true)
	end
end

return BallTest
