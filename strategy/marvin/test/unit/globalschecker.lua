local GlobalsChecker = require "../base/globalschecker"

local function set_global()
	-- explicitly access the global table as telescope calls the function with
	-- an function environment
	_G.globalValue = 5
end

test("base.globalschecker", function ()
	-- in debug mode every access to an undefined global is an error
	assert_error(set_global, "Must not write undefined globals")
	assert_error(function () log(globalValue) end, "Must not read undefined globals")
	assert_not_error(function()
		local oldAmun = amun
		amun = 42
		amun = oldAmun
	end)
end)
