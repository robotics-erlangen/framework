local Injector = require "test/unit/injector"

local function testfuncs(teamIsBlue)
	return function()
		local Coordinates
		before(function()
			local injector = Injector(nil)
			Coordinates = injector:load("../base/coordinates")
			Coordinates._setIsBlue(teamIsBlue)
		end)

		test("vector", function()
			local vec = Vector(1, 2)
			local vec2 = Coordinates.toGlobal(vec)
			local vec3 = Coordinates.toLocal(vec)
			if teamIsBlue then
				assert_equal(vec2.x, -vec.x)
				assert_equal(vec2.y, -vec.y)
				assert_equal(vec3.x, -vec.x)
				assert_equal(vec3.y, -vec.y)
				assert_false(vec2:isReadonly())
				assert_false(vec3:isReadonly())
			else
				assert_equal(vec2.x, vec.x)
				assert_equal(vec2.y, vec.y)
				assert_equal(vec3.x, vec.x)
				assert_equal(vec3.y, vec.y)
				assert_false(vec2:isReadonly())
				assert_false(vec3:isReadonly())
			end
			local vec = Vector(1, 2, true)
			local vec2 = Coordinates.toGlobal(vec)
			local vec3 = Coordinates.toLocal(vec)
			if teamIsBlue then
				assert_equal(vec2.x, -vec.x)
				assert_equal(vec2.y, -vec.y)
				assert_equal(vec3.x, -vec.x)
				assert_equal(vec3.y, -vec.y)
				assert_true(vec2:isReadonly())
				assert_true(vec3:isReadonly())
			else
				assert_equal(vec2.x, vec.x)
				assert_equal(vec2.y, vec.y)
				assert_equal(vec3.x, vec.x)
				assert_equal(vec3.y, vec.y)
				assert_true(vec2:isReadonly())
				assert_true(vec3:isReadonly())
			end
		end)

		test("direction", function()
			local dir = math.pi/4
			local dir2 = Coordinates.toGlobal(dir)
			local dir3 = Coordinates.toLocal(dir)
			if teamIsBlue then
				assert_equal(dir2, dir + math.pi)
				assert_equal(dir3, dir + math.pi)
			else
				assert_equal(dir2, dir)
				assert_equal(dir3, dir)
			end
			local dir = math.pi*5/4
			local dir2 = Coordinates.toGlobal(dir)
			local dir3 = Coordinates.toLocal(dir)
			if teamIsBlue then
				assert_equal(dir2, dir - math.pi)
				assert_equal(dir3, dir - math.pi)
			else
				assert_equal(dir2, dir)
				assert_equal(dir3, dir)
			end
		end)

		test("list", function()
			local list = { Vector(0, 1), Vector(1, 2), math.pi/4 }
			local list2 = Coordinates.listToGlobal(list)

			if teamIsBlue then
				assert_deep_equal({ -list[1], -list[2], math.pi*5/4 }, list2)
			else
				assert_deep_equal(list, list2)
			end
		end)

		test("sticky readonly", function()
			local vec = Vector.createReadOnly(1, 2)
			local vec2 = Coordinates.toGlobal(vec)
			local vec3 = Coordinates.toLocal(vec)
			assert_true(vec2:isReadonly())
			assert_true(vec3:isReadonly())

			local list = { Vector.createReadOnly(0, 1), Vector.createReadOnly(1, 2) }
			local list2 = Coordinates.listToGlobal(list)
			assert_true(list2[1]:isReadonly())
			assert_true(list2[2]:isReadonly())
		end)
	end
end


context("base.coordinates", function()
	context("yellow team", testfuncs(false))
	context("blue team", testfuncs(true))
end)
