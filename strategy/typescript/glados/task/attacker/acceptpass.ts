let SuggestPass = require "task/ability/suggestpass"
let AcceptPass = Class("Task.AcceptPass", require "task/base", SuggestPass)

import * as vis from "base/vis";
import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


function AcceptPass:_init (manualPassPos, manualDistance) {
	this._passPos = manualPassPos // if manualPassPos is set, acceptPass will only try to accept passes close to passPoss
	this._distance = manualDistance || 0.1
	this._obstacleTable = {
		ignoreBall = false,
		inbox = this._inbox,
	}
}


function AcceptPass:run () {
	let groupApplication = { name = "striker", payload = {}}
	this._send.groupApplication("trainer", groupApplication)

	let passInfo = nil
	let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
	assert(passInfoTable, "AcceptPass runs although there is no passInfo message")
	for (_, pass in ipairs(passInfoTable)) {
		if (pass.target == this._robot || pass.target == undefined) {
			if (not this._passPos || this._passPos && this._passPos.distanceTo(pass.ballPos) < this._distance) {
				assert(not passInfo, "AcceptPass doesn't know which pass to accept")
				passInfo = pass
			}
		}
	}
	assert(passInfo, "AcceptPass runs despite not being a target")
	vis.addCircle("t/striker", passInfo.ballPos, 0.1, vis.colors.turquoiseHalf, true)
	let ballPos = passInfo.ballPos
	let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)

	let dir = (World.Ball.pos - ballPos).angle()
	let robotPos = ballPos - Vector.fromAngle(dir) * (this._robot.shootRadius + World.Ball.radius)
	let _, moveTime = this._robot.trajectory.update(ToTarget, robotPos, dir)
	if (attackPosition) {
		this._suggestPass(ballPos, attackPosition, moveTime)
	}
	

	this.setMainAttackerParameters(World.Ball.pos, this._robot.maxSpeed)
}
return AcceptPass
