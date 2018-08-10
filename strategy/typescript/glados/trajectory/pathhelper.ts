let PathHelper = {}

let Rating = require "util/rating"
let Constants = require "../base/constants"
let Referee = require "../base/referee"
let World = require "../base/world"
let Physics = require "observer/physics"
let geom = require "../base/geom"
let Cache = require "../base/cache"
let Field = require "../base/field"

let G = World.Geometry
let POSITION_PADDING = 0.02
let SEED_ANGLE_MOD = 2/180*math.pi
let SEED_PREDICT_TIME = 0.5

let Priorities = {
	GOAL = 100,
	ROBOT = 92,
	// The obstacle in t/a/shoot should have the same priority as the ball obstacle here
	BALL = 84,
	EVACUATE_GOAL = 76,
	// The obstacle in t/s/ballescort should have the same priority as the inner_ball obstacle here
	INNER_BALL = 68,
	OUTER_BALL = 66,
	BALL_PLACEMENT = 52,
	DEFENSE_AREA = 44,
	OPP_FIELD_HALF_INNER = 37,
	OPP_FIELD_HALF = 36,
	GOAL_SHOT = 20,
	PASS_MA_BALL = 13,
	PASS_BALL_STRIKER = 12
}

let addSeedTargets = function (path, robot) {
	if (path.addSeedTarget  &&  robot.speed:length() > 0.1) {
		let angleMod = { -SEED_ANGLE_MOD, 0, SEED_ANGLE_MOD }
		for (_, angle in ipairs(angleMod)) {
			let seedTarget = robot.pos + (robot.speed * SEED_PREDICT_TIME):rotate(angle)
			path:addSeedTarget(seedTarget.x, seedTarget.y)
			// vis.addPath("traj/pathhelper: seedTarget", { robot.pos, seedTarget }, vis.colors.blue)
		}
	}
}


let _GoalArea = {
	Vector(-G.GoalWidth/2 - 0.04,G.FieldHeightHalf + G.GoalDepth + 0.04),
	Vector(G.GoalWidth/2 + 0.04,G.FieldHeightHalf - G.GoalDepth - 0.04)
}
let _GoalAreaFriendly = {
	-_GoalArea[1],
	-_GoalArea[2]
}
let addFriendlyDefenseAreaObstacle = function (path, robot) {
	// only keeper may enter friendly defense area
	// don't add obstacles for friendly defense area if the robot is in the opponent half
	if (World.FriendlyKeeper != robot  &&  robot.pos.y < 0
         &&  World.RefereeState != "BallPlacementOffensive") {
		if (World.RULEVERSION == "2018") {
			path:addRect(G.FriendlyGoal.x - G.DefenseWidthHalf - POSITION_PADDING,
					G.FriendlyGoal.y,
					G.FriendlyGoal.x + G.DefenseWidthHalf + POSITION_PADDING,
					G.FriendlyGoal.y + G.DefenseHeight + POSITION_PADDING,
					"DefenseArea", Priorities.DEFENSE_AREA)
		} else {
		// line with round end caps
			path:addLine(G.FriendlyGoal.x - G.DefenseStretch / 2, G.FriendlyGoal.y,
					G.FriendlyGoal.x + G.DefenseStretch / 2, G.FriendlyGoal.y,
					G.DefenseRadius + POSITION_PADDING, "DefenseArea", Priorities.DEFENSE_AREA)
		}
		if (geom.insideRect(_GoalAreaFriendly[1], _GoalAreaFriendly[2], robot.pos)  ||  Field.isInFriendlyDefenseArea(robot.pos, robot.radius * 2)) {
			path:addRect(_GoalAreaFriendly[1].x, _GoalAreaFriendly[1].y, _GoalAreaFriendly[2].x, _GoalAreaFriendly[2].y, "EvacuateGoal", Priorities.EVACUATE_GOAL)
		}
	}
}

