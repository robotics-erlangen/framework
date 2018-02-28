local KickOffDefensive = Class("Group.Move.KickOffDefensive", require "group/move/base")

local World = require "../base/world"
local G = World.Geometry

local ManMark = require "task/manmark"
local MoveToPos = require "task/movetopos"
local StopAttack = require "task/stopattack"
local MovesHelper = require "util/moveshelper"

KickOffDefensive.MIN_ROBOTS = 1
KickOffDefensive.MAX_ROBOTS = 3

function KickOffDefensive.canStart()
	return World.RefereeState == "KickoffDefensivePrepare"
			or World.RefereeState == "KickoffDefensive"
end

function KickOffDefensive:_init()
	self._fallbackPos = {
		Vector(-G.FieldWidthHalf * 0.5, -0.4),
		Vector(G.FieldWidthHalf * 0.5, -0.4),
	}

	local positions = { Vector(0, 0) }
	for i = 1, #self._robots-1 do
		table.insert(positions, self._fallbackPos[i])
	end
	self._assignments = MovesHelper.assignRobots(self._robots, positions, 0)
	self._targetLeft = nil
	self._targetRight = nil
end

function KickOffDefensive:_canContinue()
	return World.RefereeState == "KickoffDefensivePrepare"
			or World.RefereeState == "KickoffDefensive"
end

local function getTarget(prevTarget, fallbackPos)
	local maxDist = 2.5
	local distHysteresis = 1

	local prevDist = prevTarget and prevTarget.pos:distanceTo(fallbackPos) or math.huge
	if prevDist > maxDist or (prevTarget and math.abs(prevTarget.pos.x) < G.CenterCircleRadius) then
		prevDist = math.huge
	end

	local closestTarget
	local closestDist = math.huge
	for _,r in ipairs(World.OpponentRobots) do
		if r.pos.x * fallbackPos.x > 0 and math.abs(r.pos.x) > G.CenterCircleRadius + 0.3 then
			local dist = r.pos:distanceTo(fallbackPos)
			if dist < closestDist then
				closestTarget = r
				closestDist = dist
			end
		end
	end

	local dist = prevDist
	local target = prevTarget
	if closestDist + distHysteresis < prevDist then
		dist = closestDist
		target = closestTarget
	end

	if dist < math.huge then
		return target, target ~= prevTarget
	end

	return nil
end

function KickOffDefensive:_updateTasks()
	local restartLeft, restartRight
	self._targetLeft, restartLeft = getTarget(self._targetLeft, self._fallbackPos[1])
	self._targetRight, restartRight = getTarget(self._targetRight, self._fallbackPos[2])

	local taskAssignments = {}
	taskAssignments[self._robots[self._assignments[1]]] = { class = StopAttack, params = {} }

	if #self._robots > 1 then
		if self._targetLeft then
			taskAssignments[self._robots[self._assignments[2]]] = { class = ManMark, params = { self._targetLeft }, restart = restartLeft }
		else
			taskAssignments[self._robots[self._assignments[2]]] = { class = MoveToPos, params = { self._fallbackPos[1] } }
		end
	end
	if #self._robots > 2 then
		if self._targetRight then
			taskAssignments[self._robots[self._assignments[3]]] = { class = ManMark, params = { self._targetRight }, restart = restartRight }
		else
			taskAssignments[self._robots[self._assignments[3]]] = { class = MoveToPos, params = { self._fallbackPos[2] } }
		end
	end

	return taskAssignments, self._robots[self._assignments[1]]
end

return KickOffDefensive
