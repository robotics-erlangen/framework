import * as Cache from "base/cache";
import * as Constants from "base/constants";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { Path } from "base/path";
import * as Referee from "base/referee";
import { FriendlyRobot, Robot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import * as OBall from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Rating from "glados/util/rating";

let G: Readonly<World.GeometryType> = World.Geometry;
let POSITION_PADDING = 0.02;
let SEED_ANGLE_MOD = 2 / 180 * Math.PI;
let SEED_PREDICT_TIME = 0.5;

export const Priorities = {
	GOAL: 100,
	STOP_EVACUATE_GOAL: 96,
	STOP_DEFENSE_AREA: 95,
	ROBOT: 92,
	// The obstacle in t/a/shoot should have the same priority as the ball obstacle here
	BALL: 84,
	OUT_OF_FIELD: 80,
	EVACUATE_GOAL: 76,
	// The obstacle in t/s/ballescort should have the same priority as the inner_ball obstacle here
	INNER_BALL: 68,
	OUTER_BALL: 66,
	BALL_PLACEMENT: 52,
	DEFENSE_AREA: 44,
	OPP_FIELD_HALF_INNER: 37,
	OPP_FIELD_HALF: 36,
	GOAL_SHOT: 20,
	PASS_MA_BALL: 13,
	PASS_BALL_STRIKER: 12
};

function addSeedTargets(path: Path, robot: FriendlyRobot) {
	if (path.addSeedTarget && robot.speed.length() > 0.1) {
		let angleMod = [ -SEED_ANGLE_MOD, 0, SEED_ANGLE_MOD ];
		for (let angle of angleMod) {
			let seedTarget = robot.pos + (robot.speed * SEED_PREDICT_TIME).rotate(angle);
			path.addSeedTarget(seedTarget.x, seedTarget.y);
			// vis.addPath("traj/pathhelper: seedTarget", { robot.pos, seedTarget }, vis.colors.blue)
		}
	}
}


let _GoalArea = [
	new Vector(-G.GoalWidth / 2 - 0.04,G.FieldHeightHalf + G.GoalDepth + 0.04),
	new Vector(G.GoalWidth / 2 + 0.04,G.FieldHeightHalf - G.GoalDepth - 0.04)
];
let _GoalAreaFriendly = [
	-_GoalArea[0],
	-_GoalArea[1]
];
function addFriendlyDefenseAreaObstacle(path: Path, robot: FriendlyRobot) {
	// only keeper may enter friendly defense area
	// don't add obstacles for friendly defense area if the robot is in the opponent half
	if (World.FriendlyKeeper !== robot && robot.pos.y < 0
			&& World.RefereeState !== "BallPlacementOffensive") {
		if (World.RULEVERSION === "2018") {
			path.addRect(G.FriendlyGoal.x - G.DefenseWidthHalf - POSITION_PADDING,
					G.FriendlyGoal.y - 1,
					G.FriendlyGoal.x + G.DefenseWidthHalf + POSITION_PADDING,
					G.FriendlyGoal.y + G.DefenseHeight + POSITION_PADDING,
					"DefenseArea", Priorities.DEFENSE_AREA);
		} else {
		// line with round end caps
			path.addLine(G.FriendlyGoal.x - G.DefenseStretch / 2, G.FriendlyGoal.y,
					G.FriendlyGoal.x + G.DefenseStretch / 2, G.FriendlyGoal.y,
					G.DefenseRadius + POSITION_PADDING, "DefenseArea", Priorities.DEFENSE_AREA);
		}
		if (geom.insideRect(_GoalAreaFriendly[0], _GoalAreaFriendly[1], robot.pos) || Field.isInFriendlyDefenseArea(robot.pos, robot.radius * 2)) {
			path.addRect(_GoalAreaFriendly[0].x, _GoalAreaFriendly[0].y, _GoalAreaFriendly[1].x, _GoalAreaFriendly[1].y, "EvacuateGoal", Priorities.EVACUATE_GOAL);
		}
	}
}

function addOpponentDefenseAreaObstacle(path: Path, robot: FriendlyRobot, targetPosition: Position) {
	// don't add obstacles for opponent defense area if the robot is in the friendly half
	let oppDefAreaDist = Referee.isFriendlyFreeKickState() || Referee.isStopState() ? G.FreeKickDefenseDist + 0.05 : 0;
	const priority = oppDefAreaDist === 0 ? Priorities.DEFENSE_AREA : Priorities.STOP_DEFENSE_AREA;
	// TODO: adjust to rect with distance instead of larger rect
	let distance = oppDefAreaDist + POSITION_PADDING;
	if (robot.pos.y > 0 && (!Referee.isFriendlyPenaltyState()) &&
			World.RefereeState !== "BallPlacementOffensive") {
		if (World.RULEVERSION === "2018") {
			path.addRect(G.OpponentGoal.x - G.DefenseWidthHalf - distance,
					G.OpponentGoal.y - G.DefenseHeight - distance,
					G.OpponentGoal.x + G.DefenseWidthHalf + distance,
					G.OpponentGoal.y + 1,
					"DefenseArea", priority);
		} else {
			path.addLine(G.OpponentGoal.x - G.DefenseStretch / 2, G.OpponentGoal.y,
					G.OpponentGoal.x + G.DefenseStretch / 2, G.OpponentGoal.y,
					G.DefenseRadius + POSITION_PADDING, "DefenseArea", priority);
		}
		if (geom.insideRect(_GoalArea[0], _GoalArea[1], robot.pos) || Field.isInOpponentDefenseArea(robot.pos, robot.radius * 2)) {
			path.addRect(_GoalArea[0].x, _GoalArea[0].y, _GoalArea[1].x, _GoalArea[1].y, "EvacuateGoal", priority === Priorities.DEFENSE_AREA ? Priorities.EVACUATE_GOAL : Priorities.STOP_EVACUATE_GOAL);
		}
	}
}

function addOpponentFieldHalfObstacle(path: Path) {
	if (World.RefereeState === "KickoffOffensive") {
		path.addRect(-G.FieldWidthHalf - 0.5, G.FieldHeightHalf + 0.5,
			-G.CenterCircleRadius, 0.02, "OppFieldHalf", Priorities.OPP_FIELD_HALF);
		path.addRect(-G.CenterCircleRadius - 0.2, G.FieldHeightHalf + 0.5,
			G.CenterCircleRadius + 0.2, G.CenterCircleRadius, "OppFieldHalf", Priorities.OPP_FIELD_HALF_INNER);
		path.addRect(G.CenterCircleRadius, G.FieldHeightHalf + 0.5,
			G.FieldWidthHalf + 0.5, 0.02, "OppFieldHalf", Priorities.OPP_FIELD_HALF);
	} else {
		path.addRect(-G.FieldWidthHalf - 0.5, G.FieldHeightHalf + 0.5,
			G.FieldWidthHalf + 0.5, 0.02, "OppFieldHalf", Priorities.OPP_FIELD_HALF);
	}
}

function addZonedBallObstacles(robot: FriendlyRobot, innerBallDistance?: number, outerBallDistance?: number) {
	let ball = World.Ball;
	let distSq = robot.pos.distanceToSq(ball.pos);
	let outermost = Infinity;


	if (outerBallDistance != undefined) {
		outermost = outerBallDistance * outerBallDistance;
		robot.path.addCircle(ball.pos.x, ball.pos.y, ball.radius + outerBallDistance, "OuterBallObstacle", Priorities.OUTER_BALL);
	}
	if (distSq < outermost && innerBallDistance != undefined) {
		outermost = innerBallDistance * innerBallDistance;
		if (ball.speed.length() >= 0.3) {
			let ballSpeedScale = ball.speed * 0.4;
			robot.path.addLine(ball.pos.x, ball.pos.y, ball.pos.x + ballSpeedScale.x, ball.pos.y + ballSpeedScale.y, ball.radius + innerBallDistance,
				"InnerBallObstacle", Priorities.INNER_BALL);
		} else {
			robot.path.addCircle(ball.pos.x, ball.pos.y, ball.radius + innerBallDistance, "InnerBallObstacle", Priorities.INNER_BALL);
		}
	}
	if (distSq < outermost) {
		robot.path.addCircle(ball.pos.x, ball.pos.y, ball.radius, "Ball", Priorities.BALL);
	}
}

function addBallObstacle(robot: FriendlyRobot, ignoreBall?: boolean, stopBallDistance?: number, extraBallDistance?: number) {
	// Since I had some trouble figuring out the semantic when I changed this I'll document it here
	// (Even if it should be clear from the code now)
	// If we are in a defensive stop state, the ignoreBall parameter is ignored (because that is how it was before)
	// In the other two cases (ball placement and normal game), ignoreBall is considered.
	// If it is false, we don't want to set a stopDistance but still consider an eventual extraBallDistance
	// addZonedBallObstacles takes care of the undefined handling
	let isDefensiveStopState = Referee.isStopState() && World.RefereeState !== "BallPlacementOffensive";
	if (isDefensiveStopState) {
		if (stopBallDistance != undefined && extraBallDistance != undefined && stopBallDistance > extraBallDistance) {
			let temp = stopBallDistance;
			stopBallDistance = extraBallDistance;
			extraBallDistance = temp;
		}

		addZonedBallObstacles(robot, stopBallDistance, extraBallDistance);
	} else if (!ignoreBall) {
		addZonedBallObstacles(robot, undefined, extraBallDistance);
	}
}

function addGoalObstacle(path: Path, robot: FriendlyRobot, ignoreDefense: boolean, ignoreOppDefense: boolean) {
	let gw = G.GoalWallWidth / 2;
	// add goal obstacles for the field half the robot is in
	// TODO: wenn nicht keeper: eine fette linie oder so
	if (robot.pos.y < 0) {
		if (ignoreDefense) {
			path.addLine(G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - gw,
					G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - G.GoalDepth - gw, gw, "OwnGoal_Left", Priorities.GOAL);
			path.addLine(G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - gw,
					G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - G.GoalDepth - gw, gw, "OwnGoal_Right", Priorities.GOAL);
			path.addLine(G.FriendlyGoalLeft.x - gw, G.FriendlyGoalLeft.y - G.GoalDepth - gw,
					G.FriendlyGoalRight.x + gw, G.FriendlyGoalRight.y - G.GoalDepth - gw, gw, "OwnGoal_Back", Priorities.GOAL);
		}
	} else if (ignoreOppDefense) {
		path.addLine(G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + gw,
				G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + G.GoalDepth + gw, gw, "OppGoal_Left", Priorities.GOAL);
		path.addLine(G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + gw,
				G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + G.GoalDepth + gw, gw, "OppGoal_Right", Priorities.GOAL);
		path.addLine(G.OpponentGoalLeft.x - gw, G.OpponentGoalLeft.y + G.GoalDepth + gw,
				G.OpponentGoalRight.x + gw, G.OpponentGoalRight.y + G.GoalDepth + gw, gw, "OppGoal_Center", Priorities.GOAL);
	}
}


function _isGoalShot(): boolean {
	if (World.Ball.speed.length() > 0.5) {
		let [intersection, lambda1, lambda2] = geom.intersectLineLine(G.OpponentGoal, new Vector(1,0), World.Ball.pos, World.Ball.speed);
		if (intersection && Math.abs(lambda1!) < G.GoalWidth / 2 + 0.2) {
			if (lambda2! > 0 && Physics.checkedBallRollTime(World.Ball, intersection) < Infinity) {
				return true;
			}
		}
	}
	return false;
}
export let isGoalShot: () => boolean = Cache.forFrame(_isGoalShot);

/**
 * @returns Whether to disable pass obstacles
 */
function addGoalObstacleShot(path: Path, robot: FriendlyRobot, messaging: MessageBox, useCMA: boolean) {
	// let _, attackPos = next(messaging.attackPosition());
	let attackPos = messaging.receiveSingleSender(MessageType.attackPosition)[1];
	let attackTime = messaging.receiveSingleSender(MessageType.plannedAttackTime)[1];
	if (!attackPos || attackTime == undefined) {
		return;
	}

	let mainAttacker = messaging.receiveTrainer(MessageType.mainAttacker);
	if (mainAttacker != undefined && robot === mainAttacker) {
		return true;
	}
	let goal = G.OpponentGoal;
	// check whether the robot could possibly interfere with a goal shot
	let distRobotOpponentGoal = robot.pos.distanceToSq(goal);
	let distAttackPosOpponentGoal = attackPos.distanceToSq(goal);
	let distBallOpponentGoal = World.Ball.pos.distanceToSq(goal);
	if (distRobotOpponentGoal > distAttackPosOpponentGoal
			&&  distRobotOpponentGoal > distBallOpponentGoal) {
		return false;
	}

	let shootDest = messaging.receiveSingleSender(MessageType.shootDestination)[1];
	let disablePass = false;
	let viewPos;
	let shootSpeed = Constants.maxBallSpeed;
	if (isGoalShot()) {
		viewPos = World.Ball.pos;
		shootSpeed = World.Ball.speed.length();
		disablePass = true;
	} else if (shootDest) {
		if (G.OpponentGoal.distanceToSq(shootDest) <= G.GoalWidth * G.GoalWidth / 4) {
			viewPos = attackPos;
		}
	}
	if (viewPos) {
		let leftGoal = G.OpponentGoalLeft;
		let rightGoal = G.OpponentGoalRight;
		if (useCMA) {
			path.addTriangle(viewPos.x, viewPos.y, leftGoal.x, leftGoal.y,
				rightGoal.x, rightGoal.y, World.Ball.radius + 0.05, "goalShot", Priorities.GOAL_SHOT);
		} else {
			// no need to calculate the actual time, in 3 seconds it will definitively have reached the goal
			let t = attackTime - World.Time;
			path.addMovingLine(t, t + 3, viewPos, (leftGoal - viewPos).setLength(shootSpeed), new Vector(0, 0),
				viewPos, (rightGoal - viewPos).setLength(shootSpeed), new Vector(0, 0), World.Ball.radius + 0.15, Priorities.GOAL_SHOT);
		}
	}
	return disablePass;
}


let PASS_OBSTACLE_RADIUS = 0.2;
function addFriendlyPassObstacle(path: Path, robot: FriendlyRobot, messaging: MessageBox, useCMA: boolean, radius: number = PASS_OBSTACLE_RADIUS) {
	// don't move between the ball and the main attacker
	// relevant for incoming passes
	let radiusRobot = robot.radius * 2 + 0.02;
	let epsilonSq = robot.radius * robot.radius / 4;
	let attackPosition = messaging.receiveSingleSender(MessageType.attackPosition)[1];
	let attackTime = messaging.receiveSingleSender(MessageType.plannedAttackTime)[1];
	let mainAttacker = messaging.receiveTrainer(MessageType.mainAttacker);
	if (mainAttacker && robot !== mainAttacker) {
		let dangerPos = attackPosition || mainAttacker.pos;
		let dangerTime = attackTime != undefined ? attackTime : Physics.ballTravelTime(World.Ball, World.Ball.pos.distanceTo(dangerPos)) + World.Time;
		// ball - intercept
		if (dangerPos.distanceToSq(World.Ball.pos) > epsilonSq) {
			if (useCMA) {
				path.addLine(World.Ball.pos.x, World.Ball.pos.y, dangerPos.x, dangerPos.y, radius, "pass1", Priorities.PASS_MA_BALL);
			} else {
				// if the ball is currently very slow, there is no need to add a dedicated obstacle here
				if (dangerTime < Infinity) {
					let t = dangerTime - World.Time;
					// TODO: add correct ball deceleration
					path.addMovingCircle(0, t, World.Ball.pos, World.Ball.speed, new Vector(0, 0), radius, Priorities.PASS_MA_BALL);
				}
			}
		}
		// MA - intercept
		if (attackPosition && attackPosition.distanceToSq(mainAttacker.pos) > epsilonSq) {
			if (useCMA) {
				path.addLine(mainAttacker.pos.x, mainAttacker.pos.y, attackPosition.x, attackPosition.y, radiusRobot, "pass1", Priorities.PASS_MA_BALL);
			} else {
				// this obstacle is not necessary for trajectory path finding since robot obstacles are handled differently
			}
		}
		let passInfoTable = messaging.receiveSingleSender(MessageType.passInfo)[1];
		if (passInfoTable && dangerTime !== Infinity) { // dangerTime === Infinity will be true if stop ball hit (therefore no plannedAttackTime exists), while beeing totally unreasonable (like on the other edge of the field)
														// FIXME: Why are we still calling shoot in this situation?
			for (let passInfo of passInfoTable) {
				// don't block the pass receiver
				if (passInfo.target && passInfo.target !== robot) {
					let startPoint = passInfo.target.pos;
					let endPoint = passInfo.ballPos;
					if (useCMA) {
						path.addLine(endPoint.x, endPoint.y, dangerPos.x, dangerPos.y, radius, "pass2", Priorities.PASS_BALL_STRIKER);
						path.addLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y, radiusRobot, "pass2", Priorities.PASS_BALL_STRIKER);
					} else {
						let ballTime = Physics.ballRollTime({speed: new Vector(Constants.maxBallSpeed, 0),
							maxSpeed: Constants.maxBallSpeed}, dangerPos.distanceTo(endPoint));
						let shortEndPoint = dangerPos + (endPoint - dangerPos).setLength(1);
						if (ballTime > 5) {
							ballTime = 5;
						}
						let t = dangerTime - World.Time;
						path.addMovingCircle(t, t + ballTime, dangerPos, (endPoint - dangerPos).setLength(Constants.maxBallSpeed),
							new Vector(0, 0), radius, Priorities.PASS_BALL_STRIKER);
						path.addLine(dangerPos.x, dangerPos.y, shortEndPoint.x, shortEndPoint.y, radiusRobot, "pass2", Priorities.PASS_BALL_STRIKER);
					}
				}

			}
		}
	}
}

