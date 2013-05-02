local Base = require "play/base"
local PassingTest = (require "../base/class").new("Play.PassingTest", Base)

local World = require "../base/world"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"
local Ball = require "observer/ball"

local DirectPass = require "task/directpass"
local MoveToPos = require "task/movetopos"
local Field = require "util/field"

PassingTest.weight = 1
PassingTest.timeout = 60
PassingTest._conditions = {}

function PassingTest:_init()
end

function PassingTest:_baseRating()
	return
end

function PassingTest:_selectRobots(poolRobots)
	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	robots = RobotList.join(robots, poolRobots.keeper)
	return RobotMatcher.match(self._taskmanager, robots, 2, PassingTest._conditions)
end

function PassingTest:rateDefault(isInit)
	return Base.rating.yes
end

function PassingTest:prepareDefault()
	local ofs = math.random(100) / 100
	self._tasks = {
		MoveToPos.create(self._robots[1], Vector.create(-1, 1+ofs), 0),
		MoveToPos.create(self._robots[2], Vector.create(1, 1+ofs), math.pi)
	}
end

function PassingTest:switchDefault()
	if World.Ball.speed:length() > 0.7 and World.Ball.speed:absoluteAngleDiff(self._robots[1].pos - World.Ball.pos) < 20/180*math.pi then
		self:_setState("Step1")
	end
end

function PassingTest:rateStep1()
	if not World.Ball:isPositionValid() or not Field.isInField(World.Ball.pos, -0.2) then
		return Base.rating.no
	end
	return Base.rating.yes
end

function PassingTest:prepareStep1()
	local ofs = math.random(100) / 100
	self._tasks = {
		DirectPass.create(self._robots[1], self._robots[2], true),
		MoveToPos.create(self._robots[2], Vector.create(1, 1+ofs), math.pi)
	}
end

function PassingTest:switchStep1()
	if Ball.isShot() then
		self:_setState("Step2")
	end
end

PassingTest.rateStep2 = PassingTest.rateStep1

function PassingTest:prepareStep2()
	local ofs = math.random(100) / 100
	self._tasks = {
		MoveToPos.create(self._robots[1], Vector.create(-1, 1+ofs), 0),
		DirectPass.create(self._robots[2], self._robots[1], true)
	}
end

function PassingTest:switchStep2()
	if Ball.isShot() then
		self:_setState("Step1")
	end
end

return PassingTest
