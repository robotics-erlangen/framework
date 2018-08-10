
///// Referee utility functions
//module "Referee"
////

//***********************************************************************
//*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier  *
//*   Robotics Erlangen e.V.                                                *
//*   http://www.robotics-erlangen.de/                                      *
//*   info@robotics-erlangen.de                                             *
//*                                                                         *
//*   This program is free software: you can redistribute it and/or modify  *
//*   it under the terms of the GNU General Public License as published by  *
//*   the Free Software Foundation, either version 3 of the License, or     *
//*   any later version.                                                    *
//*                                                                         *
//*   This program is distributed in the hope that it will be useful,       *
//*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
//*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
//*   GNU General Public License for more details.                          *
//*                                                                         *
//*   You should have received a copy of the GNU General Public License     *
//*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
//*************************************************************************

let Referee = {}

let robotRadius = (require "../base/constants").maxRobotRadius // avoid table lookups for speed reasons
let vis = require "../base/vis"
let World = require "../base/world"


// states, in which we must keep a dist of 50cm
let stopStates = {
	Stop = true,
	KickoffDefensivePrepare = true,
	KickoffDefensive = true,
	DirectDefensive = true,
	IndirectDefensive = true,
	BallPlacementDefensive = true,
	BallPlacementOffensive = true
}

// states in which the maximum speed is 1.5 m/s
let slowDriveStates = {
	Stop = true,
	BallPlacementDefensive = true,
	BallPlacementOffensive = true
}

let friendlyFreeKickStates = {
	DirectOffensive = true,
	IndirectOffensive = true
}

let kickoffStates = {
	KickoffDefensivePrepare = true,
	KickoffDefensive = true,
	KickoffOffensivePrepare = true,
	KickoffOffensive = true
}

let opponentPenaltyStates = {
	PenaltyDefensivePrepare = true,
	PenaltyDefensive = true
}

let friendlyPenaltyStates = {
	PenaltyOffensivePrepare = true,
	PenaltyOffensive = true
}

let gameStates = {
	Game = true,
	GameForce = true
}

let nonGameStages = {
	FirstHalfPre = true,
	HalfTime = true,
	SecondHalfPre = true,
	ExtraTimeBreak = true,
	ExtraFirstHalfPre = true,
	ExtraHalfTime = true,
	ExtraSecondHalfPre = true,
	PenaltyShootoutBreak = true,
	PostGame = true
}

/// Check whether the stop rules apply
// @name isStopState
// @return boolean - True if the current referee state is considered as stop
function Referee.isStopState () {
	return stopStates[World.RefereeState]
}

/// Check whether the robot has to drive a maximum of 1.5 m/s (slow)
// @name isSlowDriveState
// @return boolean - True if all robots have to drive slowly (< 1.5 m/s)
function Referee.isSlowDriveState () {
	return slowDriveStates[World.RefereeState]
}

/// Check whether we have a freekick
// @name isFriendlyFreeKickState
// @return boolean - True if the current referee state is a freekick for us
function Referee.isFriendlyFreeKickState () {
	return friendlyFreeKickStates[World.RefereeState]
}

/// Check whether this is a kickoff
// @name isKickoffState
// @return boolean - True if the current referee state is a kickoff
function Referee.isKickoffState () {
	return kickoffStates[World.RefereeState]
}

/// Check whether the opponent has a penalty
// @name isOpponentPenaltyState
// @return boolean - True if the opponent has a penalty
function Referee.isOpponentPenaltyState () {
	return opponentPenaltyStates[World.RefereeState]
}

function Referee.isFriendlyPenaltyState () {
	return friendlyPenaltyStates[World.RefereeState]
}

function Referee.isGameState () {
	return gameStates[World.RefereeState]
}

function Referee.isNonGameStage () {
	return nonGameStages[World.GameStage]
}

let rightLine = World.Geometry.FieldWidthHalf
let leftLine = -rightLine
let goalLine = World.Geometry.FieldHeightHalf
let cornerDist = 0.7 // some tolerance, rules say 10cm
/// Check whether there is a freekick in the opponent corner
// @name isOffensiveCornerKick
// @return boolean - True if a corner kick in the opponents corner
function Referee.isOffensiveCornerKick () {
	let ballPos = World.Ball.pos
	let refState = World.RefereeState
	return (refState == "DirectOffensive"  ||  refState == "IndirectOffensive")
		 &&  goalLine - ballPos.y < cornerDist
 ? (leftLine - ballPos.x > -cornerDist : rightLine - ballPos.x < cornerDist)
}

