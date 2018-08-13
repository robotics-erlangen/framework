/*
// Referee utility functions
// module "Referee"
*/

/************************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier  *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, ||     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY || FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import {maxRobotRadius} from "../base/constants";
import * as vis from "../base/vis";
import * as World from "../base/world";
import {Vector, Position} from "../base/vector";
import {Robot} from "../base/robot";

export const enum RefereeState {
	Halt = "Halt",
	Stop = "Stop",
	Game = "Game",
	GameForce = "GameForce",

	KickoffFriendlyPrepare = "KickoffFriendlyPrepare",
    KickoffOffensive = "KickoffOffensive",
    PenaltyOffensivePrepare = "PenaltyOffensivePrepare",
    PenaltyOffensive = "PenaltyOffensive",
    DirectOffensive = "DirectOffensive",
    IndirectOffensive = "IndirectOffensive",
    BallPlacementOffensive = "BallPlacementOffensive",

    KickoffDefensivePrepare = "KickoffDefensivePrepare",
    KickoffDefensive = "KickoffDefensive",
    PenaltyDefensivePrepare = "PenaltyDefensivePrepare",
    PenaltyDefensive = "PenaltyDefensive",
    DirectDefensive = "DirectDefensive",
    IndirectDefensive = "IndirectDefensive",
    BallPlacementDefensive = "BallPlacementDefensive"
}

// states, in which we must keep a dist of 50cm
const stopStates: {[state: string]: boolean} = {
	Stop: true,
	KickoffDefensivePrepare: true,
	KickoffDefensive: true,
	DirectDefensive: true,
	IndirectDefensive: true,
	BallPlacementDefensive: true,
	BallPlacementOffensive: true
};

// states in which the maximum speed is 1.5 m/s
const slowDriveStates: {[state: string]: boolean} = {
	Stop: true,
	BallPlacementDefensive: true,
	BallPlacementOffensive: true
};

const friendlyFreeKickStates: {[state: string]: boolean} = {
	DirectOffensive: true,
	IndirectOffensive: true
};

const kickoffStates: {[state: string]: boolean} = {
	KickoffDefensivePrepare: true,
	KickoffDefensive: true,
	KickoffOffensivePrepare: true,
	KickoffOffensive: true
};

const opponentPenaltyStates: {[state: string]: boolean} = {
	PenaltyDefensivePrepare: true,
	PenaltyDefensive: true
};

const friendlyPenaltyStates: {[state: string]: boolean} = {
	PenaltyOffensivePrepare: true,
	PenaltyOffensive: true
};

const gameStates: {[state: string]: boolean} = {
	Game: true,
	GameForce: true
};

const nonGameStages: {[state: string]: boolean} = {
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

/// Check whether the stop rules apply
// @name isStopState
// @return boolean - True if the current referee state is considered as stop
export function isStopState (): boolean {
	return stopStates[World.RefereeState];
}

/// Check whether the robot has to drive a maximum of 1.5 m/s (slow)
// @name isSlowDriveState
// @return boolean - True if all robots have to drive slowly (< 1.5 m/s)
export function isSlowDriveState (): boolean {
	return slowDriveStates[World.RefereeState];
}

/// Check whether we have a freekick
// @name isFriendlyFreeKickState
// @return boolean - True if the current referee state is a freekick for us
export function isFriendlyFreeKickState (): boolean {
	return friendlyFreeKickStates[World.RefereeState];
}

/// Check whether this is a kickoff
// @name isKickoffState
// @return boolean - True if the current referee state is a kickoff
export function isKickoffState (): boolean {
	return kickoffStates[World.RefereeState];
}

/// Check whether the opponent has a penalty
// @name isOpponentPenaltyState
// @return boolean - True if the opponent has a penalty
export function isOpponentPenaltyState (): boolean {
	return opponentPenaltyStates[World.RefereeState];
}

export function isFriendlyPenaltyState (): boolean {
	return friendlyPenaltyStates[World.RefereeState];
}

export function isGameState (): boolean {
	return gameStates[World.RefereeState];
}

export function isNonGameStage (): boolean {
	return nonGameStages[World.GameStage];
}

let rightLine = World.Geometry.FieldWidthHalf;
let leftLine = -rightLine;
let goalLine = World.Geometry.FieldHeightHalf;
let cornerDist = 0.7; // some tolerance, rules say 10cm
/// Check whether there is a freekick in the opponent corner
// @name isOffensiveCornerKick
// @return boolean - True if a corner kick in the opponents corner
export function isOffensiveCornerKick (): boolean {
	let ballPos = World.Ball.pos;
	let refState = World.RefereeState;
	return (refState == RefereeState.DirectOffensive ||
			refState == RefereeState.IndirectOffensive)
		&&  goalLine - ballPos.y < cornerDist
 		&& (leftLine - ballPos.x > -cornerDist || rightLine - ballPos.x < cornerDist);
}

/// Check whether there is a freekick in our corner
// @name isDefensiveCornerKick
// @return boolean - True if a corner kick in our corner
export function isDefensiveCornerKick (): boolean {
	let ballPos = World.Ball.pos;
	let refState = World.RefereeState;
	return (refState == RefereeState.DirectDefensive || 
		refState == RefereeState.IndirectDefensive || refState == RefereeState.Stop)
		&&  -goalLine - ballPos.y > -cornerDist
 		&& (leftLine - ballPos.x > -cornerDist || rightLine - ballPos.x < cornerDist);
}

/// Draw areas forbidden by the current referee command
// @name illustrateRefereeStates
export function illustrateRefereeStates () {
	if (World.RefereeState == RefereeState.PenaltyDefensivePrepare  ||  World.RefereeState == RefereeState.PenaltyDefensive) {
		vis.addPath("penaltyDistanceAllowed", [new Vector(-2,World.Geometry.OwnPenaltyLine), new Vector(2,World.Geometry.OwnPenaltyLine)], vis.colors.red);
	} else if (World.RefereeState == RefereeState.PenaltyOffensivePrepare  ||  World.RefereeState == RefereeState.PenaltyOffensive) {
		vis.addPath("penaltyDistanceAllowed", [new Vector(-2,World.Geometry.PenaltyLine), new Vector(2,World.Geometry.PenaltyLine)], vis.colors.red);
	} else if (isStopState()) {
		vis.addCircle("stopstateBallDist", World.Ball.pos, 0.5, vis.colors.redHalf, true);
	}
}

let lastTeam = true; // true for the friendly team, false for the opponent
let lastRobot: Robot;
let lastTouchPos: Position;
let touchDist = World.Ball.radius + maxRobotRadius;
let fieldHeightHalf = World.Geometry.FieldHeightHalf;
let fieldWidthHalf = World.Geometry.FieldWidthHalf;
let noBallTouchStates: {[name: string]: boolean} = {
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

export function check () {
	checkTouching();
	checkStateChange();
}

let lastState: RefereeState;
let lastChangedTime: number;
export function checkStateChange () {
	if (World.RefereeState != lastState) {
		lastChangedTime = World.Time;
		lastState = <RefereeState>World.RefereeState;
	}
}

export function lastStateChangeTime () {
	return lastChangedTime;
}

/// Update the status of which team touched the ball last
// @name checkTouching
export function checkTouching () {
	let ballPos = World.Ball.pos;
	// only consider touches when playing
	if (noBallTouchStates[World.RefereeState]  ||
			Math.abs(ballPos.x) > fieldWidthHalf  ||  Math.abs(ballPos.y) > fieldHeightHalf) {
		return;
	}

	// pessimistic approach: when we are at the ball, our team is considered touching
	for (let robot of World.FriendlyRobots) {
		if (robot.pos.distanceTo(ballPos) <= touchDist) {
			lastTeam = true;
			lastRobot = robot;
			lastTouchPos = Vector.createReadOnly(ballPos.x, ballPos.y);
			return;
		}
	}
	for (let robot of World.OpponentRobots) {
		if (robot.pos.distanceTo(ballPos) <= touchDist) {
			lastTeam = false;
			lastRobot = robot;
			lastTouchPos = Vector.createReadOnly(ballPos.x, ballPos.y);
			return;
		}
	}
}

export function friendlyTouchedLast (): boolean {
	return lastTeam;
}

export function opponentTouchedLast (): boolean {
	return !friendlyTouchedLast();
}

export function robotAndPosOfLastBallTouch (): [Robot, Position] {
	return [lastRobot, lastTouchPos];
}