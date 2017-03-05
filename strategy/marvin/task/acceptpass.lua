local SuggestPass = require "task/ability/suggestpass"
local AcceptPass = Class("Task/AcceptPass", require "task/base", SuggestPass)

local vis = require "../base/vis"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

function AcceptPass:_init()
end

function AcceptPass:run()
	local groupApplication = { name = "striker", payload = {}} 
	self._send.groupApplication("trainer", groupApplication)
	
	local _, passInfo = next(self._inbox.passInfo())
	vis.addCircle("t/striker", passInfo.ballPos, 0.1, vis.colors.turquoiseHalf, true)
	local position = passInfo.ballPos
	local moveTime = nil
	local _, attackPosition = next(self._inbox.attackPosition())
	PathHelper.setDefaultObstacles(self._robot.path, self._robot) 
	PathHelper.addRobotObstacles(self._robot.path, self._robot) 

	-- don't move between the ball and the main attacker
	-- relevant for incoming passes
	local mainAttacker = self._inbox.mainAttacker().trainer
	if mainAttacker then
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, mainAttacker.pos.x, mainAttacker.pos.y, 0.2)
	end
	 _, moveTime = self._robot.trajectory:update(ToTarget, position, (World.Ball.pos - self._robot.pos):angle())
	if attackPosition then
		self:_suggestPass(position, attackPosition, moveTime)
	end
end
return AcceptPass
