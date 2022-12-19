/**
 * @module referee
 * Referee utility functions
 */

/**************************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier  *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import { maxRobotRadius } from "base/constants";
import { Robot } from "base/robot";
import { AbsTime } from "base/timing";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

// states, in which we must keep a dist of 50cm
const stopStates: { [state: string]: boolean } = {
	Stop: true,
	KickoffDefensivePrepare: true,
	KickoffDefensive: true,
	DirectDefensive: true,
	IndirectDefensive: true,
	BallPlacementDefensive: true,
	BallPlacementOffensive: true
};

// states in which the maximum speed is 1.5 m/s
const slowDriveStates: { [state: string]: boolean } = {
	Stop: true
};

const friendlyFreeKickStates: { [state: string]: boolean } = {
	DirectOffensive: true,
	IndirectOffensive: true
};

const opponentFreeKickStates: { [state: string]: boolean } = {
	DirectDefensive: true,
	IndirectDefensive: true
};

const friendlyKickoffStates: { [state: string]: boolean } = {
	KickoffOffensivePrepare: true,
	KickoffOffensive: true
};

const opponentKickoffStates: { [state: string]: boolean } = {
	KickoffDefensivePrepare: true,
	KickoffDefensive: true
};

const opponentPenaltyStates: { [state: string]: boolean } = {
	PenaltyDefensivePrepare: true,
	PenaltyDefensive: true,
	PenaltyDefensiveRunning: true
};

const friendlyPenaltyStates: { [state: string]: boolean } = {
	PenaltyOffensivePrepare: true,
	PenaltyOffensive: true,
	PenaltyOffensiveRunning: true
};

const gameStates: { [state: string]: boolean } = {
	Game: true,
	GameForce: true
};

const nonGameStages: { [state: string]: boolean } = {
	FirstHalfPre: true,
	HalfTime: true,
	SecondHalfPre: true,
	ExtraTimeBreak: true,
	ExtraFirstHalfPre: true,
	ExtraHalfTime: true,
	ExtraSecondHalfPre: true,
	PenaltyShootoutBreak: true,
	PostGame: true
};

/**
 * Check whether the stop rules apply
 * @returns True if the current referee state is considered as stop
 */
export function isStopState(state = World.RefereeState): boolean {
	return stopStates[state];
}

/**
 * Check whether the robot has to drive a maximum of 1.5 m/s (slow)
 * @returns True if all robots have to drive slowly (< 1.5 m/s)
 */
export function isSlowDriveState(state = World.RefereeState): boolean {
	return slowDriveStates[state];
}

/**
 * Check whether we have a freekick
 * @returns True if the current referee state is a freekick for us
 */
export function isFriendlyFreeKickState(state = World.RefereeState): boolean {
	return friendlyFreeKickStates[state];
}

/**
 * Check whether the opponent has a freekick
 * @returns true if the current referee state is an freekick for the opponent
 */
export function isOpponentFreeKickState(state = World.RefereeState): boolean {
	return opponentFreeKickStates[state];
}

/**
 * Check whether this is a friendly kickoff
 * @returns true if the current referee state is a friendly kickoff
 */
export function isFriendlyKickoffState(state = World.RefereeState): boolean {
	return friendlyKickoffStates[state];
}

/**
 * Check whether this is an opponent kickoff
 * @returns true if the current referee state is an opponent kickoff
 */
export function isOpponentKickoffState(state = World.RefereeState): boolean {
	return opponentKickoffStates[state];
}

/**
 * Check whether this is a kickoff
 * @returns True if the current referee state is a kickoff
 */
export function isKickoffState(state = World.RefereeState): boolean {
	return isFriendlyKickoffState(state) || isOpponentKickoffState(state);
}

/**
 * Check whether the opponent has a penalty
 * @returns True if the opponent has a penalty
 */
export function isOpponentPenaltyState(state = World.RefereeState): boolean {
	return opponentPenaltyStates[state];
}

export function isFriendlyPenaltyState(state = World.RefereeState): boolean {
	return friendlyPenaltyStates[state];
}

export function isGameState(state = World.RefereeState): boolean {
	return gameStates[state];
}

export function isNonGameStage(): boolean {
	return nonGameStages[World.GameStage];
}

let rightLine = World.Geometry.FieldWidthHalf;
let leftLine = -rightLine;
let goalLine = World.Geometry.FieldHeightHalf;
let cornerDist = 0.7; // some tolerance, rules say 10cm

/**
 * Check whether there is a freekick in the opponent corner
 * @returns True if a corner kick in the opponents corner
 */
export function isOffensiveCornerKick(): boolean {
	let ballPos = World.Ball.pos;
	let refState = World.RefereeState;
	return (refState === "DirectOffensive" ||
			refState === "IndirectOffensive")
		&& goalLine - ballPos.y < cornerDist
		&& (leftLine - ballPos.x > -cornerDist || rightLine - ballPos.x < cornerDist);
}

/**
 * Check whether there is a freekick in our corner
 * @returns True if a corner kick in our corner
 */