function addPenaltyObstacle(path: Path) {
	if (World.RefereeState === "PenaltyOffensivePrepare" || World.RefereeState === "PenaltyOffensive") {
		path.addRect(-G.FieldWidthHalf - 1, G.OpponentGoalRight.y + 1,
			G.FieldWidthHalf + 1, (G.OpponentGoalRight.y - (G.DefenseHeight + 0.45)));
	}
}

function addBallPlacementObstacle(path: Path, messaging: MessageBox | undefined) {
	if (World.RefereeState === "BallPlacementOffensive" || World.RefereeState === "BallPlacementDefensive") {
		if (!World.BallPlacementPos) {
			throw new Error("Referee state ball placement without ballPlacementPos");
		}
		if (World.Ball.pos.distanceToSq(World.BallPlacementPos) > 0.001) {
			path.addLine(
				World.Ball.pos.x,
				World.Ball.pos.y,
				World.BallPlacementPos.x,
				World.BallPlacementPos.y,
				Constants.stopBallDistance + 0.1,
				"BallPlacement",
				Priorities.BALL_PLACEMENT
			);
		} else {
			path.addCircle(World.Ball.pos.x, World.Ball.pos.y, Constants.stopBallDistance + 0.1, "BallPlacement");
		}
		if (messaging) {
			let ballplacementRobot = messaging.receiveSingleSender(MessageType.placingRobot)[0];
			if (ballplacementRobot) {
				if (ballplacementRobot.pos.distanceTo(World.BallPlacementPos) > ballplacementRobot.radius) {
					path.addLine(
						ballplacementRobot.pos.x,
						ballplacementRobot.pos.y,
						World.BallPlacementPos.x,
						World.BallPlacementPos.y,
						Constants.stopBallDistance + 0.1,
						"BallPlacement",
						Priorities.BALL_PLACEMENT
					);
				} else {
					path.addCircle(ballplacementRobot.pos.x, ballplacementRobot.pos.y, Constants.stopBallDistance + 0.1, "BallPlacement", Priorities.BALL_PLACEMENT);
				}
			}
		}
		for (let r of OBall.getBallPlacementRobots()) {
			path.addLine(
				r.pos.x,
				r.pos.y,
				World.BallPlacementPos.x,
				World.BallPlacementPos.y,
				Constants.stopBallDistance + 0.1,
				"BallPlacement",
				Priorities.BALL_PLACEMENT
			);
		}
	}
}

