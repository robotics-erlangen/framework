local Base = require "agent/base/behavior"
local ManMark = Class("Agent.Defender.ManMark", Base)

local ManMarkTask = require "task/manmark"
local CenterBack = require "task/centerback"
local Field = require "../base/field"
local Defense = require "util/defense"
local debug = require "../base/debug"
local vis = require "../base/vis"

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


	local markingPosDefenseDist = Field.distanceToFriendlyDefenseArea(dest, self._opp.radius)
	local markingPosNearLow = 3 * self._robot.radius + CenterBack.distanceToDefenseArea() + 2 * Defense.MARKING_DISTANCE
	local markingPosNearHigh = markingPosNearLow + 2 * self._robot.radius
	local markingPosThreshold = (self._task and Class.instanceOf(self._task, CenterBack))
			and markingPosNearHigh or markingPosNearLow
			
	--[[
	local ownPosDefenseDist = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
	local ownPosNearLow = CenterBack.distanceToDefenseArea()
	local ownPosNearHigh = ownPosNearLow + self._robot.radius
	local ownPosThreshold = (self._task and Class.instanceOf(self._task, CenterBack))
			and ownPosNearHigh or ownPosNearLow
	]]

	local oppDefenseDist = Field.distanceToFriendlyDefenseArea(self._opp.pos, self._opp.radius)
	
	if oppDefenseDist == 0 -- opponent is in defense area
		or markingPosDefenseDist < markingPosThreshold
	--	or (ownPosDefenseDist < ownPosThreshold and 
	then
		return CenterBack, { self._opp }
	else
		return ManMarkTask, { self._opp }
	end
end

return ManMark
