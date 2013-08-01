local Base = require "agent/base/behavior"
local KickoffAssistant = (require "../base/class").new("Agent.Attacker.KickoffAssistant", Base)

local World = require "../base/world"
local G = World.Geometry
local Ball = require "observer/ball"

local MoveToPos = require "task/movetopos"

function  KickoffAssistant:_stop(d)
	self._moveDest = nil
	self._movePos = nil
end

function KickoffAssistant:check()
	-- try every position in random order, take first free one
	local positionClash = false
	for _, pos in pairs(self.inbox.moveDest("others")) do
		if pos == self._moveDest then
			positionClash = true
		end
	end

	if not self._moveDest or positionClash then
		local positions = {
			Vector.create(-G.FieldWidthHalf * 0.75, -3 * self._robot.radius),
			Vector.create(-G.FieldWidthHalf * 0.5, -3 * self._robot.radius),
			Vector.create(G.FieldWidthHalf * 0.75, -3 * self._robot.radius),
			Vector.create(G.FieldWidthHalf * 0.5, -3 * self._robot.radius)
		}
		self._moveDest = table.shuffle(positions)[1]
	end

	self.send("all").moveDest(self._moveDest)

	local isActive = World.RefereeState == "KickoffOffensivePrepare" or 
		(self._active and not Ball.isShot())
	return isActive
end

function KickoffAssistant:_updateTask()
	if self._movePos ~= self._moveDest then
		self._movePos = self._moveDest
		self._task = nil -- make sure a new task will be created
	end
	return MoveToPos, {self._moveDest, (self._robot.pos-G.OpponentGoal):angle()}
end

return KickoffAssistant
