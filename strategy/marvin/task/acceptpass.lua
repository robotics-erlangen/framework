local SuggestPass = require "task/ability/suggestpass"
local AcceptPass = Class("Task.AcceptPass", require "task/base", SuggestPass)

local vis = require "../base/vis"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

function AcceptPass:_init(manualPassPos, manualDistance)
	self._passPos = manualPassPos -- if manualPassPos is set, acceptPass will only try to accept passes close to passPoss
	self._distance = manualDistance or 0.1
end

function AcceptPass:run()
	local groupApplication = { name = "striker", payload = {}}
	self._send.groupApplication("trainer", groupApplication)
	
	local passInfo = nil
	local _, passInfoTable = next(self._inbox.passInfo())
	assert(passInfoTable, "AcceptPass runs although there is no passInfo message")
	for _, pass in ipairs(passInfoTable) do
		if pass.target == self._robot or pass.target == nil then
			if not self._passPos or self._passPos and self._passPos:distanceTo(pass.ballPos) < self._distance then
				assert(not passInfo, "AcceptPass doesn't know which pass to accept")
				passInfo = pass
			end
		end
	end
	assert(passInfo, "AcceptPass runs despite not being a target")
	vis.addCircle("t/striker", passInfo.ballPos, 0.1, vis.colors.turquoiseHalf, true)
	local ballPos = passInfo.ballPos
	local _, attackPosition = next(self._inbox.attackPosition())
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	local mainAttacker = self._inbox.mainAttacker().trainer
	local dangerPos = nil
	if mainAttacker then
		dangerPos = mainAttacker.pos
	end
	local dir = (World.Ball.pos - ballPos):angle()
	local robotPos = ballPos - Vector.fromAngle(dir) * (self._robot.shootRadius + World.Ball.radius)
	local _, moveTime = self._robot.trajectory:update(ToTarget, robotPos, dir)
	if attackPosition then
		dangerPos = attackPosition
		self:_suggestPass(ballPos, attackPosition, moveTime)
	end
	-- don't move between the ball and the main attacker
	-- relevant for incoming passes
	if dangerPos and dangerPos:distanceTo(World.Ball.pos) > 0.1 then
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, dangerPos.x, dangerPos.y, 0.2)
	end

	self:setMainAttackerParameters(World.Ball.pos, self._robot.maxSpeed)
end
return AcceptPass
