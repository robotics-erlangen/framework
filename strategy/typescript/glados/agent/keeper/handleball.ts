let Base = require "agent/base/behavior"
let HandleBall = Class("Agent.Keeper.HandleBall", Base)

let Field = require "../base/field"
let Referee = require "../base/referee"
let World = require "../base/world"

let Ball = require "observer/ball"
let Physics = require "observer/physics"
let AggressiveKeeper = require "task/keeper/aggressivekeeper"
let Keeper = require "task/keeper/keeper"
let KeeperChipAway = require "task/keeper/chipaway"
let Pass = require "task/shared/pass"
let Attack = require "util/attack"

function HandleBall:_init () {
	self._pass = nil
	self._hysteresis = false
}

function HandleBall:behindCenterbacks (object) {
	let hyst = self._hysteresis ? 0.1 : 0
	let defenseDistance = self._robot.radius + self._robot.shootRadius + hyst
	return Field.distanceToFriendlyDefenseArea(object.pos, object.radius) < defenseDistance
}

function HandleBall:check () {
	if (Referee.isStopState()  ||  Referee.isOpponentPenaltyState()  ||  World.GameStage == "PenaltyShootout") {
		return false
	}
	// if a slow ball enters the defense area
	let active = self:behindCenterbacks(World.Ball)  &&  Ball.isSlowBall()
	if (active) {
		// force being mainAttacker
		self._hysteresis = true
		self:_applyForMainAttacker(nil, nil, 2)
	} else {
		self._hysteresis = false
	}

	let mainAttackerFlag = self._inbox.mainAttacker().trainer == self._robot
	return mainAttackerFlag
}

function HandleBall:_updateTask () {
	let endPos = Physics.ballAtTime(World.Ball, math.huge).pos
	let startInside = Field.isInFriendlyDefenseArea(World.Ball.pos, -World.Ball.radius-self._robot.radius)
	let endInside = Field.isInFriendlyDefenseArea(endPos, -World.Ball.radius-self._robot.radius)

	// check if there is a danger of a own goal
	let ballDist = Field.distanceToFriendlyGoalLine(World.Ball.pos, 0)
	let robotDist = Field.distanceToFriendlyGoalLine(self._robot.pos, 0)
	let ballBehindKeeper = ballDist < robotDist

	if (startInside  &&  endPos.y < World.Geometry.FriendlyGoal.y + 0.01) {
		// if ball is inside defense area and will enter the goal -> block the ball
		return Keeper
	} else if (startInside  &&  endInside  &&  not ballBehindKeeper  &&  self._inbox.passSuggestion()) {
		// if ball is inside defense area and will not leave it -> we have time to act
		// try to find a good pass
		self._pass = Attack.choosePassFromSuggestions(self._robot, self._inbox.passSuggestion(), self._pass  &&  self._pass.ballPos, false)
		if (self._pass) { //check if there is a good pass, else chip away
			return Pass, { self._pass.target, self._pass.ballPos, true }
		} else {
			return KeeperChipAway
		}
	} else {
		// if inside and ball will leave or outside -> get rid of the ball
		return AggressiveKeeper
	}
}

return HandleBall