function setDefaultObstacles(path: Path, robot: FriendlyRobot, targetPosition: Position, ignoreBall?: boolean, ignoreGoals?: boolean,
		ignoreDefenseArea?: boolean, radius: number = robot.radius, stopBallDistance: number = Constants.stopBallDistance + 0.05,
		noSeedTarget?: boolean, ignoreOpponentDefenseArea?: boolean, extraBallDistance?: number) {

	let forbidOppFieldHalf = Referee.isKickoffState();

	// set radius for path finding
	path.setRadius(radius);

	path.setOutOfFieldObstaclePriority(Priorities.OUT_OF_FIELD);

	if (!noSeedTarget) {
		addSeedTargets(path, robot);
	}
	if (!ignoreDefenseArea) {
		addFriendlyDefenseAreaObstacle(path, robot);
	}
	if (!ignoreOpponentDefenseArea) {
		addOpponentDefenseAreaObstacle(path, robot, targetPosition);
	}
	if (forbidOppFieldHalf) {
		addOpponentFieldHalfObstacle(path);
	}
	addBallObstacle(robot, ignoreBall, stopBallDistance, extraBallDistance);

	if (!ignoreGoals) {
		addGoalObstacle(path, robot, ignoreDefenseArea || false, ignoreOpponentDefenseArea || false);
	}
}