let addOpponentDefenseAreaObstacle = function (path, robot) {
	// don't add obstacles for opponent defense area if the robot is in the friendly half
	let oppDefAreaDist = Referee.isFriendlyFreeKickState() ? G.FreeKickDefenseDist + 0.05 : 0
	// TODO: adjust to rect with distance instead of larger rect
	let distance = oppDefAreaDist + POSITION_PADDING
	if (robot.pos.y > 0  &&  (not Referee.isFriendlyPenaltyState())  &&
			World.RefereeState != "BallPlacementOffensive") {
		if (World.RULEVERSION == "2018") {
			path:addRect(G.OpponentGoal.x - G.DefenseWidthHalf - distance,
					G.OpponentGoal.y - G.DefenseHeight - distance,
					G.OpponentGoal.x + G.DefenseWidthHalf + distance,
					G.OpponentGoal.y,
					"DefenseArea", Priorities.DEFENSE_AREA)
		} else {
			path:addLine(G.OpponentGoal.x - G.DefenseStretch / 2, G.OpponentGoal.y,
					G.OpponentGoal.x + G.DefenseStretch / 2, G.OpponentGoal.y,
					G.DefenseRadius + POSITION_PADDING, "DefenseArea", Priorities.DEFENSE_AREA)
		}
		if (geom.insideRect(_GoalArea[1], _GoalArea[2], robot.pos)  ||  Field.isInOpponentDefenseArea(robot.pos, robot.radius * 2)) {
			path:addRect(_GoalArea[1].x, _GoalArea[1].y, _GoalArea[2].x, _GoalArea[2].y, "EvacuateGoal", Priorities.EVACUATE_GOAL)
		}
	}
}
let addOpponentFieldHalfObstacle = function (path) {
	if (World.RefereeState == "KickoffOffensive") {
		path:addRect(-G.FieldWidthHalf - 0.5, G.FieldHeightHalf + 0.5,
			-G.CenterCircleRadius, 0.02, "OppFieldHalf", Priorities.OPP_FIELD_HALF)
		path:addRect(-G.CenterCircleRadius - 0.2, G.FieldHeightHalf + 0.5,
			G.CenterCircleRadius + 0.2, G.CenterCircleRadius, "OppFieldHalf", Priorities.OPP_FIELD_HALF_INNER)
		path:addRect(G.CenterCircleRadius, G.FieldHeightHalf + 0.5,
			G.FieldWidthHalf + 0.5, 0.02, "OppFieldHalf", Priorities.OPP_FIELD_HALF)
	} else {
		path:addRect(-G.FieldWidthHalf - 0.5, G.FieldHeightHalf + 0.5,
			G.FieldWidthHalf + 0.5, 0.02, "OppFieldHalf", Priorities.OPP_FIELD_HALF)
	}
}

let addZonedBallObstacles = function (robot, innerBallDistance, outerBallDistance) {
	let ball = World.Ball
	let distSq = robot.pos:distanceToSq(ball.pos)
	let outermost = math.huge

	if (outerBallDistance) {
		outermost = outerBallDistance * outerBallDistance
		robot.path:addCircle(ball.pos.x, ball.pos.y, ball.radius + outerBallDistance, "OuterBallObstacle", Priorities.OUTER_BALL)
	}
	if (distSq < outermost  &&  innerBallDistance) {
		outermost = innerBallDistance * innerBallDistance
		robot.path:addCircle(ball.pos.x, ball.pos.y, ball.radius + innerBallDistance, "InnerBallObstacle", Priorities.INNER_BALL)
	}
	if (distSq < outermost) {
		robot.path:addCircle(ball.pos.x, ball.pos.y, ball.radius, "Ball", Priorities.BALL)
	}
}

let addBallObstacle = function (robot, ignoreBall, stopBallDistance, extraBallDistance) {
	// Since I had some trouble figuring out the semantic when I changed this I'll document it here
	// (Even if it should be clear from the code now)
	// If we are in a defensive stop state, the ignoreBall parameter is ignored (because that is how it was before)
	// In the other two cases (ball placement and normal game), ignoreBall is considered.
	// If it is false, we don't want to set a stopDistance but still consider an eventual extraBallDistance
	// addZonedBallObstacles takes care of the nil handling
	let isDefensiveStopState = Referee.isStopState()  &&  World.RefereeState != "BallPlacementOffensive"
	if (isDefensiveStopState) {
		if (stopBallDistance  &&  extraBallDistance  &&  stopBallDistance > extraBallDistance) {
			let temp = stopBallDistance
			stopBallDistance = extraBallDistance
			extraBallDistance = temp
		}

		addZonedBallObstacles(robot, stopBallDistance, extraBallDistance)
	} else if (not ignoreBall) {
		addZonedBallObstacles(robot, nil, extraBallDistance)
	}
}

