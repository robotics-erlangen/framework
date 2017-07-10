local SuggestPass = require "task/ability/suggestpass"
local AcceptPass = Class("Task.AcceptPass", require "task/base", SuggestPass)

local vis = require "../base/vis"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

function AcceptPass:_init()
end

function AcceptPass:run()
	local groupApplication = { name = "striker", payload = {}}
	self._send.groupApplication("trainer", groupApplication)
	
	local passInfo = nil
	local _, passInfoTable = next(self._inbox.passInfo())
	assert(passInfoTable, "AcceptPass runs although there is no passInfo message")
	for _, pass in ipairs(passInfoTable) do
		if pass.target == self._robot or pass.target == nil then
			assert(not passInfo, "AcceptPass doesn't know which pass to accept")
			passInfo = pass
		end
	end
	assert(passInfo, "AcceptPass runs despite not being a target")
	vis.addCircle("t/striker", passInfo.ballPos, 0.1, vis.colors.turquoiseHalf, true)
	local position = passInfo.ballPos
	local _, attackPosition = next(self._inbox.attackPosition())
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	-- don't move between the ball and the main attacker
	-- relevant for incoming passes
	local mainAttacker = self._inbox.mainAttacker().trainer
	if mainAttacker then
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, mainAttacker.pos.x, mainAttacker.pos.y, 0.2)
	end
	local  _, moveTime = self._robot.trajectory:update(ToTarget, position, (World.Ball.pos - self._robot.pos):angle())
	if attackPosition then
		self:_suggestPass(position, attackPosition, moveTime)
	end

	self:setMainAttackerParameters(World.Ball.pos, self._robot.maxSpeed)
end
return AcceptPass