function ignoreRobot(ownRobot: FriendlyRobot, robot: Robot): boolean {
	if (robot.speed.length() > 1 && ownRobot.pos.distanceTo(robot.pos) > 2) {
		return true;
	}
	return false;
}

function addMovingRobotObstacle(path: Path, otherRobot: Robot, safetyDistance: number) {
	let ACCELERATION = 3.0;
	let speedLength = otherRobot.speed.length();
	let brakeTime = speedLength / ACCELERATION;
	let brakePos = otherRobot.speed * (brakeTime * 0.5);
	path.addMovingCircle(0, brakeTime, otherRobot.pos, otherRobot.speed, -otherRobot.speed.copy().setLength(ACCELERATION), otherRobot.radius + safetyDistance, Priorities.ROBOT);
	if (brakeTime < 2) {
		path.addMovingCircle(brakeTime, 2, otherRobot.pos + brakePos, new Vector(0, 0), new Vector(0, 0), otherRobot.radius + safetyDistance, Priorities.ROBOT);
	}
}

let robotWasSlowHysteresis = new Map<FriendlyRobot, boolean>();
function addRobotObstacles(path: Path, robot: FriendlyRobot, targetPosition: Position, ignoreFriendlyRobots?: boolean,
		ignoreOpponentRobots?: boolean, disableOpponentPrediction?: boolean, useCMA?: boolean) {
	// TODO. better robot prediction and time estimation
	// use 1 seconds for the navigation challenge
	let estimationTime = 0.1; // just a fixed time for now
	let SLOW_ROBOT = 0.3;
	if (!ignoreFriendlyRobots) {
		for (let r of World.FriendlyRobots) {
			if (r.id !== robot.id) { // don't add current robot
				if (useCMA || !r.path.lastFrameWasTrajectoryPath()) {
					if (!ignoreRobot(robot, r)) {
						// use speed difference to calculate the safety distance
						let safetyDistance = MathUtil.bound(0, robot.speed.distanceTo(r.speed) * 0.05, 0.05);
						let estimatedPosition = r.pos + r.speed * estimationTime;
						// only use estimated position if it doesn't collide with the robot
						if (robot.pos.distanceToLineSegment(r.pos, estimatedPosition) >= robot.radius + r.radius
								&&  r.pos.distanceTo(estimatedPosition) > 0.0001) {
							path.addLine(r.pos.x, r.pos.y, estimatedPosition.x, estimatedPosition.y,
								r.radius + safetyDistance, `OwnRobot_${r.id}`, Priorities.ROBOT);
						} else {
							path.addCircle(r.pos.x, r.pos.y, r.radius + safetyDistance, `OwnRobot_${r.id}`, Priorities.ROBOT);
						}
					}
				} else {
					path.addFriendlyRobotObstacle(r, r.radius + 0.02, Priorities.ROBOT);
				}
			}
		}
	}
	if (disableOpponentPrediction) {
		estimationTime = 0;
	}
	if (!ignoreOpponentRobots) {

		const MAX_NO_FOUL_SPEED = 0.5;
		const FOUL_SPEED_HYSTERESIS = 0.1;

		let hystValue = robotWasSlowHysteresis[robot] ? FOUL_SPEED_HYSTERESIS : 0;
		let robotIsSlow = robot.speed.length() < MAX_NO_FOUL_SPEED + hystValue;
		robotWasSlowHysteresis[robot] = robotIsSlow;

		for (let r of World.OpponentRobots) {
			/** We may not use this if we're going to accelerate again */
			const willAccelerate = robot.pos.distanceTo(targetPosition) < MAX_NO_FOUL_SPEED / robot.acceleration.aBrakeFMax * 0.5 * MAX_NO_FOUL_SPEED;
			if (robotIsSlow && willAccelerate) {
				break;
			}
			if (!ignoreRobot(robot, r)) {
				// use speed difference to calculate the safety distance
				let safetyDistance = Math.max(0, Rating.valueToRating(robot.speed.distanceTo(r.speed), 0, 1.25) * 0.15 - 0.05);
				if (robot.speed.length() < 0.5) {
					safetyDistance = Math.min(safetyDistance, 0.02);
				}
				if (disableOpponentPrediction) { // be more aggressive
					safetyDistance = safetyDistance / 2;
				} else if (robot.speed.length() < SLOW_ROBOT && r.speed.length() < SLOW_ROBOT) {
					safetyDistance = safetyDistance - 0.02;
				}
				let estimatedPosition = r.pos + r.speed * estimationTime;
				// only use estimated position if it doesn't collide with the robot
				if (robot.pos.distanceToLineSegment(r.pos, estimatedPosition) >= robot.radius + r.radius
						&&  r.pos.distanceTo(estimatedPosition) > 0.0001) {

					let absSpeed = r.speed.length();
					let breakTime = absSpeed / r.acceleration.aBrakeFMax;
					if (breakTime < estimationTime || useCMA) {
						// They can break in the estimation. This means that leavingTime would be INF.
						// TODO: we can trim the obstacle
						// For now, we keep the fixed obstacle
						path.addLine(r.pos.x, r.pos.y, estimatedPosition.x, estimatedPosition.y,
							r.radius + safetyDistance, `OwnRobot_${r.id}`, Priorities.ROBOT);
					} else {
						// leavingTime is the time until the robot will have left the obstacle fully if he breaks as hard as possible.
						let leavingTime = (-absSpeed + Math.sqrt(absSpeed * absSpeed + 2 * r.acceleration.aBrakeFMax * (absSpeed * estimationTime + r.radius))) / r.acceleration.aBrakeFMax;
						path.addMovingLine(0, leavingTime, r.pos, new Vector(0, 0), new Vector(0, 0), estimatedPosition, new Vector(0, 0), new Vector(0, 0), r.radius + safetyDistance, Priorities.ROBOT);
					}
					// path.addAvoidanceLine(estimatedPosition, r.pos + (estimatedPosition - r.pos) * 2, r.radius * 2, 1.2);
					if (!robotIsSlow && !useCMA) {
						path.addMovingCircle(0, 0.8, r.pos, r.speed, new Vector(0, 0), r.radius + safetyDistance, Priorities.ROBOT);
					}
				} else {
					path.addCircle(r.pos.x, r.pos.y, r.radius + safetyDistance, `OwnRobot_${r.id}`, Priorities.ROBOT);
				}
			}
		}
	}
}