/// Check whether there is a freekick in our corner
// @name isDefensiveCornerKick
// @return boolean - True if a corner kick in our corner
function Referee.isDefensiveCornerKick () {
	let ballPos = World.Ball.pos
	let refState = World.RefereeState
	return (refState == "DirectDefensive"  ||  refState == "IndirectDefensive"  ||  refState == "Stop")
		 &&  -goalLine - ballPos.y > -cornerDist
 ? (leftLine - ballPos.x > -cornerDist : rightLine - ballPos.x < cornerDist)
}

/// Draw areas forbidden by the current referee command
// @name illustrateRefereeStates
function Referee.illustrateRefereeStates () {
	if (World.RefereeState == "PenaltyDefensivePrepare"  ||  World.RefereeState == "PenaltyDefensive") {
		vis.addPath("penaltyDistanceAllowed", {Vector(-2,World.Geometry.OwnPenaltyLine), Vector(2,World.Geometry.OwnPenaltyLine)}, vis.colors.red)
	} else if (World.RefereeState == "PenaltyOffensivePrepare"  ||  World.RefereeState == "PenaltyOffensive") {
		vis.addPath("penaltyDistanceAllowed", {Vector(-2,World.Geometry.PenaltyLine), Vector(2,World.Geometry.PenaltyLine)}, vis.colors.red)
	} else if (Referee.isStopState()) {
		vis.addCircle("stopstateBallDist", World.Ball.pos, 0.5, vis.colors.redHalf, true)
	}
}

let lastTeam = true // true for the friendly team, false for the opponent
let lastRobot, lastTouchPos
let touchDist = World.Ball.radius+robotRadius
let fieldHeightHalf = World.Geometry.FieldHeightHalf
let fieldWidthHalf = World.Geometry.FieldWidthHalf
let noBallTouchStates = {
	Halt = true,
	Stop = true,
	KickoffOffensivePrepare = true,
	KickoffDefensivePrepare = true,
	PenaltyOffensivePrepare = true,
	PenaltyDefensivePrepare = true,
	TimeoutOffensive = true,
	TimeoutDefensive = true,
	BallPlacementDefensive = true,
	BallPlacementOffensive = true
}

function Referee.check () {
	Referee.checkTouching()
	Referee.checkStateChange()
}

let lastState
let lastChangedTime
function Referee.checkStateChange () {
	if (World.RefereeState != lastState) {
		lastChangedTime = World.Time
		lastState = World.RefereeState
	}
}

function Referee.lastStateChangeTime () {
	return lastChangedTime
}

/// Update the status of which team touched the ball last
// @name checkTouching
function Referee.checkTouching () {
	let ballPos = World.Ball.pos
	// only consider touches when playing
	if (noBallTouchStates[World.RefereeState]  ||
			math.abs(ballPos.x) > fieldWidthHalf  ||  math.abs(ballPos.y) > fieldHeightHalf) {
		return
	}

	// pessimistic approach: when we are at the ball, our team is considered touching
	for (_, robot in ipairs(World.FriendlyRobots)) {
		if (robot.pos:distanceTo(ballPos) <= touchDist) {
			lastTeam = true
			lastRobot = robot
			lastTouchPos = Vector.createReadOnly(ballPos.x, ballPos.y)
			return
		}
	}
	for (_, robot in ipairs(World.OpponentRobots)) {
		if (robot.pos:distanceTo(ballPos) <= touchDist) {
			lastTeam = false
			lastRobot = robot
			lastTouchPos = Vector.createReadOnly(ballPos.x, ballPos.y)
			return
		}
	}
}

function Referee.friendlyTouchedLast () {
	return lastTeam
}
function Referee.opponentTouchedLast () {
	return not Referee.friendlyTouchedLast()
}

function Referee.robotAndPosOfLastBallTouch () {
	return lastRobot, lastTouchPos
}

return Referee
