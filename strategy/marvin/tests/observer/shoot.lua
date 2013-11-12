local ShootTest = {}

local World = require "../base/world"
local Constants = require "../base/constants"
local Shoot = require "observer/shoot"
local Ball = require "observer/ball"
local vis = require "../base/vis"
local debug = require "../base/debug"

function ShootTest.testCatchProbability()
	local robot = World.OpponentRobots[1]
	local catchPos = robot.pos:nearestPosOnLine(World.Ball.pos, World.Geometry.OpponentGoal)
	local corridorWidthHalf = World.Ball.radius + Constants.positionError
	local way = World.Geometry.OpponentGoal - World.Ball.pos
	local corridorHalf = way:perpendicular():setLength(corridorWidthHalf)
	local ballRollTime = Ball.ballRollTime(8, (catchPos - World.Ball.pos):length())
	local prob = Shoot.ballCatchProbability(World.OpponentRobots[1], 0, ballRollTime, catchPos, corridorHalf)
	vis.addPath("Way to Goal", {World.Ball.pos, World.Geometry.OpponentGoal})
	vis.addPath("Catch Ball", {robot.pos, catchPos})
	vis.addPath("robot speed", {robot.pos, robot.pos + robot.speed})
	debug.set("Catch Probability", prob)
	debug.set("Ball Roll Time", ballRollTime)
end

return ShootTest