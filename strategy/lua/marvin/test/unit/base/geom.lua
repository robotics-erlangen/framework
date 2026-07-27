--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

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
		-- line with no direction and base point outside the corridor
		local p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 0), Vector(0, 0), Vector(1, 1), Vector(1, 0), 0.5)
		assert_equal(p1, nil)
		assert_equal(p2, nil)
		assert_equal(l1, nil)
		assert_equal(l2, nil)

		-- line with no direction and base point inside the corridor
		local p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(1, 1), Vector(0, 0), Vector(1, 1), Vector(1, 0), 0.5)
		assert_equal(p1, nil)
		assert_equal(p2, nil)
		assert_equal(l1, -math.huge)
		assert_equal(l2, math.huge)

		-- line inside the corridor
		local p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 1), Vector(1, 0), Vector(1, 1), Vector(1, 0), 0.5)
		assert_equal(p1, nil)
		assert_equal(p2, nil)
		assert_equal(l1, -math.huge)
		assert_equal(l2, math.huge)

		-- line outside the corridor parallel (->no intersection)
		local p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 100), Vector(1, 0), Vector(1, 1), Vector(1, 0), 0.5)
		assert_equal(p1, nil)
		assert_equal(p2, nil)
		assert_equal(l1, nil)
		assert_equal(l2, nil)

		-- line perpendicular to corridor
		local p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 100), Vector(0, -1), Vector(1, 1), Vector(1, 0), 0.5)
		assert_equal(p1, Vector(0, 1.5))
		assert_equal(p2, Vector(0, 0.5))
		assert_equal(l1, 98.5)
		assert_equal(l2, 99.5)

		-- regular case
		local p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 0), Vector(1, 1), Vector(2, 0), Vector(0, 1), 1)
		assert_equal(p1, Vector(1, 1))
		assert_equal(p2, Vector(3, 3))
		assert_equal(l1, 1)
		assert_equal(l2, 3)

		-- corridor with width = 0
		local p1, p2, l1, l2 = geom.intersectLineCorridor(Vector(0, 0), Vector(1, 1), Vector(2, 0), Vector(0, 1), 0)
		assert_equal(p1, Vector(2, 2))
		assert_equal(p2, Vector(2, 2))
		assert_equal(l1, 2)
		assert_equal(l2, 2)
	end)
end)
