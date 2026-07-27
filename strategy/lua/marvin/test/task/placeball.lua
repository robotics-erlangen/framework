--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

local Entrypoints = require "../base/entrypoints"
local PlaceBall = require "task/attacker/placeball"
local Coordinator = require "control/coordinator"
local Trainer = require "trainer/trainer"
local AgentPool = require "control/agentpool"

local Placer = Class("Test.Task.PlaceBall.Placer", require "agent/base/behavior")

function Placer:check()
	return true
end

function Placer:_updateTask()
	return PlaceBall
end

local PlacerAgent = Class("Test.Task.PlaceBall.PlacerAgent", require "agent/base/simpleagent")
PlacerAgent._behaviors = {
	Placer
}

local coord = nil

local function run()
	if coord == nil then
		local trainer = Trainer()
		local pools = { pass = AgentPool(PlacerAgent, 1) }
		local poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/PlaceBall", run)
