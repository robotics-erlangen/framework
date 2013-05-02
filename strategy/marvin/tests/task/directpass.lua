local Base = require "play/base"
local DirectPassTest = (require "../base/class").new("Play.DirectPassTest", Base)

local World = require "../base/world"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"

local Ball = require "observer/ball"
local DirectPass = require "task/directpass"
local ReceivePass = require "task/receivepass"
local MoveToPos = require "task/movetopos"
local Field = require "util/field"

DirectPassTest.weight = 1
DirectPassTest.timeout = 60
DirectPassTest._conditions = {}

function DirectPassTest:_init()
end

function DirectPassTest:_baseRating()
	return
end

function DirectPassTest:_selectRobots(poolRobots)
	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	robots = RobotList.join(robots, poolRobots.keeper)
	return RobotMatcher.match(self._taskmanager, robots, 2, DirectPassTest._conditions)
end

function DirectPassTest:rateDefault(isInit)
	return Base.rating.yes
end

function DirectPassTest:prepareDefault()
	local ofs = math.random(100) / 100
	self._tasks = {
		MoveToPos.create(self._robots[1], Vector.create(-1, 1+ofs), 0),
		MoveToPos.create(self._robots[2], Vector.create(1, 1+ofs), math.pi)
	}
end

function DirectPassTest:switchDefault()
	if World.Ball.speed:length() > 0.7 and World.Ball.speed:absoluteAngleDiff(self._robots[1].pos - World.Ball.pos) < 20/180*math.pi then
		self:_setState("Active")
	end
end

function DirectPassTest:rateActive()
	if not World.Ball:isPositionValid() or not Field.isInField(World.Ball.pos, -0.2) then
		return Base.rating.no
	end
	return Base.rating.yes
end

function DirectPassTest:prepareActive()
	self._tasks = {
		DirectPass.create(self._robots[1], self._robots[2], true),
		self._tasks[2]
	}
end

function DirectPassTest:switchActive()
	if Ball.isShot() then
		self:_setState("Shot")
	end
end

function DirectPassTest:rateShot()
	if not World.Ball:isPositionValid() or not Field.isInField(World.Ball.pos, -0.2) then
		return Base.rating.no
	end
	-- end play when the ball was "catched"
	if self._robots[2]:hasBall(World.Ball) then
		return Base.rating.no
	end
	return Base.rating.yes
end
	
function DirectPassTest:prepareShot()
	self._tasks = {
		self._tasks[1],
		ReceivePass.create(self._robots[2])
	}
end

return DirectPassTest
