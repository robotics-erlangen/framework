local Base = require "play/base"
local KickoffDefensive = (require "../base/class").new("Play.KickoffDefensive", Base)

local World = require "../base/world"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"

local Mirror = require "task/mirror"
local MoveToPos = require "task/movetopos"

local G = World.Geometry


KickoffDefensive.weight = 1000 -- TODO
KickoffDefensive.timeout = 20 -- TODO

KickoffDefensive._conditions = {} -- TODO use conditions if needed


function KickoffDefensive:_init()
	self:setState("Default")
end


function KickoffDefensive.startRating(attackers, defenders, minRating)
	if World.RefereeState == "KickoffDefensivePrepare" or World.RefereeState == "KickoffDefensive" then
		return Base.rating.referee
	else
		return Base.rating.no 
	end
end


function KickoffDefensive:currentRating()
	if World.RefereeState == "KickoffDefensivePrepare" or World.RefereeState == "KickoffDefensive" then
		return Base.rating.referee
	elseif World.RefereeState == "Game" then
		-- return yes, if play should NOT be killed immediately
		-- otherwise return no
		return Base.rating.no
	else
		return Base.rating.no 
	end
end


function KickoffDefensive.selectRobots(attackers, defenders)
	-- cacheable array manipulations
	local robots = RobotList.join(attackers, defenders)
	robots = RobotList.excludeRobot(robots, World.FriendlyKeeper)
	
	robots, _ = RobotMatcher.match(robots, math.min(4, #robots), KickoffDefensive._conditions)
	return robots
end

function KickoffDefensive:prepareDefault()
	-- #1 Quarterback
	local quarterbackPos = Vector.create(0, -G.CenterCircleRadius - self._robots[2].radius - Settings.positionPadding)
	-- #2, 3, Mirror
	self._tasks = {
		self._robots[1] and MoveToPos.create(self._robots[1], quarterbackPos, math.pi/2) or nil,
		self._robots[2] and Mirror.create(self._robots[2], false, Settings.positionPadding) or nil,
		self._robots[3] and Mirror.create(self._robots[3], true, Settings.positionPadding) or nil,
		-- TODO defender that stays back but mirrors the opponent
	}
end


return KickoffDefensive
