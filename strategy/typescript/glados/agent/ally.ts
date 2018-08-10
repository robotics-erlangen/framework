let Base = require "agent/base/agent"
let Ally = Class("Agent.Ally", Base)

let MixedTeam = require "../base/mixedteam"
let vis = require "../base/vis"
let World = require "../base/world"

let Physics = require "observer/physics"

let PassSuggestion = require "task/ability/suggestpass"

Ally._behaviors = {}

let attackerAllies = {}
let defenderAllies = {}
function Ally.updateRoleNumbers (attackers, defenders) {
	return attackers-table.count(attackerAllies), defenders-table.count(defenderAllies)
}

function Ally:init (robot, messaging) {
	Base.init(self, robot, messaging)
	self._suggestPass = PassSuggestion._suggestPass // HACK
	self._noOppDisturbing = PassSuggestion._noOppDisturbing
}

// below this distance from dribbler to ball, an ally is considered mainAttacker


let MASTER = true
let ALLY_MAINATTACKER_DIST = MASTER ? 0 : 10
let MIN_DIST_FOR_PASS_POS = 0.2
let timeSentToPartnerTeam = 0 // messaging the allied team should only happen once per frame
function Ally:_run () {
	self._send.allyFlag("all")

	// send messages from own robots to partner team
	// should only be done once and if there is at least one ally
	if (timeSentToPartnerTeam != World.Time) {
		let mixedTeamMessage = {}
		let allies = self._inbox.allyFlag()
		for (name, func in pairs(self._inbox)) {
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
		if (World.FriendlyKeeper  &&  not allies[World.FriendlyKeeper]) {
			if (not mixedTeamMessage[World.FriendlyKeeper.id]) {
				mixedTeamMessage[World.FriendlyKeeper.id] = {}
			}
			mixedTeamMessage[World.FriendlyKeeper.id]["role"] = "Goalie"
		}
		MixedTeam.sendInfo(mixedTeamMessage)
		timeSentToPartnerTeam = World.Time
	}

	// send messages from partner team to own robots
	let allyMessages = World.MixedTeam ? World.MixedTeam[self._robot.id] : {}
	for (msgType, msg in pairs(allyMessages)) {
		if (msgType == "role") {
			if (msg == "Offense") {
				self._send.attackerFlag("all")
				self:_suggestPassRobotPosition(self._robot.pos)
				attackerAllies[self._robot] = true
				defenderAllies[self._robot] = nil
			} else if (msg == "Defense") {
				self._send.defenderFlag("all")
				attackerAllies[self._robot] = nil
				defenderAllies[self._robot] = true
			} else {
				attackerAllies[self._robot] = nil
				defenderAllies[self._robot] = nil
			}
		} else if (msgType == "targetPos") {
			vis.addPath("MoveTo", {self._robot.pos, msg}, vis.colors.whiteHalf)
			vis.addCircle("MoveTo", msg, 0.15, vis.colors.orangeHalf, true)
			self._send.moveDest("all", msg)
		} else if (msgType == "shootPos") {
			let passPosSent = false
			for (robot, _ in pairs(self._inbox.attackerFlag())) {
				if (robot.pos:distanceTo(msg) < MIN_DIST_FOR_PASS_POS) {
					vis.addCircle("a/ally/passpos", msg, 0.15, vis.colors.redHalf, true)
					self._send.passInfo("all", { target = robot, ballPos = msg })
					passPosSent = true
					break
				}
			}
			if (not passPosSent) {
				vis.addCircle("a/ally/attackposition", msg, 0.15, vis.colors.magentaHalf, true)
				self._send.attackPosition("all", msg)
				self._send.attackTime("all", World.Time + Physics.robotTimeToPos(self._robot, msg, Vector(0, 0)))
			}
		}
	}

	// mainAttacker application
	let ballPos = World.Ball.pos
	let dirVector = Vector.fromAngle(self._robot.dir)
	let dribblerPos = self._robot.pos + dirVector*self._robot.shootRadius
	let ballDist = dribblerPos:distanceTo(ballPos)
	if (ballDist < ALLY_MAINATTACKER_DIST  &&  World.Ball.speed:length() < 1) {
		for (_, robot in ipairs(World.FriendlyRobots)) {
			if (robot != self._robot  &&  robot.pos:distanceTo(World.Ball.pos) < 0.15) {
				return // no application if someone already has the ball
			}
		}
		self._send.exclusiveRole("trainer", {mainAttacker = 2})
	}
}

let robotsDefinitelyInOurTeam = {
	// in case of radio problems, list ids here in format id = true
}

function Ally.takeRobot (robots) {
	for (_, robot in ipairs(robots)) {
		if (robot.isVisible  &&  robot.generation == robot.ALLY_GENERATION_ID
				 &&  not robotsDefinitelyInOurTeam[robot.id]) {
			return robot
		}
	}
}

function Ally:keepRobot () {
	return self._robot.isVisible  &&  self._robot.generation == self._robot.ALLY_GENERATION_ID
		 &&  not self._robot.userControl
		 &&  not robotsDefinitelyInOurTeam[self._robot.id]
}

function Ally:rateRobot () {
	return 0
}

return Ally
