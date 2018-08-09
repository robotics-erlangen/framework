local Duel = Class("Task.Duel", require "task/base")

local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local math = require "../base/math"
local vis = require "../base/vis"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local Direct = require "trajectory/direct"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local UtilDefense = require "util/defense"


local STAY_BEHIND_OPP_ANGLE = 120/180 * math.pi
local STAY_BEHIND_OPP_HYSTERESIS = 10/180 * math.pi
local SIDEWARDS_ANGLE_MAX = 30/180 * math.pi
local SIDEWARDS_ANGLE_SCALE = 1/3

local BLOCK_DIST_MAX = 0.08
local BLOCK_DIST_HYSTERESIS = 0.02

local BLOCK_POS_ALPHA = 0.1
local BLOCK_POS_PRECISION = 0.01

local DEFENSE_AREA_MIN_DISTANCE = 0.04

local BEFORE_OPPONENT_HYSTERESIS = 0.2
local BEFORE_OPPONENT_TIME = 0.3

local OPPONENT_DEFENSE_AREA_MIN_DISTANCE = 0.1


function Duel:_init()
	self._opposer = nil
	self._defendedOpponentMessageSent = false
	self._blockingBall = false
	self._oldPosition = nil
	self._stayBehindOpp = false
	self._beforeOpp = false
	self._futureBall = nil
	self._rotating = false
end

function Duel:run()
	// search for the best duel target (can be nil!)
	// 1. get the opponent ball owner, if possible
	// 2. get the opponent, that reaches the ball first inside the field boundaries
	self._opposer = Ball.opponentBallOwner()
	if not self._opposer then
		self._opposer = Ball.firstRobotAtBall(World.OpponentRobots)
	end

	// notify all that we are duelling
	local distToOpp = self._opposer and self._robot.pos:distanceTo(self._opposer.pos) or math.huge
	self._defendedOpponentMessageSent = distToOpp < (self._defendedOpponentMessageSent and 0.6 or 0.3)
	if self._defendedOpponentMessageSent then
		self._send.defendedOpponent("all", self._opposer)
	end


	if self._opposer and self._blockingBall and Robot.hadBall(self._robot, 0) then
		self:_contest()
		debug.set("duel-state", "contest")
	else
		self:_moveToBall()
		debug.set("duel-state", "move to ball")
	end
end

function Duel:_contestRotate()
	//decide if we should rotate cw or ccw
	local toOpponentDir = self._opposer.pos - self._robot.pos
	local intersection = geom.intersectLineLine(
			self._robot.pos, toOpponentDir, World.Geometry.FriendlyGoal, Vector(1, 0))
	local ccw = intersection and -math.sign(intersection.x) or -1 //negative = ccw, positive = cw
	local toBall = World.Ball.speed + (World.Ball.pos - self._robot.pos):setLength(0.4)
	self._robot:setDribblerSpeed(0.8)
	self._robot.trajectory:update(Direct, toBall, nil, ccw * 2*math.pi) // 1 turn per second
end

function Duel:_contestPush()
	local viewDir = (World.Ball.pos - World.Geometry.FriendlyGoal):angle()
	local destinationPos = World.Ball.pos - Vector.fromAngle(viewDir) * self._robot.shootRadius
	local obstacleTable = {
		ignoreBall = true,
		inbox = self._inbox,
		ignoreOpponentRobots = true
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, destinationPos, viewDir)
end

function Duel:_contest()
	self._rotating = self._rotating and World.Ball.pos.y > -World.Geometry.FieldHeightHalf / 3
		or World.Ball.pos.y > -World.Geometry.FieldHeightHalf / 6

	if self._rotating then
		self:_contestRotate()
	else
		self:_contestPush()
	end

	if self._robot.dir > 0 and self._robot.dir < math.pi and World.Ball.pos.y > 0.2
			and not Robot.hadBall(self._opposer, 0) then
		self._robot:shoot(7.5)
	end

	// send the position of the ball
	self._send.attackPosition("all", World.Ball.pos)
	self:_checkBlockingBall()
end

function Duel:_moveToNearBlock(closestOpponentRobot)
	// all decisions are made to keep the own goal covered
	local baseDir = (self._futureBall - World.Geometry.FriendlyGoal):angle()
	local oppViewDir = (self._futureBall - closestOpponentRobot.pos):angle()
	local oppDir = geom.normalizeAngle(oppViewDir - baseDir)

	if math.abs(oppDir) < math.pi - STAY_BEHIND_OPP_ANGLE then
		self._stayBehindOpp = true
	elseif math.abs(oppDir) > math.pi - STAY_BEHIND_OPP_ANGLE + STAY_BEHIND_OPP_HYSTERESIS then
		self._stayBehindOpp = false
	end

	local targetAngle, ballDist
	if self._stayBehindOpp then
		targetAngle = 0
		// if opponent doesn't exactly look away from our goal, close the gap
		ballDist = self._robot.radius + math.cos(oppDir) * 2*closestOpponentRobot.radius + World.Ball.radius
	else
		local sidewardsAngle = math.min(
			(math.pi - math.abs(oppDir)) * SIDEWARDS_ANGLE_SCALE, SIDEWARDS_ANGLE_MAX)
		targetAngle = sidewardsAngle * (- math.sign(oppDir))
		ballDist = self._robot.radius + World.Ball.radius
	end

	return self._futureBall - Vector.fromAngle(baseDir + targetAngle) * ballDist