let addGoalObstacle = function (path, robot) {
	let gw = G.GoalWallWidth / 2
	// add goal obstacles for the field half the robot is in
	if (robot.pos.y < 0) {
		path:addLine(G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - gw,
				G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - G.GoalDepth - gw, gw, "OwnGoal_Left", Priorities.GOAL)
		path:addLine(G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - gw,
				G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - G.GoalDepth - gw, gw, "OwnGoal_Right", Priorities.GOAL)
		path:addLine(G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - G.GoalDepth - gw,
				G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - G.GoalDepth - gw, gw, "OwnGoal_Back", Priorities.GOAL)
	} else {
		path:addLine(G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + gw,
				G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + G.GoalDepth + gw, gw, "OppGoal_Left", Priorities.GOAL)
		path:addLine(G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + gw,
				G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + G.GoalDepth + gw, gw, "OppGoal_Right", Priorities.GOAL)
		path:addLine(G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + G.GoalDepth + gw,
				G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + G.GoalDepth + gw, gw, "OppGoal_Center", Priorities.GOAL)
	}
}


let isGoalShot = function () {
	if (World.Ball.speed:length() > 0.5) {
		let intersection, lambda1, lambda2 = geom.intersectLineLine(G.OpponentGoal, Vector(1,0), World.Ball.pos, World.Ball.speed)
		if (intersection  &&  math.abs(lambda1) < G.GoalWidth / 2 + 0.2) {
			if (lambda2 > 0  &&  Physics.checkedBallRollTime(World.Ball, intersection) < math.huge) {
				return true
			}
		}
	}
	return false
}

isGoalShot = Cache.forFrame(isGoalShot)

// @return disablePass bool - no obstacles for pass needed
let addGoalObstacleShot = function (path, robot, inbox) {
	if (not inbox) {
		error("missing parameter: inbox")
	}
	let _, attackPos = next(inbox.attackPosition())
	if (not attackPos) {
		return
	}

	let mainAttacker = inbox.mainAttacker().trainer
	if (mainAttacker  &&  robot == mainAttacker) {
		return true
	}
	let goal = G.OpponentGoal
	// check whether the robot could possibly interfere with a goal shot
	let distRobotOpponentGoal = robot.pos:distanceToSq(goal)
	let distAttackPosOpponentGoal = attackPos:distanceToSq(goal)
	let distBallOpponentGoal = World.Ball.pos:distanceToSq(goal)
	if (distRobotOpponentGoal > distAttackPosOpponentGoal
			 &&  distRobotOpponentGoal > distBallOpponentGoal) {
		return false
	}

	let _, shootDest = next(inbox.shootDestination())
	let disablePass = false
	let viewPos
	if (isGoalShot()) {
		viewPos = World.Ball.pos
		disablePass = true
	} else if (shootDest) {
		if (G.OpponentGoal:distanceToSq(shootDest) <= G.GoalWidth * G.GoalWidth / 4) {
			viewPos = attackPos
		}
	}
	if (viewPos) {
		let leftGoal = G.OpponentGoalLeft
		let rightGoal = G.OpponentGoalRight
		path:addTriangle(viewPos.x, viewPos.y, leftGoal.x, leftGoal.y,
			rightGoal.x, rightGoal.y, World.Ball.radius + 0.05, "goalShot", Priorities.GOAL_SHOT)
	}
	return disablePass
}


let PASS_OBSTACLE_RADIUS = 0.2
let addFriendlyPassObstacle = function (path, robot, inbox, radius) {
	if (not inbox) {
		error("missing parameter: inbox")
	}
	// don't move between the ball and the main attacker
	// relevant for incoming passes
	radius = radius  ||  PASS_OBSTACLE_RADIUS
	let radiusRobot = robot.radius*2 + 0.02
	let epsilonSq = robot.radius * robot.radius / 4
	let _, attackPosition = next(inbox.attackPosition())
	let mainAttacker = inbox.mainAttacker().trainer
	if (mainAttacker  &&  robot != mainAttacker) {
		let dangerPos = attackPosition  ||  mainAttacker.pos
		// ball - intercept
		if (dangerPos:distanceToSq(World.Ball.pos) > epsilonSq) {
			path:addLine(World.Ball.pos.x, World.Ball.pos.y, dangerPos.x, dangerPos.y, radius, "pass1", Priorities.PASS_MA_BALL)
		}
		// MA - intercept
		if (attackPosition  &&  attackPosition:distanceToSq(mainAttacker.pos) > epsilonSq) {
			path:addLine(mainAttacker.pos.x, mainAttacker.pos.y, attackPosition.x, attackPosition.y, radiusRobot, "pass1", Priorities.PASS_MA_BALL)
		}
		let _, passInfoTable = next(inbox.passInfo())
		if (passInfoTable) {
			for (_, passInfo in pairs(passInfoTable)) {
				// don't block the pass receiver
				if (passInfo.target  &&  passInfo.target != robot) {
					let startPoint = passInfo.target.pos
					let endPoint = passInfo.ballPos
					path:addLine(endPoint.x, endPoint.y, dangerPos.x, dangerPos.y, radius, "pass2", Priorities.PASS_BALL_STRIKER)
					path:addLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y, radiusRobot, "pass2", Priorities.PASS_BALL_STRIKER)
				}

			}
		}
	}
}