export function isDefensiveCornerKick(): boolean {
	let ballPos = World.Ball.pos;
	let refState = World.RefereeState;
	return (refState === "DirectDefensive" ||
		refState === "IndirectDefensive" || refState === "Stop")
		&& -goalLine - ballPos.y > -cornerDist
		&& (leftLine - ballPos.x > -cornerDist || rightLine - ballPos.x < cornerDist);
}

/** Draw areas forbidden by the current referee command */
export function illustrateRefereeStates() {
	if (World.RefereeState === "PenaltyDefensivePrepare" || World.RefereeState === "PenaltyDefensive") {
		vis.addPath("penaltyDistanceAllowed", [new Vector(-2, World.Geometry.OwnPenaltyLine), new Vector(2, World.Geometry.OwnPenaltyLine)], vis.colors.red);
	} else if (World.RefereeState === "PenaltyOffensivePrepare" || World.RefereeState === "PenaltyOffensive") {
		vis.addPath("penaltyDistanceAllowed", [new Vector(-2, World.Geometry.PenaltyLine), new Vector(2, World.Geometry.PenaltyLine)], vis.colors.red);
	} else if (isStopState()) {
		vis.addCircle("stopstateBallDist", World.Ball.pos, 0.5, vis.colors.redHalf, true);
	}
}

let couldStillBeFreekick = false;
export function isPlausiblyStillOppFreekick(): boolean {
	return couldStillBeFreekick;
}

let posInFreekick: Position | undefined;
let freekickStartTime = World.Time;
function updateStillFreekick() {
	if ((isOpponentFreeKickState() || isOpponentKickoffState()) && !posInFreekick) {
		posInFreekick = World.Ball.pos;
		freekickStartTime = World.Time;
	}
	const maxFreekickTime = World.DIVISION === "A" ? 5 : 10;
	if (!isGameState() && !isOpponentFreeKickState() &&
			!isOpponentKickoffState()) {
		couldStillBeFreekick = false;
	} else if (World.Time - freekickStartTime > maxFreekickTime) {
		couldStillBeFreekick = false;
		posInFreekick = undefined;
	} else if (posInFreekick) {
		// same as in amun/processor/referee
		const maxDist = 0.1;
		couldStillBeFreekick = World.Ball.pos.distanceToSq(posInFreekick) < maxDist * maxDist;
	} else {
		couldStillBeFreekick = false;
	}
}

let lastTeam = true; // true for the friendly team, false for the opponent
let lastRobot: Robot;
let lastTouchPos: Position;
let touchDist = World.Ball.radius + maxRobotRadius;
let fieldHeightHalf = World.Geometry.FieldHeightHalf;
let fieldWidthHalf = World.Geometry.FieldWidthHalf;
let noBallTouchStates: { [name: string]: boolean } = {
	Halt: true,
	Stop: true,
	KickoffOffensivePrepare: true,
	KickoffDefensivePrepare: true,
	PenaltyOffensivePrepare: true,
	PenaltyDefensivePrepare: true,
	TimeoutOffensive: true,
	TimeoutDefensive: true,
	BallPlacementDefensive: true,
	BallPlacementOffensive: true
};

export function check() {
	checkTouching();
	checkStateChange();
	updateStillFreekick();
}

let lastState: World.RefereeStateType;
let lastChangedTime: AbsTime;
export function checkStateChange() {
	if (World.RefereeState !== lastState) {
		lastChangedTime = World.Time;
		lastState = World.RefereeState;
	}
}

export function lastStateChangeTime(): AbsTime {
	return lastChangedTime;
}

/** Update the status of which team touched the ball last */
let lastFlightTime = 0;
export function checkTouching() {
	let ballPos = World.Ball.pos;
	// only consider touches when playing
	if (noBallTouchStates[World.RefereeState] ||
			Math.abs(ballPos.x) > fieldWidthHalf || Math.abs(ballPos.y) > fieldHeightHalf) {
		return;
	}

	if (World.Ball.posZ !== 0) {
		lastFlightTime = World.Time;
		return;
	}
	// add an additional time after a chip detection, since it can sometimes flicker
	if (World.Time - lastFlightTime < 0.1) {
		return;
	}

	// pessimistic approach: when we are at the ball, our team is considered touching
	for (let robot of World.FriendlyRobots) {
		if (robot.pos.distanceTo(ballPos) <= touchDist) {
			lastTeam = true;
			lastRobot = robot;
			lastTouchPos = new Vector(ballPos.x, ballPos.y);
			return;
		}
	}
	for (let robot of World.OpponentRobots) {
		if (robot.pos.distanceTo(ballPos) <= touchDist) {
			lastTeam = false;
			lastRobot = robot;
			lastTouchPos = new Vector(ballPos.x, ballPos.y);
			return;
		}
	}
}

export function friendlyTouchedLast(): boolean {
	return lastTeam;
}

export function opponentTouchedLast(): boolean {
	return !friendlyTouchedLast();
}

export function robotAndPosOfLastBallTouch(): [Robot, Position] {
	return [lastRobot, lastTouchPos];
}

export function hasTooManyFriendlyRobots(): boolean {
	return World.FriendlyRobots.length > World.MaxAllowedFriendlyRobots;
}

export function hasTooManyOpponentRobots(): boolean {
	return World.OpponentRobots.length > World.MaxAllowedOpponentRobots;
}
