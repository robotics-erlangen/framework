local Volley = Class("Test.Move.Volley", require "group/move/base")

local vis = require "../base/vis"
local World = require "../base/world"
local Freekick = require "agent/attacker/freekick"
local Stop = require "agent/attacker/stop"
local AcceptPass = require "task/acceptpass"
local Striker = require "task/striker"
local Attack = require "util/attack"

Volley.N_ROBOTS = 2

function Volley.canStart()
	return World.RefereeState == "Stop" or World.RefereeState == "IndirectOffensive"
end

function Volley:_init()
	self._freekickPos = Vector(2.5, 3)
	self._startPos = Vector(-2, 0)
	self._shootPos = Vector(-2, 4)
	self._freekickFlag = false
	self._startMoving = false
end

function Volley:_canContinue()
	return World.RefereeState == "Stop" or World.RefereeState == "IndirectOffensive"
end

function Volley:_updateTasks()
	local taskAssignments = {}

	if World.RefereeState == "Stop" then
		vis.addCircle("ball placement", self._freekickPos, 0.2, vis.colors.red)
		taskAssignments[self._robots[1]] = { behavior = Stop, restart = self._freekickFlag }
		self._freekickFlag = false
	else
		taskAssignments[self._robots[1]] = { behavior = Freekick, restart = not self._freekickFlag }
		self._freekickFlag = true
	end

	local _, passInfo = next(self._inbox.passInfo())
	self._startMoving = Attack.checkPassInfo(self._robots[2], passInfo, self._startMoving)
	if self._startMoving then
		taskAssignments[self._robots[2]] = { class = AcceptPass }
	else
		taskAssignments[self._robots[2]] = { class = Striker, params = { self._startPos, self._shootPos } }
	end

	return taskAssignments, self._robots[1]
end

return Volley
