local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"

local tests = require "test/unit/tests"


local total = 0
for _ in pairs(tests) do
	total = total + 1
end

local initialized = false
local testCount = 0
local successfull = 0

-- Note:
-- message printing and tests have to run in subsequent strategy runs 
-- because the printing happens after a strategy run is complete
local namePrinted = false -- set true on the second call of runSingle

local function runSingle(name, test)
	if not namePrinted then
		log("(" .. (testCount+1) .. "/" .. total .. ") Testing " .. name .. " ... ")
		namePrinted = true
	else
		local startTime = amun.getCurrentTime()
		local fine, message = pcall(test)
		local runTime = math.round((amun.getCurrentTime() - startTime)*1000000)/1000
		if fine then
			successfull = successfull + 1
			log("<font color=\"darkgreen\">success (" .. runTime .. "ms)</font>")
		else
			log("<font color=\"red\">fail (" .. runTime .. "ms): " .. message .. "</font>")
		end
		testCount = testCount + 1
		namePrinted = false
	end
	if testCount == total then
		local failing = total-successfull
		if failing == 0 then
			log("<font color=\"darkgreen\"> All testcases successfull :)</font>")
		else
			log("<font color=\"red\">" .. failing .. " failing testcase" 
				.. (failing > 1 and "s" or "") ..  "!</font>")
		end
	end
end

local curTestName, curTestFn = next(tests)
local function runNextTest() -- for entrypoint all
	runSingle(curTestName, curTestFn)
	if not namePrinted then
		curTestName, curTestFn = next(tests, curTestName)
	end
end

local function init()
	if not pcall(require, 'debug') then 
		error("Debugging not enabled!") 
	end
	local timeout = 1000000000 -- number of instructions before hook is called
	debug.sethook(function() error("Timeout (adjustable in tests/unit/init.lua)") end, "", timeout)
	initialized = true
end

Entrypoints.add("Unit Tests/ all", function()
	if not initialized then
		init()
	end
	if curTestName then
		runNextTest()
	end
end)

for name, test in pairs(tests) do
	Entrypoints.add("Unit Tests/" .. name, function()
		if not initialized then
			init()
			total = 1
			runSingle(name, test)
		end
		if namePrinted then
			runSingle(name, test)
		end
	end)
end
