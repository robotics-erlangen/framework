local ShootSpeedTest = Class("Task.ShootSpeedTest", require "task/base")

local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local TestAgent = require "agent/testagent"
local Messaging = require "control/messaging"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function ShootSpeedTest:_init(speed)
	self._shootSpeed = speed
	self._ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
end

function ShootSpeedTest:run()
	local ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
	local shootDistance = math.max(0, math.abs(self._robot.pos.y) - self._robot.shootRadius - World.Ball.radius)
	if not ballInHalf and self._ballInHalf then
		log("Ball speed:  Look at the raw values in the plotter")
		log("Shoot speed: " .. tostring(self._robot:calculateShootSpeed(self._shootSpeed, math.abs(self._robot.pos.y))))
		log("Distance:    " .. tostring(shootDistance))
	end
	self._ballInHalf = ballInHalf

	local shootSpeed = self._robot:calculateShootSpeed(self._shootSpeed, shootDistance)
	self._robot:shoot(shootSpeed)
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	self._robot.trajectory:update(ToTarget, self._robot.pos, self._robot.pos.y < 0 and math.pi/2 or -math.pi/2)
end

local agent = nil

local function run()
	if agent == nil then
		if #World.FriendlyRobots == 0 then
			return
		end
		agent = TestAgent(World.FriendlyRobots[1], {
			task = ShootSpeedTest,
			parameters = { 2 }
		})
	end
	Messaging.deliverMessages()
	agent:run()
end

Entrypoints.add("TaskTest/ShootSpeed", run)
