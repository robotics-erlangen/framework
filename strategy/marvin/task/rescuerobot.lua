local RescueRobot = (require "../base/class").new("Task.RescueRobot", require "task/base")

local geom = require "../base/geom"
local World = require "../base/world"
local TrajectoryHidden = require "trajectory/hidden"

RescueRobot.priority = 1

-- list of local speeds: (speedForward, speedSide) 
RescueRobot._speeds = {
	Vector.create(1, 0), -- forward
	Vector.create(0, -1), -- left
	Vector.create(-1, 0), -- backward
	Vector.create(0 , 1) -- right
}

function RescueRobot:_rate()
	return self._robot.isVisible and 0 or 1
end

function RescueRobot:_run()
	-- ignore visible robots
	if self._robot.isVisible then
		return
	end

	if not self._rotation then
		-- align forward direction with the opposite speed the robot had when it was lost
		local backwardsDir = self._robot.speed:copy():scaleLength(-1):angle()
		local frontDir = self._robot.dir
		self._rotation = geom.getAngleDiff(frontDir, backwardsDir)
	end

	-- use time as index, one new vector every second
	local timeDiff = World.Time - self._robot.lostSince
	local idx = math.floor(timeDiff) + 1 -- offset for array start index
	local speed = self._speeds[idx]

	if speed then
		speed = speed:rotate(self._rotation)
		self._robot.trajectory:update(TrajectoryHidden, speed.x, speed.y) 
	end
end

function RescueRobot.factory(position)
	local f = function (robots)
		return RescueRobot.create(robots[position])
	end
	return f
end

function RescueRobot.test(id)
	if id > 2 then
		return nil
	end
	return RescueRobot.factory(1), 1
end

return RescueRobot
