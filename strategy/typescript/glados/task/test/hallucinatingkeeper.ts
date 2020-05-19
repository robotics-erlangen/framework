let ForceShoot = require "task/ability/forceshoot"
let HallucinatingKeeper = Class("Task.HallucinatingKeeper", require "task/base", ForceShoot)

import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as vis from "base/vis";
import * as World from "base/world";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
let IO = require "util/io"
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


let G = World.Geometry
let KEEPER_GOAL_DISTANCE = 0.06
let GOAL_NORMAL = new Vector(0, 1)

function HallucinatingKeeper:_init (filename) {
	this._defendCorner = false
	this._ballData = IO.readLines(filename)
	this._ball = World.Ball
	this._line = 1
	this._hit = nil
	this._predictShot = {
		atkPos = undefined,
		atkDir = undefined,
		isShot = false
	}
}

function HallucinatingKeeper:_update () {
	let ballDataString = this._ballData[this._line]

	if (ballDataString:sub(1, 8) == "New Shot") {
		log(ballDataString)
		this._hit = nil
		this._line = (this._line % #this._ballData) + 1
		return this._update()
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

	this._ball = {
		radius = World.Ball.radius,
		maxSpeed = World.Ball.maxSpeed,
		pos = G.FriendlyGoal + new Vector(relPosX, relPosY),
		posZ = 0,
		speed = new Vector(speedX, speedY),
		speedZ = 0
	}
	vis.addCircle("test/move/keepertest: Imaginary Ball", this._ball.pos, World.Ball.radius, vis.colors.orange, true)

	let atkPosX = tonumber(curBallData[5])
	let atkPosY = tonumber(curBallData[6])
	let atkDirX = tonumber(curBallData[7])
	let atkDirY = tonumber(curBallData[8])
	let isShot = curBallData[9] == "true"

	this._predictShot = {
		atkPos = new Vector(atkPosX, atkPosY),
		atkDir = new Vector(atkDirX, atkDirY),
		isShot = isShot
	}

	if (not this._hit && this._ball.pos.distanceTo(this._robot.pos) < this._ball.radius+this._robot.radius) {
		this._hit = (this._ball.pos-this._robot.pos).angle() - this._robot.dir
	} else if (this._hit) {
		vis.addCircle("test/move/keepertest: Hit", this._robot.pos + Vector.fromAngle(this._hit+this._robot.dir).withLength(this._robot.radius), 0.015, vis.colors.red, true)
	}

	this._line = (this._line % #this._ballData) + 1
}

//moves keeper do defending possition
function HallucinatingKeeper:run () {
	this._update()

	let atkPos, atkDir, isShot = this._predictShot.atkPos, this._predictShot.atkDir, this._predictShot.isShot
	atkDir = atkDir.withLength(30)
	let side = MathUtil.sign(atkPos.x)

	// check if opponent would shoot at the goal from somewhere near the field corners
	// how far the ball is off to the sides
	// use hysteresis to prevent flickering between positions
	let sideAngle = GOAL_NORMAL.absoluteAngleDiff(atkPos - G.FriendlyGoal)
	if (sideAngle > 45/180*Math.PI) {
		this._defendCorner = true
	} else if (sideAngle < 30/180*Math.PI) {
		this._defendCorner = false
	}

	// keep the goalie inside the goal to exploit its full diameter for blocking incoming balls
	let goalWidthHalf = 1/2

	// line to move along for defending
	let defenseLineStart, defenseLineEnd, fallbackPos
	// corners should be defended and atkPos is outside the goal
	if (this._defendCorner && (Math.abs(atkPos.x) > goalWidthHalf
			 ||  atkPos.y < G.FriendlyGoal.y - G.GoalDepth)) {
		debug.set("mode", "defend corner")
		// defend short corner
		// line starts a goal post, stay as near to the goal as possible
		defenseLineStart = new Vector(side*goalWidthHalf, G.FriendlyGoal.y)
		let lineDir = ((new Vector(0, defenseLineStart.y) - atkPos).perpendicular() * side).normalized()
		if (side*lineDir.x > 0) {
			lineDir = new Vector(0, 1)
		}
		// move startpoint out of the goal along the direction
		defenseLineStart = defenseLineStart + lineDir * (this._robot.radius + 0.005)

		// opposite corner
		let otherGoalPost = new Vector(-side*goalWidthHalf, G.FriendlyGoal.y)
		// position where the robot would block the otherGoalPost
		// lambdaLine is distance from defenseLineStart in direction of lineDir
		let _, lambdaLine = geom.intersectLineLine(defenseLineStart, lineDir,
				otherGoalPost, atkPos - otherGoalPost)

		// allow moving behind ball when it's shot
		lambdaLine = lambdaLine || 0
		if (not isShot) {
			lambdaLine = lambdaLine - this._robot.radius
		}
		defenseLineEnd = defenseLineStart + lineDir * Math.max(0, lambdaLine)

		// stick to goal post as fallback
		fallbackPos = defenseLineStart
	} else {
		debug.set("mode", "defend line")
		// defend along the goal line and occupy as much space in the goal as possible
		// idea: cut defense line with line from goal posts to ball (attack pos)
		// account for robot radius
		let goalCornerLeft = new Vector(-goalWidthHalf, G.FriendlyGoal.y)
		let goalCornerRight = new Vector(goalWidthHalf, G.FriendlyGoal.y)
		let goalLineY = G.FriendlyGoal.y + KEEPER_GOAL_DISTANCE + this._robot.radius
		let lineDist = Math.abs(goalLineY - goalCornerLeft.y)

		let leftBound = -goalWidthHalf
		let angleLeft = GOAL_NORMAL.angleDiff(atkPos - goalCornerLeft)
		if (Math.abs(angleLeft) < Math.PI / 2) {
			// distance cutoff by angle to atkPos + distance blocked by robot radius
			// ignore robot radius when isShot is set, in order to allow the robot to get behind the ball
			let leftDist = -Math.tan(angleLeft) * lineDist + (isShot ? 0 : this._robot.radius / Math.cos(angleLeft))
			leftBound = leftBound + Math.max(0, leftDist)
		}

		let rightBound = goalWidthHalf
		let angleRight = GOAL_NORMAL.angleDiff(atkPos - goalCornerRight)
		if (Math.abs(angleRight) < Math.PI / 2) {
			let rightDist = -Math.tan(angleRight) * lineDist - (isShot ? 0 : this._robot.radius / Math.cos(angleRight))
			rightBound = rightBound + Math.min(0, rightDist)
		}

		defenseLineStart = new Vector(leftBound, goalLineY)
		defenseLineEnd = new Vector(rightBound, goalLineY)
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
		let lambdaBounded = MathUtil.bound(0, lambdaDef, 1)
		successfulIntersection = (lambdaDef == lambdaBounded)
		if (lambdaDef == lambdaBounded
				// add some safety cm to detect shots towards the goal posts even without precise ball direction
				 ||  defenseDir.length() >= 0.01 && Math.abs(lambdaDef - lambdaBounded) < 0.05 / defenseDir.length()) {
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
	if (isShot && atkDir.y < 0 && successfulIntersection  &&
			Field.isInFriendlyDefenseArea(this._robot.pos, this._robot.radius)) {
		// nearest pos on the ball trajectory
		moveTo = this._robot.pos.nearestPosOnLine(atkPos, atkPos+atkDir)
		// prevent moving into the goal
		if (moveTo.y < defenseLineStart.y) {
			moveTo = intersectPos
		}

		//get to position as fast as possible
		let ballRollDistance = Math.max(0, moveTo.distanceTo(this._ball.pos)-this._ball.radius-this._robot.shootRadius)
		let availableTime = Physics.ballRollTime(this._ball, ballRollDistance)
		// use moveTo position to be there as fast as possible
		endSpeed = Physics.robotMinEndspeed(this._robot, moveTo, availableTime)

		debug.set("endSpeed", endSpeed)

	// block estimated shoot line
	} else if (atkDir.y < 0) {
		let k = MathUtil.bound(0, (atkPos.y+2)/2 * 0.6, 0.5)
		moveTo = intersectPos * (1-k) + new Vector(0, -G.FieldHeightHalf + KEEPER_GOAL_DISTANCE + this._robot.radius) * k
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
	if (Field.isInFriendlyDefenseArea(this._robot.pos, this._robot.radius)) {
		obstacleTable.ignoreFriendlyRobots = true
		obstacleTable.ignoreOpponentRobots = true
	}
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	this._robot.trajectory.update(ToTarget, moveTo, (atkPos - moveTo).angle(), undefined, endSpeed)

	if (not Robot.hadBall(this._robot, 0)) {
		this._forceShootTimer = nil
	}
	let chipActivationAngle = Math.PI / 6
	let ballToRobot = this._robot.pos - this._ball.pos
	if ((World.RefereeState == "Game" || World.RefereeState == "GameForce")  &&
			this._ball.speed.absoluteAngleDiff(ballToRobot) < chipActivationAngle
			 &&  this._ball.pos.distanceTo(this._robot.pos) < 1) {
		debug.set("chip", true)
		this._robot.chip(3)
		this._doForceShoot()
	}
}

return HallucinatingKeeper
