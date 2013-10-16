local Processor = {}
local Class = require "../base/class"
local Process = require "../base/process"

Processor.preprocs = {}
Processor.postprocs = {}

function Processor.addPre(proc)
	assert(proc and Class.instanceOf(proc, Process), "no valid process!")
	table.insert(Processor.preprocs, post)
end

function Processor.addPost(proc)
	assert(proc and Class.instanceOf(proc, Process), "no valid process!")
	table.insert(Processor.postprocs, post)
end


function Processor.pre()
	for i = #Processor.preprocs,1,-1 do
		local proc = Processor.preprocs[i]
		proc:run()
		if proc:isFinished() then
			table.remove(Processor.preprocs, i)
		end
	end
end

function Processor.post()
	for i = #Processor.postprocs,1,-1 do
		local proc = Processor.postprocs[i]
		proc:run()
		if proc:isFinished() then
			table.remove(Processor.postprocs, i)
		end
	end
end

return Processor
