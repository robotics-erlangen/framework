local geom = require "../base/geom"

context("base.geom", function ()
	test("intersectLineLine", function ()
		local ret, l1, l2 = geom.intersectLineLine(Vector(0, 0), Vector(0, 1), Vector(0, 1), Vector(0, -1))
		assert_equal(ret, Vector(0, 0))
		assert_equal(l1, 0)
		assert_equal(l2, 0)

		local ret, l1, l2 = geom.intersectLineLine(Vector(0, 0), Vector(0, 1), Vector(0.1, 1), Vector(0, -1))
		assert_equal(ret, nil)
		assert_equal(l1, nil)
		assert_equal(l2, nil)

		local ret, l1, l2 = geom.intersectLineLine(Vector(0, 0), Vector(0, 1), Vector(1, 1), Vector(1, 0))
		assert_equal(ret, Vector(0, 1))
		assert_equal(l1, 1)
		assert_equal(l2, -1)
	end)
end)
