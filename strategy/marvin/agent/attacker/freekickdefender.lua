local Base = require "agent/base/behavior"
local FreeKickDefender = (require "../base/class").new("Agent.Attacker.FreeKickDefender", Base)

local World = require "../base/world"
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
		return ManMark, {self._markedRobot}
	else
		return MoveToPos, {pos, dir}
	end
end

function FreeKickDefender:check()
	if World.RefereeState == "DirectDefensive" and World.Ball.pos.y < 0 --corner kick
			or World.RefereeState == "IndirectDefensive" and World.Ball.pos.y < World.Geometry.FieldHeightQuarter--throw-in
			or World.RefereeState == "Stop" then --TODO discuss stop
		local tmpTask, params = self:_getTask()
		local rating = tmpTask.create(self._agent, unpack(params)):rate()
		self.send("trainer").specialRole({freeKickDefender = rating})
	end
	return self.inbox.freeKickDefender().trainer == self._robot
end

function FreeKickDefender:_updateTask()
	return self:_getTask()
end

return FreeKickDefender
