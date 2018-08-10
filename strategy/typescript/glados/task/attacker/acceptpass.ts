let SuggestPass = require "task/ability/suggestpass"
let AcceptPass = Class("Task.AcceptPass", require "task/base", SuggestPass)

let vis = require "../base/vis"
let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"


function AcceptPass:_init (manualPassPos, manualDistance) {
	self._passPos = manualPassPos // if manualPassPos is set, acceptPass will only try to accept passes close to passPoss
	self._distance = manualDistance  ||  0.1
	self._obstacleTable = {
		ignoreBall = false,
		inbox = self._inbox,
	}
}


function AcceptPass:run () {
	let groupApplication = { name = "striker", payload = {}}
	self._send.groupApplication("trainer", groupApplication)

	let passInfo = nil
	let _, passInfoTable = next(self._inbox.passInfo())
	assert(passInfoTable, "AcceptPass runs although there is no passInfo message")
	for (_, pass in ipairs(passInfoTable)) {
		if (pass.target == self._robot  ||  pass.target == nil) {
			if (not self._passPos  ||  self._passPos  &&  self._passPos:distanceTo(pass.ballPos) < self._distance) {
				assert(not passInfo, "AcceptPass doesn't know which pass to accept")
				passInfo = pass
			}
		}
	}
	assert(passInfo, "AcceptPass runs despite not being a target")
	vis.addCircle("t/striker", passInfo.ballPos, 0.1, vis.colors.turquoiseHalf, true)
	let ballPos = passInfo.ballPos
	let _, attackPosition = next(self._inbox.attackPosition())
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	let dir = (World.Ball.pos - ballPos):angle()
	let robotPos = ballPos - Vector.fromAngle(dir) * (self._robot.shootRadius + World.Ball.radius)
	let _, moveTime = self._robot.trajectory:update(ToTarget, robotPos, dir)
	if (attackPosition) {
		self:_suggestPass(ballPos, attackPosition, moveTime)
	}
	

	self:setMainAttackerParameters(World.Ball.pos, self._robot.maxSpeed)
}
return AcceptPass