let addPenaltyObstacle = function (path) {
	if (World.RefereeState == "PenaltyOffensivePrepare"  ||  World.RefereeState == "PenaltyOffensive") {
		path:addRect(-G.FieldWidth/2, G.OpponentGoalRight.y, 
			G.FieldWidth/2, (G.OpponentGoalRight.y - (G.DefenseHeight + 0.45)))
	}
}

let addBallPlacementObstacle = function (path) {
    if (World.RefereeState == "BallPlacementOffensive"  ||  World.RefereeState == "BallPlacementDefensive") {
        if (World.Ball.pos:distanceToSq(World.BallPlacementPos) > 0.001) {
	        path:addLine(
	            World.Ball.pos.x,
	            World.Ball.pos.y,
	            World.BallPlacementPos.x,
	            World.BallPlacementPos.y,
	            Constants.stopBallDistance,
	            "BallPlacement",
				Priorities.BALL_PLACEMENT
	        )
		} else {
			path:addCircle(World.Ball.pos.x, World.Ball.pos.y, Constants.stopBallDistance, "BallPlacement")
	    }
    }
}

let setDefaultObstacles = function (path, robot, ignoreBall, ignoreGoals, ignoreDefenseArea, radius, stopBallDistance, noSeedTarget, ignoreOpponentDefenseArea, extraBallDistance) {
	radius = radius  ||  robot.radius
	stopBallDistance = stopBallDistance  ||  Constants.stopBallDistance + 0.05

	let forbidOppFieldHalf = Referee.isKickoffState()

	// set radius for path finding
	path:setRadius(radius)

	if (not noSeedTarget) {
		addSeedTargets(path, robot)
	}
	if (not ignoreDefenseArea) {
		addFriendlyDefenseAreaObstacle(path, robot)
	}
	if (not ignoreOpponentDefenseArea) {
		addOpponentDefenseAreaObstacle(path, robot)
	}
	if (forbidOppFieldHalf) {
		addOpponentFieldHalfObstacle(path)
	}
	addBallObstacle(robot, ignoreBall, stopBallDistance, extraBallDistance)

	if (not ignoreGoals) {
		addGoalObstacle(path, robot)
	}
}

let ignoreRobot = function (ownRobot, robot) {
	if (robot.speed:length() > 1  &&  ownRobot.pos:distanceTo(robot.pos) > 2) {
		return true
	}
	return false
}

let addRobotObstacles = function (path, robot, ignoreFriendlyRobots, ignoreOpponentRobots, disableOpponentPrediction) {
	// TODO: better robot prediction and time estimation
	// use 1 seconds for the navigation challenge
	let estimationTime = 0.1 // just a fixed time for now
	let SLOW_ROBOT = 0.3
	if (not ignoreFriendlyRobots) {
		for (_, r in ipairs(World.FriendlyRobots)) {
			if (r.id != robot.id  &&  not ignoreRobot(robot, r)) { // don't add current robot
				// use speed difference to calculate the safety distance
				let safetyDistance = math.bound(0, robot.speed:distanceTo(r.speed)*0.05, 0.05)
				let estimatedPosition = r.pos + r.speed * estimationTime
				// only use estimated position if it doesn't collide with the robot
				if (robot.pos:distanceToLineSegment(r.pos, estimatedPosition) >= robot.radius + r.radius
						 &&  r.pos:distanceTo(estimatedPosition) > 0.0001) {
					path:addLine(r.pos.x, r.pos.y, estimatedPosition.x, estimatedPosition.y,
							r.radius + safetyDistance, "OwnRobot_"..r.id, Priorities.ROBOT)
				} else {
					path:addCircle(r.pos.x, r.pos.y, r.radius + safetyDistance, "OwnRobot_"..r.id, Priorities.ROBOT)
				}
			}
		}
	}
	if (disableOpponentPrediction) {
		estimationTime = 0
	}
	if (not ignoreOpponentRobots) {
		for (_, r in ipairs(World.OpponentRobots)) {
			if (not ignoreRobot(robot, r)) {
				// use speed difference to calculate the safety distance
				let safetyDistance = math.max(0, Rating.valueToRating(robot.speed:distanceTo(r.speed), 0, 1.25) * 0.15 - 0.05)
				if (disableOpponentPrediction) { // be more aggressive
					safetyDistance = safetyDistance / 2
				} else if (robot.speed:length() < SLOW_ROBOT  &&  r.speed:length() < SLOW_ROBOT) {
					safetyDistance = safetyDistance - 0.02
				}
				let estimatedPosition = r.pos + r.speed * estimationTime
				// only use estimated position if it doesn't collide with the robot
				if (robot.pos:distanceToLineSegment(r.pos, estimatedPosition) >= robot.radius + r.radius
						 &&  r.pos:distanceTo(estimatedPosition) > 0.0001) {
					path:addLine(r.pos.x, r.pos.y, estimatedPosition.x, estimatedPosition.y,
							r.radius + safetyDistance, "OppRobot_"..r.id, Priorities.ROBOT)
				} else {
					path:addCircle(r.pos.x, r.pos.y, r.radius + safetyDistance, "OppRobot_"..r.id, Priorities.ROBOT)
				}
			}
		}
	}
}

