local receivePass = (require "../base/class").new("Task.receivePass", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Observer = require "observer/ball"

Base.priority = 5

function receivePass:_init()

end

function receivePass:_run(priorityMessages, notifications)
	local shotPos, shotDir = Observer.--todo predictShot
	local ballSpeed = Vector:lenght(World.Ball.speed)
	-- bei schnellen Baellen in den Weg stellen und abfangen
	if ballSpeed > Settings.slowBall then
		local movTo = geom.nearestPosOnLine(self._roboter.pos, shotPos, shotPos+shotDir)
		local faceBall = World.Ball.Pos-movTo
		self._robot.trajectory:update(ToTarget, movTo, faceBall)
	--bei langsamen Baellen entgegenbewegen
	else
		local movTo = World.Ball.Pos-self._robot.radius
		local faceBall = World.Ball.Pos-movTo
		self._robot.trajectory:update(ToTarget, movTo, faceBall)
	end
end

return receivePass