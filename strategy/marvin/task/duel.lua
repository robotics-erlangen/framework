local Duel = Class("Task.Duel", require "task/base")

local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local debug = require "../base/debug"
local math = require "../base/math"
local Physics = require "observer/physics"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local Direct = require "trajectory/direct"
local ToTarget = require "trajectory/totarget"
local Field = require "../base/field"

local STAY_BEHIND_OPP_ANGLE = 120/180 * math.pi
local STAY_BEHIND_OPP_HYSTERESIS = 10/180 * math.pi
local SIDEWARDS_ANGLE_MAX = 30/180 * math.pi
local SIDEWARDS_ANGLE_SCALE = 1/3


function Duel:_init()
	self._opposer = nil
	self._blockingBall = false
	self._oldPosition = nil
	self._stayBehindOpp = false
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

-- this function searches for a position between boundaryOne and boundaryTwo to which the robot will take
-- the shortest ammount of time, up to a precission value, using a tenery algorithm
function Duel:_findBestPointToBlockOpponentShot(boundaryOne, boundaryTwo, precission)

	-- time to the boundaries
	local timeToBoundaryOne = Physics.robotTimeToPos(self._robot, boundaryOne, Vector(0, 0), false, false)
	local timeToBoundaryTwo = Physics.robotTimeToPos(self._robot, boundaryTwo, Vector(0, 0), false, false)
	
	-- time diff between the two bounds
	if math.abs(timeToBoundaryOne - timeToBoundaryTwo) < precission then
		return boundaryOne
	end

	-- calculate two new positions on the line
	local leftThird = (boundaryOne * 2 + boundaryTwo) / 3
	local rightThird = (boundaryOne + boundaryTwo * 2) / 3

	-- calculate time to the new positions
	local timeToLeftThird = Physics.robotTimeToPos(self._robot, leftThird, Vector(0, 0), false, false)
	local timeToRightThird = Physics.robotTimeToPos(self._robot, rightThird, Vector(0,0), false, false)

	-- depending on which time is smaller recursively call the function with new boundaries
	if timeToLeftThird < timeToRightThird then
		return self:_findBestPointToBlockOpponentShot(boundaryOne, rightThird, precission)
	else
		return self:_findBestPointToBlockOpponentShot(leftThird, boundaryTwo, precission)
	end
end

-- this method calculates a new position between boundaryOne and boundaryTwo regarding the oldPosition
function Duel:_newPosRegardingOldPosition(boundaryOne, boundaryTwo, precission)
	local oldPos = nil
	
	if self._oldPosition then
		oldPos = self._oldPosition:nearestPosOnLine(boundaryOne, boundaryTwo)
	end
	
	local newPos = self:_findBestPointToBlockOpponentShot(boundaryOne, boundaryTwo, 0.01)
	local  alpha = 0.1
	
	-- don't let the postion jump to much between frames
	if oldPos then
		return newPos * alpha + oldPos * (1-alpha)
	else
		return newPos
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

function Duel:_moveToNearBlock(closestOpponentRobot)
	-- all decisions are made to keep the own goal covered
	local baseDir = (World.Ball.pos - World.Geometry.FriendlyGoal):angle()
	local oppDir = geom.normalizeAngle(closestOpponentRobot.dir - baseDir)

	if math.abs(oppDir) < math.pi - STAY_BEHIND_OPP_ANGLE then
		self._stayBehindOpp = true
	elseif math.abs(oppDir) > math.pi - STAY_BEHIND_OPP_ANGLE + STAY_BEHIND_OPP_HYSTERESIS then
		self._stayBehindOpp = false
	end

	local targetAngle, ballDist
	if self._stayBehindOpp then
		targetAngle = 0
		-- if opponent doesn't exactly look away from our goal, close the gap
		ballDist = self._robot.radius + math.cos(oppDir) * 2*closestOpponentRobot.radius + World.Ball.radius
	else
		local sidewardsAngle = math.min(
			(math.pi - math.abs(oppDir)) * SIDEWARDS_ANGLE_SCALE, SIDEWARDS_ANGLE_MAX)
		targetAngle = sidewardsAngle * (- math.sign(oppDir))
		ballDist = self._robot.radius + World.Ball.radius
	end

	return World.Ball.pos - Vector.fromAngle(baseDir + targetAngle) * ballDist
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

	-- plumb to the ball goal line
	--moveDest = self._robot.pos:nearestPosOnLine(moveBall, World.Geometry.FriendlyGoal)
	
	-- pos before the defense area; the possibility of crashing into centerbacks was considered 
	-- but disregarded because blocking a shot on the goal is more important,
	-- and the probabilty of it being the final position is small
	local intersectionDefenseArea = Field.intersectRayDefenseArea(World.Ball.pos, (World.Geometry.FriendlyGoal-World.Ball.pos):copy():normalize(), self._robot.radius + 0.04, false, false)

	local moveDest = nil

	if intersectionDefenseArea then
		-- calculate new position between ball (regarding robot shootRadius) and the intersection with defence area
		moveDest = self:_newPosRegardingOldPosition(World.Ball.pos + ((intersectionDefenseArea - World.Ball.pos):setLength(self._robot.shootRadius + World.Ball.radius)), intersectionDefenseArea, 0.01)
	else
		-- case for there not being an intersection with defence area
		moveDest = World.Ball.pos + (self._robot.pos-World.Ball.pos):setLength(self._robot.shootRadius + World.Ball.radius)
	end

	-- remember position for the next calculation
	self._oldPosition = moveDest

	local distToLine = moveDest:distanceTo(self._robot.pos)
	if distToLine <= DIFF then
		self._blockingBall = true
	elseif distToLine > DIFF + 0.02 then
		self._blockingBall = false
	end

	debug.set("moveDest posOnLine", moveDest)

	if self._blockingBall then
		if closestOpponentRobot then
			moveDest = self:_moveToNearBlock(closestOpponentRobot)
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
