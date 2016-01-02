local Base = require "agent/base/behavior"
local ManMark = Class("Agent.Defender.ManMark", Base)

local debug = require "../base/debug"
local Field = require "../base/field"
local vis = require "../base/vis"
local CenterBack = require "task/centerback"
local ManMarkTask = require "task/manmark"
local Defense = require "util/defense"


function ManMark:_stop()
	self._opp = nil
end

-- if we are further away from our target, maybe there is an attacker
-- who is better suited to mark the opponent
local CONSIDER_POOL_CHANGE_DIST_DEFENDER = 3
local CONSIDER_POOL_CHANGE_DIST_ATTACKER = 1.5

function ManMark:check()
	-- prevent centerbacks to switch to man marking in this situation
	if Defense.dangerousBallTowardsDefense() then
		return false
	end

	local mainAttacker = self._inbox.mainAttacker().trainer
	if self._opp and self._robot.pos:distanceTo(self._opp.pos) >
			CONSIDER_POOL_CHANGE_DIST_DEFENDER then
		for robot, _ in pairs(self._inbox.attackerFlag()) do
			if robot.pos:distanceTo(self._opp.pos) < CONSIDER_POOL_CHANGE_DIST_ATTACKER
					and robot ~= mainAttacker then
				self._send.attackerRequest("trainer")
				self._requestingPoolChange = true
				self._forceKeepingInPool = false
				debug.set("poolchange attacker", robot.id)
			end
		end
	end

	local role = self._inbox.roleAssignment().trainer
	if role and role.name == "ManMark" then
		if self._inbox.roleAssignment().trainer.params ~= self._opp then
			self._task = nil -- force creation of new task
			self._opp = self._inbox.roleAssignment().trainer.params
		end
		return true
	end
	return false
end

function ManMark:_updateTask()
	debug.set("target", self._opp)
	local dest = Defense.manMarkPos(self._opp)
	vis.addCircle("a/d/manmark: Target", dest, 0.1, vis.colors.red)

	-- use centerback positioning if the destination pos would be too close to our defense area
	local markingPosDefenseDist = Field.distanceToFriendlyDefenseArea(dest, self._opp.radius)
	local markingPosNearLow = 2 * self._robot.radius + CenterBack.distanceToDefenseArea() + 2 * Defense.MARKING_DISTANCE
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
