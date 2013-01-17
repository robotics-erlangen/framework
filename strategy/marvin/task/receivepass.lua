local ReceivePass = (require "../base/class").new("Task.ReceivePass", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Observer = require "observer/ball"
local geom = require "../base/geom"

ReceivePass.priority = 5

function ReceivePass:_init()
end

function ReceivePass:_run(priorityMessages, notifications)
	self._robot.path:setDefaultObstacles(self._robot, true)
	self._robot.path:addRobotObstacles(self._robot)
	
	local ballSpeed = World.Ball.speed:length()
	-- bei schnellen Baellen in den Weg stellen und abfangen
	if ballSpeed > Settings.slowBall then
		local movTo = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos+(World.Ball.speed * 30))
		local faceBall = (World.Ball.pos-movTo):angle()
		self._robot.trajectory:update(ToTarget, movTo, faceBall)
	--bei langsamen Baellen entgegenbewegen
	else
		local movTo = World.Ball.pos - (World.Ball.pos - self._robot.pos):setLength(self._robot.shootRadius)
		local faceBall = (World.Ball.pos-movTo):angle()
		self._robot.trajectory:update(ToTarget, movTo, faceBall)
	end
end

local inst = nil
local active = false
function ReceivePass.test()
	local robot = World.FriendlyRobots[1]
	if robot then
		local MoveToPos = require "task/movetopos"
		local Field = require "util/field"
		if World.Ball.speed:length() > 0.7 and World.Ball.speed:absoluteAngleDiff(robot.pos - World.Ball.pos) < 20/180*math.pi then
			if not active then
				inst = nil
			end
			active = true
		elseif not World.Ball:isPositionValid() or not Field.isInField(World.Ball.pos, 0) then
			active = false
			inst = nil
		end
		
		if active then
			inst = inst or ReceivePass.create(robot)
		else
			inst = inst or MoveToPos.create(robot, Vector.create(1, 2), math.pi)
		end
		return inst
	else
		inst = nil
		active = false
	end
end

return ReceivePass
