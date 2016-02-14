local Entrypoints = require "../base/entrypoints"

local function tmp()
end

local function wrapper_const(func)
	return func
end

test("base.entrypoints", function ()
	local name = "test/unique/sfghdflhmcslkhcdfgdfjdc"
	Entrypoints.add(name, tmp)

	local eps = Entrypoints.get(wrapper_const)
	assert_not_nil(eps[name], "Entrypoint is missing")
	assert_equal(eps[name], tmp, "Wrong wrapper function got called")
end)
