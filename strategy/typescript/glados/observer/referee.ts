import { log } from "base/amun";
import * as Field from "base/field";
import * as BaseRef from "base/referee";
import { Position, Speed } from "base/vector";
import * as World from "base/world";

import * as Error from "glados/observer/error";

let G = World.Geometry;

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
	if (World.OpponentRobots.length <= 11 - World.OpponentYellowCards.length - World.OpponentRedCards) {
		cntO = 0;
	} else if (World.RefereeState !== "Stop" && World.Time - Error.getLastRefChange() > 0.5) {
		cntO = cntO + 1;
	}
	if (cntO % 1000 === 1) {
		log("Warning: More Enemies than allowed by the refbox, check Referee");
	}

	// assumes that there is only one yellow card that is not beeing played
	if (cntO > 50) {
		return Math.min(0, World.OpponentYellowCards.length + World.OpponentRedCards - 1);
	}
	return World.OpponentYellowCards.length + World.OpponentRedCards;

}
