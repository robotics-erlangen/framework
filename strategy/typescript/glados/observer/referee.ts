import { log } from "base/amun";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as GameController from "base/gamecontroller";
import * as pb from "base/protobuf";
import * as BaseRef from "base/referee";
import { RingBuffer } from "base/ringbuffer";
import { Robot } from "base/robot";
import { Position, Speed } from "base/vector";
import * as World from "base/world";

import * as ObsvBall from "glados/observer/ball";

const G = World.Geometry;

interface BallLike {
	pos: Position;
	speed: Speed;
}

// Returns true if the ball's next line cut would result in an icing
// @param ball - A ball like structure
// @param friendly bool - Perform the check for our own team if true
// @return bool - Wether icing is predicted
export function icingPredicted(ball: BallLike, friendly: boolean): boolean {
	let ballOutPos = Field.nextLineCut(ball.pos, ball.speed);
	let lastTouchPos = BaseRef.robotAndPosOfLastBallTouch()[1];
	if (!lastTouchPos || !ballOutPos) {
		return false;
	}
	// Touched by correct team?
	if (friendly !== BaseRef.friendlyTouchedLast()) {
		return false;
	}
	// On the correct side?
	if (friendly ? lastTouchPos.y > 0 : lastTouchPos.y < 0) {
		return false;
	}
	// Does the ball cross the middle line?
	if (lastTouchPos.y * ballOutPos.y > 0) {
		return false;
	}
	// Will it go out at the goal line?
	if (((friendly ? Math.abs(ballOutPos.y - G.FieldHeightHalf) : Math.abs(ballOutPos.y + G.FieldHeightHalf))) > 0.001) {
		return false;
	}
	// Will it cross the line at the goal?
	if (Math.abs(ballOutPos.x) < G.GoalWidth / 2) {
		return false;
	}
	return true;
}

// Returns true if the ball's next line cut would result in an opponent icing
// @param ball - a ball like structure
// @return bool - Wether icing is predicted
export function opponentIcingPredicted(ball: BallLike): boolean {
	return icingPredicted(ball, false);
}

// Returns true if the ball's next line cut would result in a friendly icing
// @param ball - A ball like structure
// @return bool - Wether icing is predicted
export function friendlyIcingPredicted(ball: BallLike): boolean {
	return icingPredicted(ball, true);
}

let cntO = 0;
// Tries to accept that not every signal by the refbox is correct
// has to be called once and only once a frame
export function realisticCardsOpponent() {
	if (!BaseRef.hasTooManyOpponentRobots()) {
		cntO = 0;
	} else if (World.RefereeState !== "Stop" && World.Time - getLastStateChange() > 0.5) {
		cntO = cntO + 1;
	}
	if (cntO % 1500 === 1499) {
		log("Warning: More Enemies than allowed by the refbox, check Referee");
		cntO = 0;
	}

	// assumes that there is only one yellow card that is not beeing played
	if (cntO > 50) {
		return Math.min(0, World.OpponentYellowCards.length + World.OpponentRedCards - 1);
	}
	return World.OpponentYellowCards.length + World.OpponentRedCards;

}

let lastChooseKeeperCommand = 0;
export function checkChooseKeeper() {
	if (World.WorldStateSource() === pb.world.WorldSource.REAL_LIFE) {
		return;
	}
	if (World.RefereeState !== "Stop") {
		return;
	}
	if (World.FriendlyKeeper) {
		return;
	}
	if (World.Time - lastChooseKeeperCommand < 1) {
		return;
	}
	if (!GameController.isConnected()) {
		return;
	}
	// find robot closest to our goal
	let robotId: number | undefined = undefined;
	let minDistance = Infinity;
	for (let robot of World.FriendlyRobots) {
		const dist = robot.pos.distanceToSq(World.Geometry.FriendlyGoal);
		if (dist < minDistance) {
			minDistance = dist;
			robotId = robot.id;
		}
	}
	if (robotId !== undefined) {
		lastChooseKeeperCommand = World.Time;
		GameController.requestDesiredKeeper(robotId);
	}
}


export function shouldTakeAdvantage(): boolean {
	if (ObsvBall.wasShot(2) && ObsvBall.ballHeadingForGoal(World.Ball, false) && !ObsvBall.isSlowBall()) {
		debug.set("advantage check", "own goal shot");
		return true;
	}

	const MIN_DEFENSE_DISTANCE = 0.2 * World.Geometry.FieldHeight;
	if (Field.distanceToDefenseArea(ObsvBall.getRealisticBallPos(), World.Ball.radius, false) < MIN_DEFENSE_DISTANCE
			&& Field.isInAllowedField(ObsvBall.getRealisticBallPos(), 0)) {
		debug.set("advantage check", "close to opponent defense");
		return true;
	}

	// Suppose we're in a group stage.
	// If we have a small lead chances are that we won't win with a big score, meaning wasting time for the other team is a good idea,
	// since chances are that we either win with a small lead or end in a draw, but if we end in a draw the score doesn't matter as much.
	// If we have a big lead we don't want to waste time (wasting time means in this case trying to shoot a goal against more robots than
	// necessary), because we can probably shoot more goals (meaning playing more time against less robots could make the difference between
	// a 8:0 and a 10:0 result) and end with a big lead.
	// In case we're in an elimination match we basically always want the advantage, because the opponents can't close the score difference
	// during this, but if we lead by more than two goals we don't lose a lot by not choosing advantage.
	const scoreDifference = World.FriendlyScore - World.OpponentScore;
	if (scoreDifference > 0 && scoreDifference < 3) {
		debug.set("advantage check", "leading with <3 goals");
		return true;
	}

	debug.set("advantage check", "default");
	return false;
}

let lastStopTime = 0;

// after updateRefereeState has run:
//   - previousStates.peek(0) is the state of the referee in the previous frame
//   - previousStates.peek(1) is the state of the referee in the current frame (== World.RefereeState)
let previousStates = new RingBuffer<World.RefereeStateType>(2, [World.RefereeState, World.RefereeState]);
let lastStateChange: number;

function updatePreviousStates() {
	previousStates.putOrReplace(World.RefereeState);
	if (previousStates.peek(0) !== World.RefereeState) {
		lastStateChange = World.Time;
	}
}

function updateLastStopTime(isLeavingStop: boolean) {
	if (isLeavingStop) {
		lastStopTime = World.Time;
	}
}

export function getLastStateChange(): number {
	return lastStateChange;
}

export function getLastStopTime(): number {
	return lastStopTime;
}

export function previousStateIfChanged(): World.RefereeStateType | undefined {
	return previousStates.peek(0) !== World.RefereeState ? previousStates.peek(0) : undefined;
}

export function _update() {
	updatePreviousStates();
	let leavingStop = previousStateIfChanged() === "Stop";
	updateLastStopTime(leavingStop);
}
