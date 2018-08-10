let Duel = Class("Task.Duel", require "task/base")

let debug = require "../base/debug"
let Field = require "../base/field"
let geom = require "../base/geom"
let math = require "../base/math"
let vis = require "../base/vis"
let World = require "../base/world"
let Ball = require "observer/ball"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let Direct = require "trajectory/direct"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let UtilDefense = require "util/defense"


let STAY_BEHIND_OPP_ANGLE = 120/180 * math.pi
let STAY_BEHIND_OPP_HYSTERESIS = 10/180 * math.pi
let SIDEWARDS_ANGLE_MAX = 30/180 * math.pi
let SIDEWARDS_ANGLE_SCALE = 1/3

let BLOCK_DIST_MAX = 0.08
let BLOCK_DIST_HYSTERESIS = 0.02

let BLOCK_POS_ALPHA = 0.1
let BLOCK_POS_PRECISION = 0.01

let DEFENSE_AREA_MIN_DISTANCE = 0.04

let BEFORE_OPPONENT_HYSTERESIS = 0.2
let BEFORE_OPPONENT_TIME = 0.3

let OPPONENT_DEFENSE_AREA_MIN_DISTANCE = 0.1


function Duel:_init () {
	self._opposer = nil
	self._defendedOpponentMessageSent = false
	self._blockingBall = false
	self._oldPosition = nil
	self._stayBehindOpp = false
	self._beforeOpp = false
	self._futureBall = nil
	self._rotating = false
}

function Duel:run () {
	// search for the best duel target (can be nil!)
	// 1. get the opponent ball owner, if possible
	// 2. get the opponent, that reaches the ball first inside the field boundaries
	self._opposer = Ball.opponentBallOwner()
	if (not self._opposer) {
		self._opposer = Ball.firstRobotAtBall(World.OpponentRobots)
	}

	// notify all that we are duelling
	let distToOpp = self._opposer ? self._robot.pos:distanceTo(self._opposer.pos) : math.huge
	self._defendedOpponentMessageSent = distToOpp < (self._defendedOpponentMessageSent ? 0.6 : 0.3)
	if (self._defendedOpponentMessageSent) {
		self._send.defendedOpponent("all", self._opposer)
	}


	if (self._opposer  &&  self._blockingBall  &&  Robot.hadBall(self._robot, 0)) {
		self:_contest()
		debug.set("duel-state", "contest")
	} else {
		self:_moveToBall()
		debug.set("duel-state", "move to ball")
	}
}

function Duel:_contestRotate () {
	//decide if we should rotate cw or ccw
	let toOpponentDir = self._opposer.pos - self._robot.pos
	let intersection = geom.intersectLineLine(
			self._robot.pos, toOpponentDir, World.Geometry.FriendlyGoal, Vector(1, 0))
	let ccw = intersection ? -math.sign(intersection.x) : -1 //negative = ccw, positive = cw
	let toBall = World.Ball.speed + (World.Ball.pos - self._robot.pos):setLength(0.4)
	self._robot:setDribblerSpeed(0.8)
	self._robot.trajectory:update(Direct, toBall, nil, ccw * 2*math.pi) // 1 turn per second
}

function Duel:_contestPush () {
	let viewDir = (World.Ball.pos - World.Geometry.FriendlyGoal):angle()
	let destinationPos = World.Ball.pos - Vector.fromAngle(viewDir) * self._robot.shootRadius
	let obstacleTable = {
		ignoreBall = true,
		inbox = self._inbox,
		ignoreOpponentRobots = true
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, destinationPos, viewDir)
}

function Duel:_contest () {
	self._rotating = self._rotating  &&  World.Ball.pos.y > -World.Geometry.FieldHeightHalf / 3
		 ||  World.Ball.pos.y > -World.Geometry.FieldHeightHalf / 6

	if (self._rotating) {
		self:_contestRotate()
	} else {
		self:_contestPush()
	}

	if (self._robot.dir > 0  &&  self._robot.dir < math.pi  &&  World.Ball.pos.y > 0.2
			 &&  not Robot.hadBall(self._opposer, 0)) {
		self._robot:shoot(7.5)
	}

	// send the position of the ball
	self._send.attackPosition("all", World.Ball.pos)
	self:_checkBlockingBall()
}

function Duel:_moveToNearBlock (closestOpponentRobot) {
	// all decisions are made to keep the own goal covered
	let baseDir = (self._futureBall - World.Geometry.FriendlyGoal):angle()
	let oppViewDir = (self._futureBall - closestOpponentRobot.pos):angle()
	let oppDir = geom.normalizeAngle(oppViewDir - baseDir)

	if (math.abs(oppDir) < math.pi - STAY_BEHIND_OPP_ANGLE) {
		self._stayBehindOpp = true
	} else if (math.abs(oppDir) > math.pi - STAY_BEHIND_OPP_ANGLE + STAY_BEHIND_OPP_HYSTERESIS) {
		self._stayBehindOpp = false
	}

	let targetAngle, ballDist
	if (self._stayBehindOpp) {
		targetAngle = 0
		// if opponent doesn't exactly look away from our goal, close the gap
		ballDist = self._robot.radius + math.cos(oppDir) * 2*closestOpponentRobot.radius + World.Ball.radius
	} else {
		let sidewardsAngle = math.min(
			(math.pi - math.abs(oppDir)) * SIDEWARDS_ANGLE_SCALE, SIDEWARDS_ANGLE_MAX)
		targetAngle = sidewardsAngle * (- math.sign(oppDir))
		ballDist = self._robot.radius + World.Ball.radius
	}

	return self._futureBall - Vector.fromAngle(baseDir + targetAngle) * ballDist
}

