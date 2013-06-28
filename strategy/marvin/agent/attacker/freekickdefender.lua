local Base = require "agent/base/behaviour"
local FreeKickDefender = (require "../base/class").new("Agent.Attacker.FreeKickDefender", Base)

local World = require "../base/world"
local Class = require "../base/class"
local ManMark = require "task/manmark"
local MoveToPos = require "task/movetopos"


local function getPos()
	local absX = World.Geometry.FieldWidthQuarter
	local x = World.Ball.pos.x > 0 and -absX or absX
	local preferredPos = Vector.create(x, World.Ball.pos.y)
	local preferredDir = World.Ball.pos.x > 0 and math.pi/4 or 3*math.pi/4
	return preferredPos, preferredDir
end

local function decideManMark(self, pos)
	local keepDecision = false
	for _,r in pairs(World.OpponentRobots) do
		local d = r.pos:distanceTo(pos)
		if d < 0.5 then
			self._manmark = true
			self._markedRobot = r
			return true
		elseif d < 0.8 then
			keepDecision = true
		end
	end
	if keepDecision then
		return self._manmark
	end
	
	self._manmark = false
	self._markedRobot = nil
	return false
end

function FreeKickDefender:_getTask()
	local pos, dir = getPos()
	local decision = decideManMark(self, pos)
	if decision then
		if not self._task or not Class.instanceOf(self._task, ManMark) then
			return ManMark.create(self._robot, self._markedRobot)
		end
	else
		if not self._task or not Class.instanceOf(self._task, MoveToPos) then
			return MoveToPos.create(self._robot, pos, dir)
		end
	end
	return self._task
end

function FreeKickDefender:_check()
	if World.RefereeState == "DirectDefensive" and World.Ball.pos.y < 0 --corner kick
			or World.RefereeState == "IndirectDefensive" --throw-in
			or World.RefereeState == "Stop" then --TODO discuss stop
		local rating = self:_getTask():rate(self._priorityMessages, self._notifications)
		local defender = self._trainerMessage.specialTask.freeKickDefender
		return defender == self._robot and Base.State.Active or Base.State.Inactive,
				{ specialTask = {freeKickDefender = rating}} 
	else
		return Base.State.Inactive
	end
end

function FreeKickDefender:_run()
	self._task = self:_getTask()
end

return FreeKickDefender