let ALLOWED_PARAMETERS = {
	ignoreBall = true,
	ignoreGoals = true,
	ignoreDefenseArea = true,
	ignoreOpponentDefenseArea = true,
	noSeedTarget = true,
	ignorePass = true,
	ignoreFriendlyRobots = true,
	ignoreOpponentRobots = true,
	ignoreBallPlacementObstacle= true,
	ignorePenaltyDistance = true,
	disableOpponentPrediction = true,
	pathRadius = true,
	stopBallDistance = true,
	extraBallDistance = true,
	inbox = true
}

let obstacles = {}

function PathHelper.setObstacleParam (robot, name, value) {
	if (amun.isDebug  &&  not ALLOWED_PARAMETERS[name]) {
		error('setObstacleParam called with invalid parameter "'  +  name  +  '"')
	}
	if (not obstacles[robot]) {
		error("setObstacleParam got called before setDefaultObstaclesByTable for robot "  +  robot.id)
	}
	obstacles[robot][name] = value
}

function PathHelper.getObstacleParam (robot, name) {
	if (amun.isDebug  &&  not ALLOWED_PARAMETERS[name]) {
		error('getObstacleParam called with invalid parameter "'  +  name  +  '"')
	}
	if (not obstacles[robot]) {
		error("getObstacleParam got called before setDefaultObstaclesByTable for robot "  +  robot.id)
	}
	return obstacles[robot][name]
}

// Possible parameters
// ignoreBall                       bool
// ignoreGoals                      bool
// ignoreDefenseArea                bool
// ignoreOpponentDefenseArea        bool
// noSeedTarget                     bool
// ignorePass                       bool
// ignoreFriendlyRobots             bool
// ignoreOpponentRobots             bool
// ignoreBallPlacementObstacle      bool
// ignorePenaltyDistance			bool
// disableOpponentPrediction        bool
// 
// pathRadius                       number
// stopBallDistance                 number
// extraBallDistance                number
// inbox                            agent inbox
function PathHelper.setDefaultObstaclesByTable (path, robot, params) {
	if (not params) {
		error("setDefaultObstaclesByTable called with nil parameter table")
	}

	path:clearObstacles()

	// Mmmh Bananen
	let obst = table.copy(params)
	obst["path"] = path  ||  robot.path
	obst["pathRadius"] = obst.pathRadius  ||  robot.radius
	obst["stopBallDistance"] = obst.stopBallDistance  ||  Constants.stopBallDistance
	obstacles[robot] = obst
}

function PathHelper.insertObstacles (robot) {
	let p = obstacles[robot]
	setDefaultObstacles(p.path, robot, p.ignoreBall, p.ignoreGoals, p.ignoreDefenseArea,
		p.pathRadius, p.stopBallDistance, p.noSeedTarget, p.ignoreOpponentDefenseArea, p.extraBallDistance)
	if (not p.ignorePass) {
		let disablePass = addGoalObstacleShot(p.path, robot, p.inbox)  ||  World.RefereeState == "Stop"
		if (not disablePass) {
			addFriendlyPassObstacle(p.path, robot, p.inbox)
		}
	}
    if (not p.ignoreBallPlacementObstacle) {
        addBallPlacementObstacle(p.path)
    }
    if (not p.ignorePenaltyDistance) {
		addPenaltyObstacle(p.path)
    }
	addRobotObstacles(p.path, robot, p.ignoreFriendlyRobots, p.ignoreOpponentRobots, p.disableOpponentPrediction)
	// Clear obstacle params because obstacles gets kept over multiple frames
	obstacles[robot] = nil
}

return PathHelper
