local Processor = {}
local Class = require "../base/class"
local Process = require "../base/process"

local preprocs = {}
local postprocs = {}

local function add(procs, proc)
	assert(proc and Class.instanceOf(proc, Process), "no valid process!")
	table.insert(procs, proc)
end

function Processor.addPre(proc)
	add(preprocs, proc)
end

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

function Processor.pre()
	run(preprocs)
end

function Processor.post()
	run(postprocs)
end

return Processor
