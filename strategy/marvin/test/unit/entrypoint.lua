local Injector = require "test/unit/injector"

local function tmp()
end

local function wrapper_const(func)
	return func
end

local function wrapper_other(_func)
	return wrapper_other
end

context("base.entrypoints", function()
	local Entrypoints
	before(function()
		local injector = Injector(nil, true)
		Entrypoints = injector:load("../base/entrypoints")
	end)

	test("wrapper", function ()
		local name = "test"
		Entrypoints.add(name, tmp)

		local eps = Entrypoints.get(wrapper_const)
		assert_not_nil(eps[name], "Entrypoint is missing")
		assert_equal(eps[name], tmp, "Wrong wrapper function got called")

		local eps2 = Entrypoints.get(wrapper_other)
		assert_equal(eps2[name], wrapper_other, "Wrong wrapper function got called")
	end)

	test("duplicates", function()
		Entrypoints.add("test", tmp)
		assert_error(function() Entrypoints.add("test", tmp) end,
				"Entrypoints may not be overwritten")
	end)

end)