end

function Duel:_checkBlockingBall()
	local closestOpponentRobot, shortestTimeToBall = Ball.firstRobotAtBall(World.OpponentRobots)

	local moveTime = Robot.minTimeToBall(self._robot)
	local minTime = math.min(moveTime, shortestTimeToBall)
	self._futureBall = Physics.ballAtTime(World.Ball, minTime).pos
	vis.addCircle("t/duel: future ball", self._futureBall, World.Ball.radius + 0.01, vis.colors.green)

	// pos before the defense area; the possibility of crashing into centerbacks was considered
	// but disregarded because blocking a shot on the goal is more important,
	// and the probabilty of it being the final position is small
	local intersectionDefenseArea = Field.intersectRayDefenseArea(self._futureBall,
			World.Geometry.FriendlyGoal - self._futureBall,
			self._robot.radius + DEFENSE_AREA_MIN_DISTANCE, true)
	local basePos

	if intersectionDefenseArea then
		basePos = intersectionDefenseArea
	else
		basePos = self._robot.pos
	end

	local distToLine = self._robot.pos:distanceToLineSegment(basePos, self._futureBall)
	if distToLine <= BLOCK_DIST_MAX then
		self._blockingBall = true
	elseif distToLine > BLOCK_DIST_MAX + BLOCK_DIST_HYSTERESIS then
		self._blockingBall = false
	end

	debug.set("moveDest distToLine", distToLine)

	return moveTime, shortestTimeToBall, closestOpponentRobot, intersectionDefenseArea

end


function Duel:_moveToBall()
	local moveTime, shortestTimeToBall, closestOpponentRobot, intersectionDefenseArea = self:_checkBlockingBall()

	debug.set("oppTime", shortestTimeToBall)
	debug.set("moveTime", moveTime)

	// ignore opponent if we are earlier at the ball by some margin
	if moveTime < shortestTimeToBall - BEFORE_OPPONENT_TIME - BEFORE_OPPONENT_HYSTERESIS then
		self._beforeOpp = true
	elseif moveTime > shortestTimeToBall - BEFORE_OPPONENT_TIME then
		self._beforeOpp = false
	end
	if self._beforeOpp then
		closestOpponentRobot = nil
	end

	// ensure the ball isn't predicted to be behind / inside the opponent
	local minTime = math.min(moveTime, shortestTimeToBall)

	if minTime == math.huge then
		self._futureBall = World.Ball.pos
	end
	local viewDir = (self._futureBall - self._robot.pos):angle()

	local moveDest
	if intersectionDefenseArea then
		// calculate new position between ball (regarding robot shootRadius) and the intersection with defense area
		moveDest = self._futureBall + (intersectionDefenseArea - self._futureBall):setLength(self._robot.shootRadius + World.Ball.radius)
		local defenseIntersectionRadius = self._robot.radius * 3 +  OPPONENT_DEFENSE_AREA_MIN_DISTANCE
		if Field.isInOpponentDefenseArea(moveDest, defenseIntersectionRadius) then
			local opponentDefenseIntersection = Field.intersectRayDefenseArea(moveDest, World.Geometry.FriendlyGoal - moveDest,
													defenseIntersectionRadius, false)
			moveDest = opponentDefenseIntersection or moveDest
		end
		moveDest = UtilDefense.fastestPointInInterval(self._robot, moveDest, intersectionDefenseArea,
						self._oldPosition, BLOCK_POS_PRECISION, BLOCK_POS_ALPHA)
	else
		// case if there isn't an intersection with the defense area
		moveDest = self._futureBall + (self._robot.pos - self._futureBall):setLength(self._robot.shootRadius + World.Ball.radius)
	end

	// remember position for the next iteration
	self._oldPosition = moveDest

	debug.set("moveDest posOnLine", moveDest)

	if self._blockingBall then
		if closestOpponentRobot then
			moveDest = self:_moveToNearBlock(closestOpponentRobot)
		else
			moveDest = self._futureBall + (World.Geometry.FriendlyGoal - self._futureBall):setLength(
				World.Ball.radius + self._robot.shootRadius)
		end
	end

	local ignoreOpponents = World.Ball.pos:distanceTo(self._robot.pos) < World.Ball.radius + 2 * self._robot.radius + 0.1
	local obstacleTable = {
		ignoreBall = self._blockingBall,
		inbox = self._inbox,
		pathRadius = self._robot.shootRadius,
		ignoreOpponentRobots = ignoreOpponents,
		disableOpponentPrediction = true
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	debug.set("moveDest dribbler", moveDest)

	self._robot.trajectory:update(ToTarget, moveDest, viewDir)
	vis.addCircle("t/duel: ClearRobot", self._robot.pos, 0.15, vis.colors.redHalf, true)

	// send the position of the ball
	self._send.attackPosition("all", self._futureBall)
end

return Duel
