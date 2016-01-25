local RescueRobot = Class("Task.RescueRobot", require "task/base")

local geom = require "../base/geom"
local World = require "../base/world"
local TrajectoryHidden = require "trajectory/hidden"


function RescueRobot:_init()
	self._rotation = nil
	-- list of local speeds: (speedForward, speedSide)
	self._speeds = nil
end

function RescueRobot:run()
	-- ignore visible robots
	if self._robot.isVisible or not self._robot.speed then
		return
	end

	if not self._rotation then
		-- align forward direction with the opposite speed the robot had when it was lost
		local backwardsDir = self._robot.speed:copy():scaleLength(-1):angle()
		local frontDir = self._robot.dir
		self._rotation = geom.getAngleDiff(frontDir, backwardsDir)

		-- if field center is on the left while moving forward
		if geom.checkTriangleOrientation(self._robot.pos, self._robot.pos + Vector.fromAngle(backwardsDir), Vector(0,0)) >= 0 then
			self._speeds = {
				Vector(1, 0), -- forward
				Vector(-1, 0), -- backward
				Vector(0, -1), -- left
				Vector(0 , 1) -- right
			}
		else
			self._speeds = {
				Vector(1, 0), -- forward
				Vector(-1, 0), -- backward
				Vector(0 , 1), -- right
				Vector(0, -1) -- left
			}
		end
	end

	-- use time as index, one new vector every second
	local timeDiff = World.Time - self._robot.lostSince
	local idx = math.floor(timeDiff) + 1 -- offset for array start index
	local speed = self._speeds[idx]

	if speed then
		speed = speed:copy():rotate(self._rotation)
		self._robot.trajectory:update(TrajectoryHidden, speed.x, speed.y)
	end
end

return RescueRobot