interface PathHelperParametersRaw {
	ignoreBall?: boolean;
	ignoreGoals?: boolean;
	ignoreDefenseArea?: boolean;
	ignoreOpponentDefenseArea?: boolean;
	noSeedTarget?: boolean;
	ignorePass?: boolean;
	ignoreFriendlyRobots?: boolean;
	ignoreOpponentRobots?: boolean;
	ignoreBallPlacementObstacle?: boolean;
	ignorePenaltyDistance?: boolean;
	disableOpponentPrediction?: boolean;
	pathRadius?: number;
	stopBallDistance?: number;
	extraBallDistance?: number;
	messaging?: MessageBox;
	path?: Path;
}
export type PathHelperParameters = PathHelperParametersRaw & ({ignorePass: true} | {messaging: MessageBox});

export enum ParameterType {
	ignoreBall = "ignoreBall", ignoreGoals = "ignoreGoals", ignoreDefenseArea = "ignoreDefenseArea",
	ignoreOpponentDefenseArea = "ignoreOpponentDefenseArea", noSeedTarget = "noSeedTarget",
	ignorePass = "ignorePass", ignoreFriendlyRobots = "ignoreFriendlyRobots", ignoreOpponentRobots = "ignoreOpponentRobots",
	ignoreBallPlacementObstacle = "ignoreBallPlacementObstacle", ignorePenaltyDistance = "ignorePenaltyDistance",
	disableOpponentPrediction = "disableOpponentPrediction", pathRadius = "pathRadius", stopBallDistance = "stopBallDistance",
	extraBallDistance = "extraBallDistance", messaging = "messaging"
}

