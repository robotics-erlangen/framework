local Base = require "agent/base/behavior"
local KickoffAssistant = Class("Agent.Attacker.KickoffAssistant", Base)
local debug = require "../base/debug"
local World = require "../base/world"
local G = World.Geometry
local Ball = require "observer/ball"

local MoveToPos = require "task/movetopos"
local KickoffPass = require "task/kickoffpass"

function  KickoffAssistant:_stop(d)
	self._behind = false
	self._moveDest = nil
	self._movePos = nil
end

function KickoffAssistant:check()
	-- try every position in random order, take first free one
	local positionClash = false
	for _, pos in pairs(self._inbox.moveDest()) do
		if self._moveDest~=nil and (pos == self._moveDest or pos.x == self._moveDest.x or (pos.y==self._moveDest.y and math.abs(pos.y) >= 29 * self._robot.radius ))  then
			positionClash = true
		end
	end

	if not self._moveDest or positionClash then
		local positions = {
			--Vector(-G.FieldWidthHalf * 0.75, -3 * self._robot.radius),
			Vector(-G.FieldWidthHalf * 0.5, -3 * self._robot.radius),
			Vector(-G.FieldWidthHalf * 0.75, -30 * self._robot.radius),
			--Vector(-G.FieldWidthHalf * 0.5, -30 * self._robot.radius),
			--Vector(G.FieldWidthHalf * 0.75, -3 * self._robot.radius),
			Vector(G.FieldWidthHalf * 0.5, -3 * self._robot.radius),
			Vector(G.FieldWidthHalf * 0.75, -30 * self._robot.radius),
			--Vector(G.FieldWidthHalf * 0.5, -30 * self._robot.radius),
		}
		self._moveDest = table.shuffle(positions)[1]
		debug.set("pos", self._moveDest.x)
		-- remember that player is in the back of the field
		if self._moveDest == positions[2] or self._moveDest== positions[4] then -- or self._moveDest== positions[4]or self._moveDest== positions[8] then
			--self._send.kop("all", self._moveDest)
			--debug.set("t3", 1)
			self._behind = true
		else
			self._behind=false
		end
	end
	--self._send.kop("all", self._moveDest)

	self._send.moveDest("all", self._moveDest)

	local isActive = World.RefereeState == "KickoffOffensivePrepare" or
		(self._active and not Ball.isShot())
	return isActive
end

function KickoffAssistant:_updateTask()
	debug.set("t", self._behind)
	debug.set("t2", self._moveDest)

	if self._behind then -- player is in the back and wants a pass at kickoff
		if self._movePos ~= self._moveDest then
			--self._send.testMessage("all", 2)

			self._movePos = self._moveDest
			self._task = nil -- make sure a new task will be created
		end
		--self._send.testMessage("all", 1)
		return KickoffPass, {self._moveDest, (G.OpponentGoal-self._moveDest):angle()}
	end
	--currently not used, because there will always be a player in the back
	if self._movePos ~= self._moveDest then  -- player is on the goalline
		--self._send.testMessage("all", 2)

		self._movePos = self._moveDest
		self._task = nil -- make sure a new task will be created
	end
	return MoveToPos, {self._moveDest, (G.OpponentGoal-self._moveDest):angle()}
end

return KickoffAssistant
