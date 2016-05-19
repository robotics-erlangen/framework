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
			local ballRollTime = Physics.ballRollTime(World.Ball, (pointOnLine - World.Ball.pos):length())
			local chance = Ball.ballCatchProbability(robot, 0, ballRollTime, pointOnLine, corridorHalf)
			if chance == chance then
				vis.addCircle("test: BallCatchProb", robot.pos, 0.2, vis.fromTemperature(chance), true)
			end
		end
	end
end


local isShotCooldown = 0.3
local lastShootTime = 0
local lastShootRobotPos = nil

function BallTest.testIsShot()
	local time = World.Time
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