type BooleanParameterType = ParameterType.ignoreBall | ParameterType.ignoreGoals | ParameterType.ignoreOpponentDefenseArea |
	ParameterType.noSeedTarget | ParameterType.ignorePass | ParameterType.ignoreFriendlyRobots | ParameterType.ignoreOpponentRobots |
	ParameterType.ignoreBallPlacementObstacle | ParameterType.ignorePenaltyDistance | ParameterType.disableOpponentPrediction;

let obstacles: Map<FriendlyRobot, PathHelperParameters> = new Map<FriendlyRobot, PathHelperParameters>();

export function setObstacleParam(robot: FriendlyRobot, type: ParameterType.pathRadius, value: number): void;
export function setObstacleParam(robot: FriendlyRobot, type: ParameterType.stopBallDistance, value: number): void;
export function setObstacleParam(robot: FriendlyRobot, type: ParameterType.extraBallDistance, value: number): void;
export function setObstacleParam(robot: FriendlyRobot, type: ParameterType.messaging, value: MessageBox): void;
export function setObstacleParam(robot: FriendlyRobot, type: BooleanParameterType, value: boolean): void;
export function setObstacleParam(robot: FriendlyRobot, type: ParameterType, value: any): void {
	if (!obstacles.has(robot)) {
		throw new Error(`setObstacleParam got called before setDefaultObstaclesByTable for robot ${robot.id}`);
	}
	(obstacles.get(robot) as PathHelperParameters)[type] = value;
}

