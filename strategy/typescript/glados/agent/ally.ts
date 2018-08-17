let Base = require "agent/base/agent"
let Ally = Class("Agent.Ally", Base)

let MixedTeam = require "+/base/mixedteam"
import * as vis from "base/vis";
import * as World from "base/world";

import * as Physics from "glados/observer/physics";

let PassSuggestion = require "task/ability/suggestpass"

Ally._behaviors = {}

let attackerAllies = {}
let defenderAllies = {}
function Ally.updateRoleNumbers (attackers, defenders) {
	return attackers-table.count(attackerAllies), defenders-table.count(defenderAllies)
}

function Ally:init (robot, messaging) {
	Base.init(self, robot, messaging)
	this._suggestPass = PassSuggestion._suggestPass // HACK
	this._noOppDisturbing = PassSuggestion._noOppDisturbing
}

// below this distance from dribbler to ball, an ally is considered mainAttacker


let MASTER = true
let ALLY_MAINATTACKER_DIST = MASTER ? 0 : 10
let MIN_DIST_FOR_PASS_POS = 0.2
let timeSentToPartnerTeam = 0 // messaging the allied team should only happen once per frame
function Ally:_run () {
	this._send.allyFlag("all")

	// send messages from own robots to partner team
	// should only be done once and if there is at least one ally
	if (timeSentToPartnerTeam != World.Time) {
		let mixedTeamMessage = {}
		let allies = this._inbox.allyFlag()
		for (name, func in pairs(this._inbox)) {
			if (name == "moveDest") {
				for (sender, msg in pairs(func())) {
					if (not allies[sender]) {
						if (not mixedTeamMessage[sender.id]) {
							mixedTeamMessage[sender.id] = {}
						}
						mixedTeamMessage[sender.id]["targetPos"] = msg
					}
				}
			} else if (name == "passInfo") {
				let sender, info = next(func())
				if (sender) {
					let pos = info.ballPos
					let receiver = info.target
					if (not mixedTeamMessage[receiver.id]) {
						mixedTeamMessage[receiver.id] = {}
					}
					mixedTeamMessage[receiver.id]["targetPos"] = pos
					mixedTeamMessage[receiver.id]["shootPos"] = pos
				}
			} else if (name == "attackPosition") {
				let sender, pos = next(func())
				if (sender) {
					if (not mixedTeamMessage[sender.id]) {
						mixedTeamMessage[sender.id] = {}
					}
					mixedTeamMessage[sender.id]["shootPos"] = pos
				}
			} else if (name == "attackerFlag") {
				for (sender, _ in pairs(func())) {
					if (not allies[sender]) {
						if (not mixedTeamMessage[sender.id]) {
							mixedTeamMessage[sender.id] = {}
						}
						mixedTeamMessage[sender.id]["role"] = "Offense"
					}
				}
			} else if (name == "defenderFlag") {
				for (sender, _ in pairs(func())) {
					if (not allies[sender]) {
						if (not mixedTeamMessage[sender.id]) {
							mixedTeamMessage[sender.id] = {}
						}
						mixedTeamMessage[sender.id]["role"] = "Defense"
					}
				}
			}
		}
		if (World.FriendlyKeeper && not allies[World.FriendlyKeeper]) {
			if (not mixedTeamMessage[World.FriendlyKeeper.id]) {
				mixedTeamMessage[World.FriendlyKeeper.id] = {}
			}
			mixedTeamMessage[World.FriendlyKeeper.id]["role"] = "Goalie"
		}
		MixedTeam.sendInfo(mixedTeamMessage)
		timeSentToPartnerTeam = World.Time
	}

	// send messages from partner team to own robots
	let allyMessages = World.MixedTeam ? World.MixedTeam[this._robot.id] : {}
	for (msgType, msg in pairs(allyMessages)) {
		if (msgType == "role") {
			if (msg == "Offense") {
				this._send.attackerFlag("all")
				this._suggestPassRobotPosition(this._robot.pos)
				attackerAllies[this._robot] = true
				defenderAllies[this._robot] = nil
			} else if (msg == "Defense") {
				this._send.defenderFlag("all")
				attackerAllies[this._robot] = nil
				defenderAllies[this._robot] = true
			} else {
				attackerAllies[this._robot] = nil
				defenderAllies[this._robot] = nil
			}
		} else if (msgType == "targetPos") {
			vis.addPath("MoveTo", {this._robot.pos, msg}, vis.colors.whiteHalf)
			vis.addCircle("MoveTo", msg, 0.15, vis.colors.orangeHalf, true)
			this._send.moveDest("all", msg)
		} else if (msgType == "shootPos") {
			let passPosSent = false
			for (robot, _ in pairs(this._inbox.attackerFlag())) {
				if (robot.pos.distanceTo(msg) < MIN_DIST_FOR_PASS_POS) {
					vis.addCircle("a/ally/passpos", msg, 0.15, vis.colors.redHalf, true)
					this._send.passInfo("all", { target = robot, ballPos = msg })
					passPosSent = true
					break
				}
			}
			if (not passPosSent) {
				vis.addCircle("a/ally/attackposition", msg, 0.15, vis.colors.magentaHalf, true)
				this._send.attackPosition("all", msg)
				this._send.attackTime("all", World.Time + Physics.robotTimeToPos(this._robot, msg, new Vector(0, 0)))
			}
		}
	}

	// mainAttacker application
	let ballPos = World.Ball.pos
	let dirVector = Vector.fromAngle(this._robot.dir)
	let dribblerPos = this._robot.pos + dirVector*this._robot.shootRadius
	let ballDist = dribblerPos.distanceTo(ballPos)
	if (ballDist < ALLY_MAINATTACKER_DIST && World.Ball.speed.length() < 1) {
		for (let robot of World.FriendlyRobots) {
			if (robot != this._robot && robot.pos.distanceTo(World.Ball.pos) < 0.15) {
				return // no application if someone already has the ball
			}
		}
		this._send.exclusiveRole("trainer", {mainAttacker = 2})
	}
}

let robotsDefinitelyInOurTeam = {
	// in case of radio problems, list ids here in format id = true
}

function Ally.takeRobot (robots) {
	for (let robot of robots) {
		if (robot.isVisible && robot.generation == robot.ALLY_GENERATION_ID
				 &&  not robotsDefinitelyInOurTeam[robot.id]) {
			return robot
		}
	}
}

function Ally:keepRobot () {
	return this._robot.isVisible && this._robot.generation == this._robot.ALLY_GENERATION_ID
		 &&  not this._robot.userControl
		 &&  not robotsDefinitelyInOurTeam[this._robot.id]
}

function Ally:rateRobot () {
	return 0
}

return Ally
