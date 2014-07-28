--[[
--- Is run be the processor before / after each strategy run.
-- Subclass the class to create a new process
module "Process"
]]--
local Process = (require "../base/class").new("Process")

--- Execute the process actions here
-- @name run
function Process:run()
	error("stub")
end

--- Tells whether the process is finished.
-- Is called after each call to run
-- @name run
-- @return bool - Process is removed if true
function Process:isFinished()
	error("stub")
end

return Process
