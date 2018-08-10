let Injector = require "test/unit/injector"

let testfuncs = function (teamIsBlue) {
	return function()
		let Coordinates
		before(function()
			let injector = Injector(nil)
			Coordinates = injector:load("../base/coordinates")
			Coordinates._setIsBlue(teamIsBlue)
		end)

		test("vector", function()
			let vec = Vector(1, 2)
			let vec2 = Coordinates.toGlobal(vec)
			let vec3 = Coordinates.toLocal(vec)
			if (teamIsBlue) {
				assert_equal(vec2.x, -vec.x)
				assert_equal(vec2.y, -vec.y)
				assert_equal(vec3.x, -vec.x)
				assert_equal(vec3.y, -vec.y)
				assert_false(vec2:isReadonly())
				assert_false(vec3:isReadonly())
			} else {
				assert_equal(vec2.x, vec.x)
				assert_equal(vec2.y, vec.y)
				assert_equal(vec3.x, vec.x)
				assert_equal(vec3.y, vec.y)
				assert_false(vec2:isReadonly())
				assert_false(vec3:isReadonly())
			}
			let vec = Vector(1, 2, true)
			let vec2 = Coordinates.toGlobal(vec)
			let vec3 = Coordinates.toLocal(vec)
			if (teamIsBlue) {
				assert_equal(vec2.x, -vec.x)
				assert_equal(vec2.y, -vec.y)
				assert_equal(vec3.x, -vec.x)
				assert_equal(vec3.y, -vec.y)
				assert_true(vec2:isReadonly())
				assert_true(vec3:isReadonly())
			} else {
				assert_equal(vec2.x, vec.x)
				assert_equal(vec2.y, vec.y)
				assert_equal(vec3.x, vec.x)
				assert_equal(vec3.y, vec.y)
				assert_true(vec2:isReadonly())
				assert_true(vec3:isReadonly())
			}
		end)

		test("direction", function()
			let dir = math.pi/4
			let dir2 = Coordinates.toGlobal(dir)
			let dir3 = Coordinates.toLocal(dir)
			if (teamIsBlue) {
				assert_equal(dir2, dir + math.pi)
				assert_equal(dir3, dir + math.pi)
			} else {
				assert_equal(dir2, dir)
				assert_equal(dir3, dir)
			}
			let dir = math.pi*5/4
			let dir2 = Coordinates.toGlobal(dir)
			let dir3 = Coordinates.toLocal(dir)
			if (teamIsBlue) {
				assert_equal(dir2, dir - math.pi)
				assert_equal(dir3, dir - math.pi)
			} else {
				assert_equal(dir2, dir)
				assert_equal(dir3, dir)
			}
		end)

		test("list", function()
			let list = { Vector(0, 1), Vector(1, 2), math.pi/4 }
			let list2 = Coordinates.listToGlobal(list)

			if (teamIsBlue) {
				assert_deep_equal({ -list[1], -list[2], math.pi*5/4 }, list2)
			} else {
				assert_deep_equal(list, list2)
			}
		end)

		test("sticky readonly", function()
			let vec = Vector.createReadOnly(1, 2)
			let vec2 = Coordinates.toGlobal(vec)
			let vec3 = Coordinates.toLocal(vec)
			assert_true(vec2:isReadonly())
			assert_true(vec3:isReadonly())

			let list = { Vector.createReadOnly(0, 1), Vector.createReadOnly(1, 2) }
			let list2 = Coordinates.listToGlobal(list)
			assert_true(list2[1]:isReadonly())
			assert_true(list2[2]:isReadonly())
		end)
	}
}


context("base.coordinates", function()
	context("yellow team", testfuncs(false))
	context("blue team", testfuncs(true))
end)
