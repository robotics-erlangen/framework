local Base = require "play/base"
local KickoffDefensive = (require "../base/class").new("Play.KickoffDefensive", Base)

local World = require "../base/world"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"
local Game = require "observer/game"

local Mirror = require "task/mirror"
local FarMirror = require "task/farmirror"
local MoveToPos = require "task/movetopos"

local G = World.Geometry

KickoffDefensive.weight = 1000
KickoffDefensive.timeout = 20
KickoffDefensive.maxRating = Base.rating.referee

KickoffDefensive._conditions = {}

function KickoffDefensive:_init()
end

function KickoffDefensive:_selectRobots(poolRobots)
	-- cacheable array manipulations
	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	return RobotMatcher.match(self._messages, robots, math.max(math.min(4, #robots),1), KickoffDefensive._conditions)
end

function KickoffDefensive:rateDefault(isInit)
	local positiveState = {
		FirstHalfPre = true,
		SecondHalfPre = true,
		ExtraFirstHalfPre = true,
		ExtraSecondHalfPre = true,
		KickoffDefensivePrepare = true,
		KickoffDefensive = true,
	}
	if positiveState[World.RefereeState] or positiveState[World.GameStage] then
		return Base.rating.referee
	elseif World.RefereeState == "Game" then
		return Base.rating.no
	end
	return Base.rating.no
end

function KickoffDefensive:prepareDefault()
	-- #1 Quarterback
	local quarterbackPos = Vector.create(0, -G.CenterCircleRadius - self._robots[1].radius - Settings.positionPadding)
	-- #2, 3, Mirror
	self._tasks = {
		self._robots[1] and MoveToPos.create(self._robots[1], quarterbackPos, math.pi/2) or nil,
		self._robots[2] and Mirror.create(self._robots[2], false, Settings.positionPadding) or nil,
		self._robots[3] and Mirror.create(self._robots[3], true, Settings.positionPadding) or nil,
		self._robots[4] and FarMirror.create(self._robots[4]) or nil,
	}
end

return KickoffDefensive
