local Base = require "agent/base/behavior"
local ManMark = Class("Agent.Defender.ManMark", Base)

local debug = require "../base/debug"
local Field = require "../base/field"
local World = require "../base/world"
local vis = require "../base/vis"
local CenterBack = require "task/centerback"
local Duel = require "task/duel"
local ManMarkTask = require "task/manmark"
local Defense = require "util/defense"


function ManMark:_stop()
	self._opps = {}
	self._opp = nil
end

function ManMark:check()
	local role = self._inbox.roleAssignment().trainer
	if role and role.name == "ManMark" then
		local params = self._inbox.roleAssignment().trainer.params
		if #self._opps ~= #params then
			self._task = nil
		else
			for _,r in ipairs(self._opps) do
				if not table.contains(params, r) then
					self._task = nil
					break
				end
			end
		end
		if self._task == nil then
			self._opps = params
		end
		return true
	end
	return false
end

function ManMark:_updateTask()
	local robotids = {}
	for _,r in ipairs(self._opps) do
		table.insert(robotids, tostring(r.id))
	end
	debug.set("targets", table.concat(robotids, " "))

	self._opp = Defense.manMarkFakeRobot(self._opps)
	local dest = Defense.manMarkPos(self._opp)

	-- try to intercept a possible goal shot
	if Defense.dangerousBallTowardsDefense() then
		local defenseAreaIntersection = Field.intersectRayDefenseArea(World.Ball.pos,
			World.Ball.pos + World.Ball.speed, 0, false)
		if defenseAreaIntersection and World.Ball.pos:distanceTo(defenseAreaIntersection)
			> World.Ball.pos:distanceTo(self._robot.pos)
			and (self._robot.pos - World.Ball.pos):dot(World.Ball.speed) > 0 then
			return Duel
		end
	end

	local color = World.TeamIsBlue and vis.colors.blueHalf or vis.colors.yellowHalf
	vis.addCircle("a/d/manmark: Target", dest, 0.1, color)
	vis.addPath("a/d/manmark: Target", {self._robot.pos, dest, self._opp.pos}, color)

	-- use centerback positioning if the destination pos would be too close to our defense area
	local markingPosDefenseDist = Field.distanceToFriendlyDefenseArea(dest, self._opp.radius)
	local markingPosNearLow = CenterBack.distanceToDefenseArea() + Defense.MARKING_DISTANCE
	local markingPosNearHigh = markingPosNearLow + 2 * self._robot.radius
	local markingPosThreshold = (self._task and Class.instanceOf(self._task, CenterBack))
			and markingPosNearHigh or markingPosNearLow

	local oppDefenseDist = Field.distanceToFriendlyDefenseArea(self._opp.pos, self._opp.radius)

	-- if the opponent is near our defense area (or inside it), use the CenterBack task
	if markingPosDefenseDist < markingPosThreshold or oppDefenseDist <= 0 then
		return CenterBack, { self._opp }
	end

	local selfDefenseDist = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)

	-- if we are still near the defense area but want to move away, disguise as a centerback
	-- PFUSCH: use yourself as the defense target
	-- WARNING: only use temporarily as this code also halts at least one innocent centerback
	if selfDefenseDist < CenterBack.distanceToDefenseArea() + self._robot.radius + 0.03 then
		self._send.preliminaryCenterbackTarget("all", self._robot)
	end

	return ManMarkTask, { self._opp }
end

return ManMark
