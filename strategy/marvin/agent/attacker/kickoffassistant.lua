local Base = require "agent/base/behavior"
local KickoffAssistant = Class("Agent.Attacker.KickoffAssistant", Base)
local debug = require "../base/debug"
local World = require "../base/world"
local G = World.Geometry
local Ball = require "observer/ball"
local Game = require "observer/game"

local MoveToPos = require "task/movetopos"
local KickoffPass = require "task/kickoffpass"

function KickoffAssistant:_stop(d)
	self._behind = false
	self._moveDest = nil
	self._movePos = nil
	self._distanceY = 2.67
end


function KickoffAssistant:_position(positionClash)
	if not self._moveDest or positionClash then
		--position in the back
		if self._distanceY > (3/4)*G.FieldHeightHalf then -- small field
			self._distanceY = (3/4)*G.FieldHeightHalf
		end

		local positions = {
			Vector(-G.FieldWidthHalf * 0.5, -3 * self._robot.radius),
			Vector(-G.FieldWidthHalf * 0.75,  -self._distanceY),
			Vector(G.FieldWidthHalf * 0.5, -3 * self._robot.radius),
			Vector(G.FieldWidthHalf * 0.75,  -self._distanceY),
		}
		self._moveDest = table.shuffle(positions)[1]
		debug.set("pos", self._moveDest.x)
		-- remember that player is in the back of the field
		if self._moveDest == positions[2] or self._moveDest== positions[4] then
			if (Game.attackSideWithLessOpponents()== "left" and self._moveDest== positions[4]) or
				 (Game.attackSideWithLessOpponents()== "right" and self._moveDest== positions[2]) then
				return self:_position(true)
			end
			self._behind = true
		else
			self._behind = false
		end
	end
	return
end

function KickoffAssistant:check()
	-- try every position in random order, take first free one
	local positionClash = false
	for _, pos in pairs(self._inbox.moveDest()) do
		if self._moveDest~=nil then
			if pos == self._moveDest or (math.abs(self._moveDest.x) == math.abs(pos.x)
					and self._moveDest.y == self._distanceY ) then
				positionClash = true
			elseif pos.y == -self._distanceY and self._behind then
				positionClash = true
			end
		end
	end
	--choose the position
	self:_position(positionClash)
	--send
	self._send.moveDest("all", self._moveDest)

	local isActive = World.RefereeState == "KickoffOffensivePrepare" or
		(self._active and not Ball.isShot())
	return isActive
end

function KickoffAssistant:_updateTask()

	if self._behind then -- player is in the back and wants a pass at kickoff
		if self._movePos ~= self._moveDest then
			self._movePos = self._moveDest
			self._task = nil -- make sure a new task will be created
		end
		self._forceKeepingInPool = true
		return KickoffPass, {self._moveDest, (G.OpponentGoal-self._moveDest):angle()}
	end
	--currently not used, because there will always be a player in the back
	if self._movePos ~= self._moveDest then  -- player is on the goalline
		self._movePos = self._moveDest
		self._task = nil -- make sure a new task will be created
	end
	return MoveToPos, {self._moveDest, (G.OpponentGoal-self._moveDest):angle()}
end

return KickoffAssistant