function Duel:_checkBlockingBall () {
	let closestOpponentRobot, shortestTimeToBall = Ball.firstRobotAtBall(World.OpponentRobots)

	let moveTime = Robot.minTimeToBall(self._robot)
	let minTime = math.min(moveTime, shortestTimeToBall)
	self._futureBall = Physics.ballAtTime(World.Ball, minTime).pos
	vis.addCircle("t/duel: future ball", self._futureBall, World.Ball.radius + 0.01, vis.colors.green)

	// pos before the defense area; the possibility of crashing into centerbacks was considered
	// but disregarded because blocking a shot on the goal is more important,
	// and the probabilty of it being the final position is small
	let intersectionDefenseArea = Field.intersectRayDefenseArea(self._futureBall,
			World.Geometry.FriendlyGoal - self._futureBall,
			self._robot.radius + DEFENSE_AREA_MIN_DISTANCE, true)
	let basePos

	if (intersectionDefenseArea) {
		basePos = intersectionDefenseArea
	} else {
		basePos = self._robot.pos
	}

	let distToLine = self._robot.pos:distanceToLineSegment(basePos, self._futureBall)
	if (distToLine <= BLOCK_DIST_MAX) {
		self._blockingBall = true
	} else if (distToLine > BLOCK_DIST_MAX + BLOCK_DIST_HYSTERESIS) {
		self._blockingBall = false
	}

	debug.set("moveDest distToLine", distToLine)

	return moveTime, shortestTimeToBall, closestOpponentRobot, intersectionDefenseArea

}


function Duel:_moveToBall () {
	let moveTime, shortestTimeToBall, closestOpponentRobot, intersectionDefenseArea = self:_checkBlockingBall()

	debug.set("oppTime", shortestTimeToBall)
	debug.set("moveTime", moveTime)

	// ignore opponent if we are earlier at the ball by some margin
	if (moveTime < shortestTimeToBall - BEFORE_OPPONENT_TIME - BEFORE_OPPONENT_HYSTERESIS) {
		self._beforeOpp = true
	} else if (moveTime > shortestTimeToBall - BEFORE_OPPONENT_TIME) {
		self._beforeOpp = false
	}
	if (self._beforeOpp) {
		closestOpponentRobot = nil
	}

	// ensure the ball isn't predicted to be behind / inside the opponent
	let minTime = math.min(moveTime, shortestTimeToBall)

	if (minTime == math.huge) {
		self._futureBall = World.Ball.pos
	}
	let viewDir = (self._futureBall - self._robot.pos):angle()

	let moveDest
	if (intersectionDefenseArea) {
		// calculate new position between ball (regarding robot shootRadius) and the intersection with defense area
		moveDest = self._futureBall + (intersectionDefenseArea - self._futureBall):setLength(self._robot.shootRadius + World.Ball.radius)
		let defenseIntersectionRadius = self._robot.radius * 3 +  OPPONENT_DEFENSE_AREA_MIN_DISTANCE
		if (Field.isInOpponentDefenseArea(moveDest, defenseIntersectionRadius)) {
			let opponentDefenseIntersection = Field.intersectRayDefenseArea(moveDest, World.Geometry.FriendlyGoal - moveDest,
													defenseIntersectionRadius, false)
			moveDest = opponentDefenseIntersection  ||  moveDest
		}
		moveDest = UtilDefense.fastestPointInInterval(self._robot, moveDest, intersectionDefenseArea,
						self._oldPosition, BLOCK_POS_PRECISION, BLOCK_POS_ALPHA)
	} else {
		// case if there isn't an intersection with the defense area
		moveDest = self._futureBall + (self._robot.pos - self._futureBall):setLength(self._robot.shootRadius + World.Ball.radius)
	}

	// remember position for the next iteration
	self._oldPosition = moveDest

	debug.set("moveDest posOnLine", moveDest)

	if (self._blockingBall) {
		if (closestOpponentRobot) {
			moveDest = self:_moveToNearBlock(closestOpponentRobot)
		} else {
			moveDest = self._futureBall + (World.Geometry.FriendlyGoal - self._futureBall):setLength(
				World.Ball.radius + self._robot.shootRadius)
		}
	}

	let ignoreOpponents = World.Ball.pos:distanceTo(self._robot.pos) < World.Ball.radius + 2 * self._robot.radius + 0.1
	let obstacleTable = {
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
}

return Duel
