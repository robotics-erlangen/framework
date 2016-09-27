local GlobalsChecker = require "../base/globalschecker"

local function set_global()
	-- explicitly access the global table as telescope calls the function with
	-- an function environment
	_G.globalValue = 5
end

local function read_global()
	-- luacheck: globals globalValue, ignore tmp
	local tmp = globalValue
end

test("base.globalschecker", function ()
	-- in debug mode every access to an undefined global is an error
	assert_error(set_global, "Must not write undefined globals")
	assert_error(read_global, "Must not read undefined globals")
	assert_not_error(function()
		-- luacheck: globals amun
		local oldAmun = amun
		amun = 42
		amun = oldAmun
	end)

	GlobalsChecker.enable({ globalValue = true })
	assert_not_error(set_global, "Must not block write of defined globals")
	assert_not_error(read_global, "Must not block read of defined globals")
	-- cleanup
	_G.globalValue = nil
	GlobalsChecker.enable({ globalValue = false })
end)
