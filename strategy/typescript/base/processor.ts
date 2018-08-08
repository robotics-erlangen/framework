--[[
--- Allows running an analysis module before / after each strategy run
module "Processor"
]]--

--[[***********************************************************************
*   Copyright 2015 Michael Eischer, Christian Lobmeier                    *
*   Robotics Erlangen e.V.                                                *
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

local Processor = {}

local Class = require "../base/class"
local Process = require "../base/process"


local preprocs = {}
local postprocs = {}

local function add(procs, proc)
	assert(proc and Class.instanceOf(proc, Process), "no valid process!")
	table.insert(procs, proc)
end

--- Adds a process for runnning before the strategy
-- @name addPre
-- @param proc Process - Process object to be run
function Processor.addPre(proc)
	add(preprocs, proc)
end

--- Adds a process for runnning after the strategy
-- @name addPost
-- @param proc Process - Process object to be run
function Processor.addPost(proc)
	add(postprocs, proc)
end

local function run(procs)
	for i = #procs,1,-1 do
		local proc = procs[i]
		proc:run()
		if proc:isFinished() then
			table.remove(procs, i)
		end
	end
end

--- Runs all proccess object scheduled before the strategy.
-- Should be called by the entrypoint wrapper
-- @name pre
function Processor.pre()
	run(preprocs)
end

--- Runs all proccess object scheduled after the strategy.
-- Should be called by the entrypoint wrapper
-- @name post
function Processor.post()
	run(postprocs)
end

return Processor
