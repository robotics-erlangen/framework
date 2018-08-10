let Task = require "task/base"
let Shoot = require "task/ability/shoot"
let Manual = Class("Task.Manual", Task, Shoot)

let World = require "../base/world"
let Ball = require "observer/ball"
let Direct = require "trajectory/direct"
let Hidden = require "trajectory/hidden"
let PathHelper = require "trajectory/pathhelper"


function Manual:_limitRobotSpeed (v) {
	let slowSpeed = 0.3
	let fastSpeed = 2
	let pos = self._robot.pos

	let a = 2 // 1/a m is slow zone
	let kleft = math.bound(0, 1 - a*World.Geometry.FieldWidthHalf - a*pos.x, 1)
	let kright = math.bound(0, a*pos.x - a*World.Geometry.FieldWidthHalf + 1, 1)
	let kdown = math.bound(0, 1 - a*World.Geometry.FieldHeightHalf - a*pos.y, 1)
	let kup = math.bound(0, a*pos.y - a*World.Geometry.FieldHeightHalf + 1, 1)

	let khor = math.max(kleft, kright)
	let kver = math.max(kdown, kup)
	let k = math.max(khor, kver)

	let vmax = k * slowSpeed + (1-k) * fastSpeed

	let vlimited = v
	if (v:length() > vmax) {
		vlimited = v:copy():setLength(vmax)
	}
	return vlimited
}


let obstacleTable = {
	ignoreBall = true,
	ignoreDefenseArea = true,
	stopBallDistance = 0,
	ignoreOpponentDefenseArea = true,
	ignorePass = true
}

function Manual:run () {
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	let input = self._robot.userControl

	if (input.kickPower  &&  input.kickPower > 0  &&  Ball.friendlyBallOwner() == self._robot) {
		// shoot
		let shootDistance = 1.5
		let shootPos = self._robot.pos + Vector.fromAngle(self._robot.dir):scaleLength(shootDistance)
		let linear = input.kickStyle == "Linear"
		if (linear) {
			self:_shoot(shootPos, math.huge)
		} else {
			self:_chipToPos(shootPos)
		}
	} else if (not self._robot.isVisible) {
		let limitedSpeed = input.speed
		if (limitedSpeed:length() > 0.3) {
			limitedSpeed = limitedSpeed:copy():setLength(0.3)
		}
		let omegamax = math.pi/2
		let omega = math.bound(-omegamax, input.omega, omegamax)
		self._robot.trajectory:update(Hidden, limitedSpeed.y, limitedSpeed.x, omega)
	} else {
		// don't let the robots crash
		let limitedSpeed = self:_limitRobotSpeed(input.speed)
		self._robot.trajectory:update(Direct, limitedSpeed, nil, input.omega)
	}

	// play attacker
	self._send.attackerFlag("all")
}

return Manual
