local Entrypoints = require "../base/entrypoints"

local function tmp()
end

local function wrapper_const(func)
	return func
end

local function wrapper_other(_func)
	return wrapper_other
end

test("base.entrypoints", function ()
	local name = "test/unique/sfghdflhmcslkhcdfgdfjdc"
	Entrypoints.add(name, tmp)

	local eps = Entrypoints.get(wrapper_const)
	assert_not_nil(eps[name], "Entrypoint is missing")
	assert_equal(eps[name], tmp, "Wrong wrapper function got called")

	local eps2 = Entrypoints.get(wrapper_other)
	assert_equal(eps2[name], wrapper_other, "Wrong wrapper function got called")
end)