export function getObstacleParam(robot: FriendlyRobot, type: BooleanParameterType): boolean;
export function getObstacleParam(robot: FriendlyRobot, type: ParameterType.pathRadius): number;
export function getObstacleParam(robot: FriendlyRobot, type: ParameterType.stopBallDistance): number;
export function getObstacleParam(robot: FriendlyRobot, type: ParameterType.extraBallDistance): number;
export function getObstacleParam(robot: FriendlyRobot, type: ParameterType.messaging): MessageBox;
export function getObstacleParam(robot: FriendlyRobot, type: ParameterType): any {
	if (!obstacles.has(robot)) {
		throw new Error(`getObstacleParam got called before setDefaultObstaclesByTable for robot ${robot.id}`);
	}
	return (obstacles.get(robot) as {[name: string]: any})[type];
}

export function setDefaultObstaclesByTable(path: Path, robot: FriendlyRobot, params: PathHelperParameters) {
	if (!params) {
		throw new Error("setDefaultObstaclesByTable called with undefined parameter table");
	}

	path.clearObstacles();

	let obst = {...params};
	obst["path"] = path || robot.path;
	obst["pathRadius"] = obst.pathRadius != undefined ? obst.pathRadius : robot.radius;
	obst["stopBallDistance"] = obst.stopBallDistance != undefined ? obst.stopBallDistance : Constants.stopBallDistance;
	obstacles.set(robot, obst);
}

