let ForceShoot = require "task/ability/forceshoot"
let HallucinatingKeeper = Class("Task.HallucinatingKeeper", require "task/base", ForceShoot)

let debug = require "../base/debug"
let Field = require "../base/field"
let geom = require "../base/geom"
let vis = require "../base/vis"
let World = require "../base/world"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let IO = require "util/io"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"


let G = World.Geometry
let KEEPER_GOAL_DISTANCE = 0.06
let GOAL_NORMAL = Vector(0, 1)

function HallucinatingKeeper:_init (filename) {
	self._defendCorner = false
	self._ballData = IO.readLines(filename)
	self._ball = World.Ball
	self._line = 1
	self._hit = nil
	self._predictShot = {
		atkPos = nil,
		atkDir = nil,
		isShot = false
	}
}

function HallucinatingKeeper:_update () {
	let ballDataString = self._ballData[self._line]

	if (ballDataString:sub(1, 8) == "New Shot") {
		log(ballDataString)
		self._hit = nil
		self._line = (self._line % #self._ballData) + 1
		return self:_update()
	}

	let curBallData = {}
	for (data in ballDataString:gmatch("%S+")) {
		table.insert(curBallData, data)
	}

	debug.set("curBallData", curBallData)
	let relPosX = tonumber(curBallData[1])
	let relPosY = tonumber(curBallData[2])
	let speedX = tonumber(curBallData[3])
	let speedY = tonumber(curBallData[4])

	self._ball = {
		radius = World.Ball.radius,
		maxSpeed = World.Ball.maxSpeed,
		pos = G.FriendlyGoal + Vector(relPosX, relPosY),
		posZ = 0,
		speed = Vector(speedX, speedY),
		speedZ = 0
	}
	vis.addCircle("test/move/keepertest: Imaginary Ball", self._ball.pos, World.Ball.radius, vis.colors.orange, true)

	let atkPosX = tonumber(curBallData[5])
	let atkPosY = tonumber(curBallData[6])
	let atkDirX = tonumber(curBallData[7])
	let atkDirY = tonumber(curBallData[8])
	let isShot = curBallData[9] == "true"

	self._predictShot = {
		atkPos = Vector(atkPosX, atkPosY),
		atkDir = Vector(atkDirX, atkDirY),
		isShot = isShot
	}

	if (not self._hit  &&  self._ball.pos:distanceTo(self._robot.pos) < self._ball.radius+self._robot.radius) {
		self._hit = (self._ball.pos-self._robot.pos):angle() - self._robot.dir
	} else if (self._hit) {
		vis.addCircle("test/move/keepertest: Hit", self._robot.pos + Vector.fromAngle(self._hit+self._robot.dir):setLength(self._robot.radius), 0.015, vis.colors.red, true)
	}

	self._line = (self._line % #self._ballData) + 1
}

//moves keeper do defending possition
function HallucinatingKeeper:run () {
	self:_update()

	let atkPos, atkDir, isShot = self._predictShot.atkPos, self._predictShot.atkDir, self._predictShot.isShot
	atkDir = atkDir:copy():setLength(30)
	let side = math.sign(atkPos.x)

	// check if opponent would shoot at the goal from somewhere near the field corners
	// how far the ball is off to the sides
	// use hysteresis to prevent flickering between positions
	let sideAngle = GOAL_NORMAL:absoluteAngleDiff(atkPos - G.FriendlyGoal)
	if (sideAngle > 45/180*math.pi) {
		self._defendCorner = true
	} else if (sideAngle < 30/180*math.pi) {
		self._defendCorner = false
	}

	// keep the goalie inside the goal to exploit its full diameter for blocking incoming balls
	let goalWidthHalf = 1/2

	// line to move along for defending
	let defenseLineStart, defenseLineEnd, fallbackPos
	// corners should be defended and atkPos is outside the goal
	if (self._defendCorner  &&  (math.abs(atkPos.x) > goalWidthHalf
			 ||  atkPos.y < G.FriendlyGoal.y - G.GoalDepth)) {
		debug.set("mode", "defend corner")
		// defend short corner
		// line starts a goal post, stay as near to the goal as possible
		defenseLineStart = Vector(side*goalWidthHalf, G.FriendlyGoal.y)
		let lineDir = ((Vector(0, defenseLineStart.y) - atkPos):perpendicular() * side):normalize()
		if (side*lineDir.x > 0) {
			lineDir = Vector(0, 1)
		}
		// move startpoint out of the goal along the direction
		defenseLineStart = defenseLineStart + lineDir * (self._robot.radius + 0.005)

		// opposite corner
		let otherGoalPost = Vector(-side*goalWidthHalf, G.FriendlyGoal.y)
		// position where the robot would block the otherGoalPost
		// lambdaLine is distance from defenseLineStart in direction of lineDir
		let _, lambdaLine = geom.intersectLineLine(defenseLineStart, lineDir,
				otherGoalPost, atkPos - otherGoalPost)

		// allow moving behind ball when it's shot
		lambdaLine = lambdaLine  ||  0
		if (not isShot) {
			lambdaLine = lambdaLine - self._robot.radius
		}
		defenseLineEnd = defenseLineStart + lineDir * math.max(0, lambdaLine)

		// stick to goal post as fallback
		fallbackPos = defenseLineStart
	} else {
		debug.set("mode", "defend line")
		// defend along the goal line and occupy as much space in the goal as possible
		// idea: cut defense line with line from goal posts to ball (attack pos)
		// account for robot radius
		let goalCornerLeft = Vector(-goalWidthHalf, G.FriendlyGoal.y)
		let goalCornerRight = Vector(goalWidthHalf, G.FriendlyGoal.y)
		let goalLineY = G.FriendlyGoal.y + KEEPER_GOAL_DISTANCE + self._robot.radius
		let lineDist = math.abs(goalLineY - goalCornerLeft.y)

		let leftBound = -goalWidthHalf
		let angleLeft = GOAL_NORMAL:angleDiff(atkPos - goalCornerLeft)
		if (math.abs(angleLeft) < math.pi / 2) {
			// distance cutoff by angle to atkPos + distance blocked by robot radius
			// ignore robot radius when isShot is set, in order to allow the robot to get behind the ball
			let leftDist = -math.tan(angleLeft) * lineDist + (isShot ? 0 : self._robot.radius / math.cos(angleLeft))
			leftBound = leftBound + math.max(0, leftDist)
		}

		let rightBound = goalWidthHalf
		let angleRight = GOAL_NORMAL:angleDiff(atkPos - goalCornerRight)
		if (math.abs(angleRight) < math.pi / 2) {
			let rightDist = -math.tan(angleRight) * lineDist - (isShot ? 0 : self._robot.radius / math.cos(angleRight))
			rightBound = rightBound + math.min(0, rightDist)
		}

		defenseLineStart = Vector(leftBound, goalLineY)
		defenseLineEnd = Vector(rightBound, goalLineY)
		// center
		fallbackPos = (defenseLineEnd + defenseLineStart) * 0.5
	}

	// intersect defense line with ball trajectory
	let defenseDir = defenseLineEnd - defenseLineStart
	let _, lambdaDef = geom.intersectLineLine(defenseLineStart, defenseDir,
			atkPos, atkDir)
	let intersectPos
	let successfulIntersection // is original intersection point on the defense line
	if (lambdaDef) {
		debug.set("lambdaDef", lambdaDef)
		let lambdaBounded = math.bound(0, lambdaDef, 1)
		successfulIntersection = (lambdaDef == lambdaBounded)
		if (lambdaDef == lambdaBounded
				// add some safety cm to detect shots towards the goal posts even without precise ball direction
				 ||  defenseDir:length() >= 0.01  &&  math.abs(lambdaDef - lambdaBounded) < 0.05 / defenseDir:length()) {
			successfulIntersection = true
		}
		// limit to positions on the line segment!
		intersectPos = defenseLineStart + defenseDir * lambdaBounded
	} else {
		successfulIntersection = false
		// ensure there's an intersect pos
		intersectPos = fallbackPos
	}

	vis.addPath("t/keeper: KeeperShotPrediction",{atkPos,atkPos+atkDir}, vis.colors.green)
	vis.addCircle("t/keeper: KeeperDefenseLineIntersect", intersectPos, 0.03, vis.colors.green)
	vis.addPath("t/keeper: KeeperDefenseLine",{defenseLineStart, defenseLineEnd}, vis.colors.green)

	let moveTo
	let endSpeed
	// ball is shot at the goal: take the shortest way to stop the ball
	if (isShot  &&  atkDir.y < 0  &&  successfulIntersection  &&
			Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius)) {
		// nearest pos on the ball trajectory
		moveTo = self._robot.pos:nearestPosOnLine(atkPos, atkPos+atkDir)
		// prevent moving into the goal
		if (moveTo.y < defenseLineStart.y) {
			moveTo = intersectPos
		}

		//get to position as fast as possible
		let ballRollDistance = math.max(0, moveTo:distanceTo(self._ball.pos)-self._ball.radius-self._robot.shootRadius)
		let availableTime = Physics.ballRollTime(self._ball, ballRollDistance)
		// use moveTo position to be there as fast as possible
		endSpeed = Physics.robotMinEndspeed(self._robot, moveTo, availableTime)

		debug.set("endSpeed", endSpeed)

	// block estimated shoot line
	} else if (atkDir.y < 0) {
		let k = math.bound(0, (atkPos.y+2)/2 * 0.6, 0.5)
		moveTo = intersectPos * (1-k) + Vector(0, -G.FieldHeightHalf + KEEPER_GOAL_DISTANCE + self._robot.radius) * k
	} else {// don't know where to go, just center in the goal / corner
		moveTo = fallbackPos
	}

	// ignore goal walls if ball is shot
	let obstacleTable = {
		ignoreBall = true,
		ignoreGoals = isShot,
		ignoreDefenseArea = true,
		stopBallDistance = 0.05,
		ignorePass = true
	}
	// don't add obstacles if inside keeper area, when drivin to goal initially
	if (Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius)) {
		obstacleTable.ignoreFriendlyRobots = true
		obstacleTable.ignoreOpponentRobots = true
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, moveTo, (atkPos - moveTo):angle(), nil, endSpeed)

	if (not Robot.hadBall(self._robot, 0)) {
		self._forceShootTimer = nil
	}
	let chipActivationAngle = math.pi / 6
	let ballToRobot = self._robot.pos - self._ball.pos
	if ((World.RefereeState == "Game"  ||  World.RefereeState == "GameForce")  &&
			self._ball.speed:absoluteAngleDiff(ballToRobot) < chipActivationAngle
			 &&  self._ball.pos:distanceTo(self._robot.pos) < 1) {
		debug.set("chip", true)
		self._robot:chip(3)
		self:_doForceShoot()
	}
}

return HallucinatingKeeper
