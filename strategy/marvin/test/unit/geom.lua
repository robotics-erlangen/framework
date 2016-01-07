local geom = require "../base/geom"

return function()
	local ret, l1, l2 = geom.intersectLineLine(Vector(0, 0), Vector(0, 1), Vector(0, 1), Vector(0, -1))
	assert(ret == Vector(0, 0))
	assert(l1 == 0)
	assert(l2 == 0)

	local ret, l1, l2 = geom.intersectLineLine(Vector(0, 0), Vector(0, 1), Vector(0.1, 1), Vector(0, -1))
	assert(ret == nil)
	assert(l1 == nil)
	assert(l2 == nil)

	local ret, l1, l2 = geom.intersectLineLine(Vector(0, 0), Vector(0, 1), Vector(1, 1), Vector(1, 0))
	assert(ret == Vector(0, 1))
	assert(l1 ==  1)
	assert(l2 == -1)
end