export function insertObstacles(robot: FriendlyRobot, isCMA: boolean, targetPosition: Position) {
	if (!obstacles.has(robot)) {
		throw new Error("insertObstacles called without setDefaultObstacles");
	}
	let p = obstacles.get(robot) as PathHelperParameters & {path: Path};
	setDefaultObstacles(p.path, robot, targetPosition, p.ignoreBall, p.ignoreGoals, p.ignoreDefenseArea,
		p.pathRadius, p.stopBallDistance, p.noSeedTarget, p.ignoreOpponentDefenseArea, p.extraBallDistance);
	if (!p.ignorePass) {
		if (p.messaging == undefined) {
			throw new Error("");
		}
		let disablePass = addGoalObstacleShot(p.path, robot, p.messaging, isCMA) || World.RefereeState === "Stop";
		if (!disablePass) {
			addFriendlyPassObstacle(p.path, robot, p.messaging, isCMA);
		}
	}
	if (!p.ignoreBallPlacementObstacle) {
		addBallPlacementObstacle(p.path, p.messaging);
	}
	if (!p.ignorePenaltyDistance) {
		addPenaltyObstacle(p.path);
	}
	addRobotObstacles(p.path, robot, targetPosition, p.ignoreFriendlyRobots, p.ignoreOpponentRobots, p.disableOpponentPrediction, isCMA);

	// Clear obstacle params because obstacles gets kept over multiple frames
	obstacles.delete(robot);
}
