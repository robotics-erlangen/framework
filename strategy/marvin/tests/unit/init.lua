local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"

local tests = require "tests/unit/tests"

if not pcall(require, 'debug') then 
	error("Debugging not enabled!") 
end

local timeout = 1000000000 -- number of instructions before hook is called
debug.sethook(function() error("Timeout (adjustable in tests/unit/init.lua)") end, "", timeout)

-- logs have to run as a whole strategy run 
-- because they are printed after the strategy is done
local total = 0
for _ in pairs(tests) do
	total = total + 1
end
local successfull = 0
local testCount = 1
local logCount = 1 

local testName, testFunction = next(tests)
local function runTest()
	if testCount == total+1 then -- all tests done
		local failing = total-successfull
		if failing == 0 then
			log("<font color=\"darkgreen\"> All testcases successfull:)</font>")
		else
			log("<font color=\"red\">" .. failing .. " failing testcase" 
				.. (failing > 1 and "s" or "") ..  "!</font>")
		end
		testCount = testCount + 1
		logCount = logCount + 2
	elseif logCount <= testCount then
		log("(" .. (logCount) .. "/" .. total .. ") Testing " .. testName .. " ... ")
		logCount = logCount + 1
	elseif testCount <= total then
		local startTime = amun.getCurrentTime()
		local fine, message = pcall(testFunction)
		local runTime = math.round((amun.getCurrentTime() - startTime)*1000000)
		if fine then
			successfull = successfull + 1
			log("<font color=\"darkgreen\">ok (" .. runTime .. "&#956;s)</font>")
		else
			log("<font color=\"red\">fail (" .. runTime .. "&#956;s): " .. message .. "</font>")
		end
		log("")
		testCount = testCount + 1
		testName, testFunction = next(tests, testName)
	end
end

Entrypoints.add("Unit Tests", function()
	runTest()
end)
