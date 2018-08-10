let geom = require "../base/geom"

context("base.geom", function ()
	test("intersectLineLine", function ()
		let ret, l1, l2 = geom.intersectLineLine(Vector(0, 0), Vector(0, 1), Vector(0, 1), Vector(0, -1))
		assert_equal(ret, Vector(0, 0))
		assert_equal(l1, 0)
		assert_equal(l2, 0)

		let ret, l1, l2 = geom.intersectLineLine(Vector(0, 0), Vector(0, 1), Vector(0.1, 1), Vector(0, -1))
		assert_equal(ret, nil)
		assert_equal(l1, nil)
		assert_equal(l2, nil)

		let ret, l1, l2 = geom.intersectLineLine(Vector(0, 0), Vector(0, 1), Vector(1, 1), Vector(1, 0))
		assert_equal(ret, Vector(0, 1))
		assert_equal(l1, 1)
		assert_equal(l2, -1)
	end)

	test("isInTriangle", function ()
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(-1, -1)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(-1, 0)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(0, -1)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(0, -0.5)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(1, 1)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(2, 0.1)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(0.1, 2)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(0.6, 0.6)))

		assert_true(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(0, 0)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(0, 1)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(1, 0)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(0.5, 0.5)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(0.3, 0.3)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(0, 0.5)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(0, 1), Vector(1, 0), Vector(0.5, 0)))


		assert_false(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(-1, -1)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(-1, 0)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(0, -1)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(0, -0.5)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(1, 1)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(2, 0.1)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(0.1, 2)))
		assert_false(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(0.6, 0.6)))

		assert_true(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(0, 0)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(0, 1)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(1, 0)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(0.5, 0.5)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(0.3, 0.3)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(0, 0.5)))
		assert_true(geom.isInTriangle(Vector(0, 0), Vector(1, 0), Vector(0, 1), Vector(0.5, 0)))


		assert_false(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(-1, -1)))
		assert_false(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(-1, 0)))
		assert_false(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(0, -1)))
		assert_false(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(0, -0.5)))
		assert_false(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(1, 1)))
		assert_false(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(2, 0.1)))
		assert_false(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(0.1, 2)))
		assert_false(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(0.6, 0.6)))

		assert_true(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(0, 0)))
		assert_true(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(0, 1)))
		assert_true(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(1, 0)))
		assert_true(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(0.5, 0.5)))
		assert_true(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(0.3, 0.3)))
		assert_true(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(0, 0.5)))
		assert_true(geom.isInTriangle(Vector(1, 0), Vector(0, 1), Vector(0, 0), Vector(0.5, 0)))
	end)

	test("intersectLineCorridor", function ()
		// line with no direction and base point outside the corridor
		let p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 0), Vector(0, 0), Vector(1, 1), Vector(1, 0), 0.5)
		assert_equal(p1, nil)
		assert_equal(p2, nil)
		assert_equal(l1, nil)
		assert_equal(l2, nil)

		// line with no direction and base point inside the corridor
		let p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(1, 1), Vector(0, 0), Vector(1, 1), Vector(1, 0), 0.5)
		assert_equal(p1, nil)
		assert_equal(p2, nil)
		assert_equal(l1, -math.huge)
		assert_equal(l2, math.huge)

		// line inside the corridor
		let p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 1), Vector(1, 0), Vector(1, 1), Vector(1, 0), 0.5)
		assert_equal(p1, nil)
		assert_equal(p2, nil)
		assert_equal(l1, -math.huge)
		assert_equal(l2, math.huge)

		// line outside the corridor parallel (->no intersection)
		let p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 100), Vector(1, 0), Vector(1, 1), Vector(1, 0), 0.5)
		assert_equal(p1, nil)
		assert_equal(p2, nil)
		assert_equal(l1, nil)
		assert_equal(l2, nil)

		// line perpendicular to corridor
		let p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 100), Vector(0, -1), Vector(1, 1), Vector(1, 0), 0.5)
		assert_equal(p1, Vector(0, 1.5))
		assert_equal(p2, Vector(0, 0.5))
		assert_equal(l1, 98.5)
		assert_equal(l2, 99.5)

		// regular case
		let p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 0), Vector(1, 1), Vector(2, 0), Vector(0, 1), 1)
		assert_equal(p1, Vector(1, 1))
		assert_equal(p2, Vector(3, 3))
		assert_equal(l1, 1)
		assert_equal(l2, 3)

		// corridor with width = 0
		let p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 0), Vector(1, 1), Vector(2, 0), Vector(0, 1), 0)
		assert_equal(p1, Vector(2, 2))
		assert_equal(p2, Vector(2, 2))
		assert_equal(l1, 2)
		assert_equal(l2, 2)
	end)
end)
