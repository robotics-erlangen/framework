local MoveSRC1 = Class("Group.Move.MoveSRC1", require "group/move/base")

local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local Ball = require "observer/ball"
local ShootGoal = require "task/shootgoal"
local Referee = require "../base/referee"
local World =   require "../base/world"
local debug = require "../base/debug"

local G = World.Geometry

local XFACTOR = G.FieldWidthHalf / 3
local YFACTOR = G.FieldHeightHalf / 4.5

local POS1 = {Vector(-1.5 * XFACTOR, 3.5 * YFACTOR), Vector(-1.5 * XFACTOR, 3.5 * YFACTOR), Vector(-1.4 * XFACTOR, 2.9 * YFACTOR), Vector(-1.01 * XFACTOR, 1.47 * YFACTOR), Vector(0.6 * XFACTOR, -3.4 * YFACTOR)}
local POS2 = {Vector(-0.7 * XFACTOR, 2.5 * YFACTOR), Vector(-0.7 * XFACTOR, 2.5 * YFACTOR), Vector(-1.7 * XFACTOR, 3.6 * YFACTOR), Vector(-2.7 * XFACTOR, 2.0 * YFACTOR), Vector(0.3 * XFACTOR, -2.9 * YFACTOR)}
local POS3 = {Vector(0.5 * XFACTOR, 0.9 * YFACTOR), Vector(2.5 * XFACTOR, 2.7 * YFACTOR), Vector(2.5 * XFACTOR, 2.7 * YFACTOR), Vector(0.6 * XFACTOR, 3.0 * YFACTOR), Vector(0.4 * XFACTOR, 3.0 * YFACTOR)}
local POS4 = {Vector(3.0 * XFACTOR, 3.8 * YFACTOR), Vector(3.0 * XFACTOR, 4.5 * YFACTOR), Vector(3.0 * XFACTOR, 4.5 * YFACTOR), Vector(3.0 * XFACTOR, 4.5 * YFACTOR), Vector(3.0 * XFACTOR, 4.5 * YFACTOR)} 
local POS5 = {Vector(0.4 * XFACTOR, -3.4 * YFACTOR), Vector(0.4 * XFACTOR, -3.4 * YFACTOR), Vector(0.14 * XFACTOR, 1.2 * YFACTOR), Vector(-0.04 * XFACTOR, 1.7 * YFACTOR), Vector(-0.04 * XFACTOR, 1.7 * YFACTOR)} 

MoveSRC1.MIN_ROBOTS = 5
MoveSRC1.MAX_ROBOTS = 5


MoveSRC1.DEBUG_GOOD_POS = {
		{Vector(4*G.FieldWidthHalf / 5,4*G.FieldHeightHalf / 5), Vector(G.FieldWidthHalf, G.FieldHeightHalf)},
}

function MoveSRC1.canStart()
	return World.RefereeState == "Stop" or Referee.isFriendlyFreeKickState()
end

function MoveSRC1:_init()
	self._state = 0
	self._stopStart = Referee.lastStateChangeTime()
end


function MoveSRC1:_canContinue()
	return self._state < 5 and (World.RefereeState == "Stop" and Referee.lastStateChangeTime() == self._stopStart or Referee.isFriendlyFreeKickState() or World.RefereeState == "Game")
end

function MoveSRC1:_updateTasks()
	local taskAssignments = {}
	local changed = false
	debug.set("state", self._state)
	
	if self._robots[1].pos:distanceTo(POS1[(self._state % 5) +1]) < 0.1 and self._robots[2].pos:distanceTo(POS2[(self._state % 5) +1]) < 0.1 and self._robots[3].pos:distanceTo(POS3[(self._state % 5) +1]) < 0.1 and self._robots[4].pos:distanceTo(POS4[(self._state % 5) +1]) < 0.1 and self._robots[5].pos:distanceTo(POS5[(self._state % 5) +1]) < 0.1 and (Referee.isFriendlyFreeKickState() or self._state ~= 0) 
		or Ball.isShot() then
		self._state = (self._state + 1 )
		changed = true
	end
	taskAssignments[self._robots[1]] = {class = MoveToPos, params = {POS1[(self._state % 5) +1]}, restart = changed}
	taskAssignments[self._robots[2]] = {class = MoveToPos, params = {POS2[(self._state % 5) +1]}, restart = changed}
	taskAssignments[self._robots[3]] = {class = MoveToPos, params = {POS3[(self._state % 5) +1]}, restart = changed}
	if (self._state%5) == 3 then
		taskAssignments[self._robots[4]] = {class = Pass, params = {self._robots[5]}, restart = changed}
		
	else
		taskAssignments[self._robots[4]] = {class = MoveToPos, params = {POS4[(self._state % 5) +1]}, restart = changed}
	end
	if (self._state %5) == 4 then
		taskAssignments[self._robots[5]] = {class = ShootGoal, params = {}, restart = changed}
		
	else
		taskAssignments[self._robots[5]] = {class = MoveToPos, params = {POS5[(self._state % 5) +1]}, restart = changed}
	end

	if self._state%5 == 3 then
		return taskAssignments, self._robots[4]
	end
	if self._state%5 == 4 then
		return taskAssignments, self._robots[5]
	end
	return taskAssignments
end
return MoveSRC1
