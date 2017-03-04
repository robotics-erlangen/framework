local KickOffDefensive = Class("Group.Move.KickOffDefensive", require "group/move/base")

local World = require "../base/world"
local G = World.Geometry

local ManMark = require "task/manmark"
local MoveToPos = require "task/movetopos"
local StopAttack = require "task/stopattack"
local MovesHelper = require "util/moveshelper"

KickOffDefensive.N_ROBOTS = 3

function KickOffDefensive.canStart()
	return World.RefereeState == "KickoffDefensivePrepare"
			or World.RefereeState == "KickOffDefensive"
end

function KickOffDefensive:_init()
	self._fallbackPos = {
		Vector(-G.FieldWidthHalf * 0.5, -0.4),
		Vector(G.FieldWidthHalf * 0.5, -0.4),
	}

	local positions = { Vector(0, 0) }
	for _,pos in ipairs(self._fallbackPos) do
		table.insert(positions, pos)
	end
	self._assignments = MovesHelper.assignRobots(self._robots, positions, 0)
	self._targetLeft = nil
	self._targetRight = nil
end

function KickOffDefensive:_canContinue()
	return World.RefereeState == "KickoffDefensivePrepare"
			or World.RefereeState == "KickOffDefensive"
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
		return target
	end

	return nil
end

function KickOffDefensive:_updateTasks()
	self._targetLeft = getTarget(self._targetLeft, self._fallbackPos[1])
	self._targetRight = getTarget(self._targetRight, self._fallbackPos[2])

	local taskAssignments = {}
	taskAssignments[self._robots[self._assignments[1]]] = { class = StopAttack, params = {} }

	if self._targetLeft then
		taskAssignments[self._robots[self._assignments[2]]] = { class = ManMark, params = { self._targetLeft } }
	else
		taskAssignments[self._robots[self._assignments[2]]] = { class = MoveToPos, params = { self._fallbackPos[1] } }
	end
	if self._targetRight then
		taskAssignments[self._robots[self._assignments[3]]] = { class = ManMark, params = { self._targetRight } }
	else
		taskAssignments[self._robots[self._assignments[3]]] = { class = MoveToPos, params = { self._fallbackPos[2] } }
	end

	return taskAssignments, self._robots[1]
end

return KickOffDefensive