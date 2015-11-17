local Duel = Class("Task.Duel", require "task/base")

local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local debug = require "../base/debug"
local Physics = require "observer/physics"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local Direct = require "trajectory/direct"
local ToTarget = require "trajectory/totarget"


function Duel:_init()
	self._opposer = nil
	self._blockingBall = false
end

function Duel:run()
	-- search for the best duel target (can be nil!)
	-- 1. get the opponent ball owner, if possible
	-- 2. get the opponent, that reaches the ball first inside the field boundaries
	self._opposer = Ball.opponentBallOwner()
	if not self._opposer then
		self._opposer = Ball.firstRobotAtBall(World.OpponentRobots)
	end

	-- notify all that we are duelling
	if self._opposer then
		self._send.defendedOpponent("all", self._opposer)
	end


	if self._opposer and self._robot:hasBall(World.Ball) then
		self:_contest()
		debug.set("duel-state", "contest")
	else
		self:_moveToBall()
		debug.set("duel-state", "move to ball")
	end
end

function Duel:_contest()
	--decide if we should rotate cw or ccw
	local toOpponentDir = self._opposer.pos - self._robot.pos
	local intersection = geom.intersectLineLine(
			self._robot.pos, toOpponentDir, World.Geometry.OpponentGoal, Vector(1, 0))
	local ccw = intersection and math.sign(intersection.x) or 1 --positive = ccw, negative = cw
	local toBall = (World.Ball.pos - self._robot.pos):setLength(0.2)
	self._robot.trajectory:update(Direct, toBall, nil, ccw * 2 * 2*math.pi) -- 2 turns per second

	-- send the position of the ball
	self._send.attackPosition("all", World.Ball.pos)
end

function Duel:_moveToBall()
	local moveTime = Robot.minTimeToBall(self._robot)
	local moveDest = Physics.ballAtTime(World.Ball, moveTime).pos
	local viewDir = (moveDest - self._robot.pos):angle()
	moveDest = moveDest - Vector.fromAngle(viewDir) * self._robot.shootRadius

	local shortestTimeToBall = math.huge
	local closestOpponentRobot = nil
	-- see if an opponent is at the ball before me
	for _,r in ipairs(World.OpponentRobots) do
		local oppTime = Robot.minTimeToBall(r)
		if oppTime < shortestTimeToBall then
			debug.set("oppTime", oppTime)
			debug.set("moveTime", moveTime)

			shortestTimeToBall = oppTime
			closestOpponentRobot = r
		end
	end
	self._robot.path:setDefaultObstacles(self._robot, true, false, false, self._robot.shootRadius)
	-- don't predict opponents, to avoid them blocking the target position
	self._robot.path:addRobotObstacles(self._robot, nil, nil, true)
	-- drive in front of the opponent robot
	local DIFF = self._robot.radius/2
	local moveBall = World.Ball.pos
	if closestOpponentRobot then
		local viewDirBall = World.Ball.pos - closestOpponentRobot.pos
	 	moveBall = moveBall + viewDirBall:setLength(self._robot.radius + World.Ball.radius + 0.02)
	end
	moveDest = self._robot.pos:nearestPosOnLine(moveBall, World.Geometry.FriendlyGoal)


	local distToLine = moveDest:distanceTo(self._robot.pos)
	if distToLine <= DIFF then
		self._blockingBall = true
	elseif distToLine > DIFF + 0.02 then
		self._blockingBall = false
	end

	debug.set("moveDest posOnLine", moveDest)

	if self._blockingBall then
		if closestOpponentRobot then
			moveDest = closestOpponentRobot.pos + Vector.fromAngle(closestOpponentRobot.dir) * (
				closestOpponentRobot.shootRadius + self._robot.shootRadius)
		else
			moveDest = World.Ball.pos + (World.Geometry.FriendlyGoal - World.Ball.pos):setLength(
				World.Ball.radius + self._robot.shootRadius)
		end
	end

	debug.set("moveDest dribbler", moveDest)


	self._robot.trajectory:update(ToTarget, moveDest, viewDir)
	vis.addCircle("t/duel: ClearRobot", self._robot.pos, 0.15, vis.colors.redHalf, true)

	-- send the position of the ball
	self._send.attackPosition("all", World.Ball.pos)
end

return Duel
