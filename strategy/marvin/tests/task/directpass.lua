local Base = require "play/base"
local DirectPassTest = (require "../base/class").new("Play.DirectPassTest", Base)

local World = require "../base/world"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"

local DirectPass = require "task/directpass"
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

function DirectPassTest:_selectRobots(attackers, defenders)
	local robots, _ = RobotList.join(attackers, defenders)
	robots, _ = RobotMatcher.match(robots, 2, DirectPassTest._conditions)
	return robots
end

function DirectPassTest:rateDefault(isInit)
	if self:state() == "Active" then
		if not World.Ball:isPositionValid() or not Field.isInField(World.Ball.pos, -0.2) then
			return Base.rating.no
		end
	end
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

function DirectPassTest:prepareActive()
	self._tasks = {
		DirectPass.create(self._robots[1], self._robots[2], true),
		self._tasks[2]
	}
end

local coord = nil
return { testPlay = function ()
	if not coord then
		local Coordinator = require "control/coordinator"
		coord = Coordinator.create()
		coord:test(DirectPassTest)
	end
	coord:run()
end}
