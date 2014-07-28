--[[
--- Allows running an analysis module before / after each strategy run
module "Processor"
]]--
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
