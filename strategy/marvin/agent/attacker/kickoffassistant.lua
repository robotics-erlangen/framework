local Base = require "agent/base/behaviour"
local KickoffAssistant = (require "../base/class").new("Agent.Attacker.KickoffAssistant", Base)

local World = require "../base/world"
local G = World.Geometry
local Class = require "../base/class"
local Ball = require "observer/ball"

local ShootGoal = require "task/shootgoal"
local MoveToPos = require "task/movetopos"

function KickoffAssistant:_check()
	-- try every position in random order, take first free one
	local positionClash = false
	for robot, msg in pairs(self._priorityMessages) do
		if msg.agent.targetPos and msg.agent.targetPos == self._targetPos and robot ~= self._robot then
			positionClash = true
		end
	end

	if not self._targetPos  or positionClash then
		local positions = {
			Vector.create(-G.FieldWidthHalf * 0.75, -3 * self._robot.radius),
			Vector.create(-G.FieldWidthHalf * 0.5, -3 * self._robot.radius),
			Vector.create(G.FieldWidthHalf * 0.75, -3 * self._robot.radius),
			Vector.create(G.FieldWidthHalf * 0.5, -3 * self._robot.radius)
		}
		self._targetPos = table.shuffle(positions)[1]
	end

	local isActive = World.RefereeState == "KickoffOffensivePrepare" or 
		(self._state == Base.State.Active and not Ball.isShot())
	return (isActive and Base.State.Active or Base.State.Inactive), { targetPos = self._targetPos }
end

function KickoffAssistant:_run()
	if not self._task or self._movePos ~= self._targetPos then
		self._movePos = self._targetPos
		self._task = MoveToPos.create(self._robot, self._targetPos, (self._robot.pos-G.OpponentGoal):angle())
	end
end

function  KickoffAssistant:_stop(isAborted)
	self._targetPos = nil
	self._movePos = nil
end

return KickoffAssistant
