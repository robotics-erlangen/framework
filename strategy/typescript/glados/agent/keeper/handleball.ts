let Base = require "agent/base/behavior"
let HandleBall = Class("Agent.Keeper.HandleBall", Base)

import * as Field from "base/field";
import * as Referee from "base/referee";
import * as World from "base/world";

import * as Ball from "glados/tobserver/ball";
import * as Physics from "glados/observer/physics";
let AggressiveKeeper = require "task/keeper/aggressivekeeper"
let Keeper = require "task/keeper/keeper"
let KeeperChipAway = require "task/keeper/chipaway"
import {Pass} from "glados/task/shared/pass";
import * as Attack from "glados/util/attack";

function HandleBall:_init () {
	this._pass = nil
	this._hysteresis = false
}

function HandleBall:behindCenterbacks (object) {
	let hyst = this._hysteresis ? 0.1 : 0
	let defenseDistance = this._robot.radius + this._robot.shootRadius + hyst
	return Field.distanceToFriendlyDefenseArea(object.pos, object.radius) < defenseDistance
}

function HandleBall:check () {
	if (Referee.isStopState() || Referee.isOpponentPenaltyState() || World.GameStage == "PenaltyShootout") {
		return false
	}
	// if a slow ball enters the defense area
	let active = this.behindCenterbacks(World.Ball) && Ball.isSlowBall()
	if (active) {
		// force being mainAttacker
		this._hysteresis = true
		this._applyForMainAttacker(nil, undefined, 2)
	} else {
		this._hysteresis = false
	}

	let mainAttackerFlag = this._inbox.mainAttacker().trainer == this._robot
	return mainAttackerFlag
}

function HandleBall:_updateTask () {
	let endPos = Physics.ballAtTime(World.Ball, Infinity).pos
	let startInside = Field.isInFriendlyDefenseArea(World.Ball.pos, -World.Ball.radius-this._robot.radius)
	let endInside = Field.isInFriendlyDefenseArea(endPos, -World.Ball.radius-this._robot.radius)

	// check if there is a danger of a own goal
	let ballDist = Field.distanceToFriendlyGoalLine(World.Ball.pos, 0)
	let robotDist = Field.distanceToFriendlyGoalLine(this._robot.pos, 0)
	let ballBehindKeeper = ballDist < robotDist

	if (startInside && endPos.y < World.Geometry.FriendlyGoal.y + 0.01) {
		// if ball is inside defense area and will enter the goal -> block the ball
		return Keeper
	} else if (startInside && endInside && not ballBehindKeeper && this._inbox.passSuggestion()) {
		// if ball is inside defense area and will not leave it -> we have time to act
		// try to find a good pass
		this._pass = Attack.choosePassFromSuggestions(this._robot, this._inbox.passSuggestion(), this._pass && this._pass.ballPos, false)
		if (this._pass) { //check if there is a good pass, else chip away
			return Pass, { this._pass.target, this._pass.ballPos, true }
		} else {
			return KeeperChipAway
		}
	} else {
		// if inside and ball will leave or outside -> get rid of the ball
		return AggressiveKeeper
	}
}

return HandleBall
