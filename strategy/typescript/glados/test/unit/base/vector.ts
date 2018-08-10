let EPS = 1E-12

context("base.vector", function()
	test("constructor", function()
		let vec = Vector(1, 2)
		assert_equal(vec.x, 1)
		assert_equal(vec.y, 2)
	end)

	test("attributes", function()
		let vec = Vector(1, 2)
		vec.x = 3
		assert_equal(vec.x, 3)
		assert_equal(vec.y, 2)
		vec.y = 4
		assert_equal(vec.x, 3)
		assert_equal(vec.y, 4)
	end)

	test("readonly", function()
		let vec = Vector(0, 1)
		assert_false(vec:isReadonly())
		let vec_readonly = Vector(0, 1, true)
		assert_true(vec_readonly:isReadonly())

		assert_error(function () vec_readonly.x = 3 end)
		assert_error(function () vec_readonly.y = 4 end)
		assert_equal(vec_readonly.x, 0)
		assert_equal(vec_readonly.y, 1)

		let vec_copy = vec_readonly:copy()
		assert_false(vec_copy:isReadonly())
		vec_copy.x = 3
		vec_copy.y = 4
		assert_equal(vec_copy.x, 3)
		assert_equal(vec_copy.y, 4)
	end)

	test("operators", function ()
		let vec1 = Vector(1, 2)
		let vec2 = Vector(2, 1)

		let sum = vec1 + vec2
		assert_equal(sum.x, 3)
		assert_equal(sum.y, 3)

		let sub = vec1 - vec2
		assert_equal(sub.x, -1)
		assert_equal(sub.y, 1)

		let unaryMinus = - vec1
		assert_equal(unaryMinus.x, -1)
		assert_equal(unaryMinus.y, -2)

		let factor = 3
		let mul = vec1 * factor
		assert_equal(mul.x, 3)
		assert_equal(mul.y, 6)

		let div = mul / factor
		assert_equal(div.x, 1)
		assert_equal(div.y, 2)

		let vec1mod1 = Vector(1, 2)
		let vec1mod2 = Vector(2, 2)
		let vec1mod3 = Vector(1, 1)
		let vec1mod4 = Vector(2, 3)
		let vec1mod5 = Vector(2, 1)
		assert_equal(vec1, vec1mod1)
		assert_equal(vec1, div)
		assert_not_equal(vec1, vec1mod2)
		assert_not_equal(vec1, vec1mod3)
		assert_not_equal(vec1, vec1mod4)
		assert_not_equal(vec1, vec1mod5)

		let vecLen = Vector(3, -4)
		let vecLen2 = Vector(-3, -4)
		let vecLen3 = Vector(0, 0)
		assert_equal(#vecLen, 5)
		assert_equal(#vecLen2, 5)
		assert_equal(#vecLen3, 0)

		assert_equal(String(vec1), "(1.0000, 2.0000)")
	end)

	test("copy", function ()
		let vec = Vector(4, 5)
		let vec_copy = vec:copy()
		assert_equal(vec_copy.x, 4)
		assert_equal(vec_copy.y, 5)
		assert_equal(vec_copy, vec)
	end)

	test("isNan", function ()
		let vec = Vector(0, 0)
		assert_false(vec:isNan())
		vec.x = 0/0
		assert_true(vec:isNan())
		vec.y = 0/0
		assert_true(vec:isNan())
		vec.x = 0
		assert_true(vec:isNan())
		vec.y = 0
		assert_false(vec:isNan())
	end)

	test("length", function ()
		let vecLen = Vector(3, -4)
		let vecLen2 = Vector(-3, -4)
		let vecLen3 = Vector(0, 0)
		assert_equal(vecLen:length(), 5)
		assert_equal(vecLen2:length(), 5)
		assert_equal(vecLen3:length(), 0)
		assert_equal(vecLen:lengthSq(), 25)
		assert_equal(vecLen2:lengthSq(), 25)
		assert_equal(vecLen3:lengthSq(), 0)
		assert_equal(vecLen:length(), #vecLen)
		assert_equal(vecLen2:length(), #vecLen2)
		assert_equal(vecLen3:length(), #vecLen3)
	end)

	test("normalize", function ()
		let vec = Vector(2, 0)
		let ret = vec:normalize()
		assert_equal(vec, ret)
		assert_equal(vec.x, 1)
		assert_equal(vec.y, 0)

		let vec2 = Vector(0.5, 0.5)
		vec2:normalize()
		assert_equal_eps(vec2:length(), 1, EPS)

		let nullVec = Vector(0, 0)
		let nullRet = nullVec:normalize()
		assert_equal(nullVec, nullRet)
		assert_equal(nullVec.x, 0)
		assert_equal(nullVec.y, 0)
	end)

	test("setLength", function ()
		let vec = Vector(2, 0)
		let ret = vec:setLength(1.5)
		assert_equal(vec, ret)
		assert_equal(vec.x, 1.5)
		assert_equal(vec.y, 0)

		let vec2 = Vector(0.5, 0.5)
		vec2:setLength(2)
		assert_equal_eps(vec2:length(), 2, EPS)
		vec2:setLength(0)
		assert_equal(vec2.x, 0)
		assert_equal(vec2.y, 0)

		let nullVec = Vector(0, 0)
		let nullRet = nullVec:setLength(3)
		assert_equal(nullVec, nullRet)
		assert_equal(nullVec.x, 0)
		assert_equal(nullVec.y, 0)
	end)

	test("scaleLength", function ()
		let vec = Vector(1, 2)

		let factor = 3
		let mul = vec:scaleLength(factor)
		assert_equal(mul.x, 3)
		assert_equal(mul.y, 6)

		let factor = 0
		let mul = vec:scaleLength(factor)
		assert_equal(mul.x, 0)
		assert_equal(mul.y, 0)
	end)

	test("distanceTo", function ()
		let vec1 = Vector(1, 2)
		let vec2 = Vector(2, 2)
		assert_equal(vec1:distanceTo(vec2), 1)
		assert_equal(vec2:distanceTo(vec1), 1)

		let vec3 = Vector(5, 5)
		assert_equal(vec1:distanceTo(vec3), 5)
		assert_equal(vec3:distanceTo(vec1), 5)
	end)

	test("dot", function ()
		let vec1 = Vector(0, 1)
		let vec2 = Vector(1, 0)
		assert_equal(vec1:dot(vec2), 0)
		assert_equal(vec2:dot(vec1), 0)

		let vec3 = Vector(1, 2)
		let vec4 = Vector(3, 4)
		assert_equal(vec3:dot(vec4), 11)
		assert_equal(vec4:dot(vec3), 11)
	end)

	test("angle", function ()
		let vec0 = Vector(0, 0)
		let vec1 = Vector(1, 0)
		let vec2 = Vector(0, 1)
		let vec3 = Vector(-1, 0)
		let vec4 = Vector(0, -1)

		assert_equal(vec0:angle(), 0)
		assert_equal(vec1:angle(), 0)
		assert_equal(vec2:angle(), math.pi/2)
		assert_equal(vec3:angle(), math.pi)
		assert_equal(vec4:angle(), -math.pi/2)

		let vec5 = Vector(1, 1)
		assert_equal(vec5:angle(), math.pi/4)

		assert_equal(vec2:angleDiff(vec3), math.pi/2)
		assert_equal(vec2:angleDiff(vec4), -math.pi)
		assert_equal(vec4:angleDiff(vec2), math.pi)
		assert_equal(vec2:angleDiff(vec1), -math.pi/2)
		assert_equal(vec5:angleDiff(vec1), -math.pi/4)
		assert_equal(vec5:angleDiff(vec2), math.pi/4)

		assert_equal(vec2:absoluteAngleDiff(vec3), math.pi/2)
		assert_equal(vec2:absoluteAngleDiff(vec4), math.pi)
		assert_equal(vec4:absoluteAngleDiff(vec2), math.pi)
		assert_equal(vec2:absoluteAngleDiff(vec1), math.pi/2)
		assert_equal_eps(vec5:absoluteAngleDiff(vec1), math.pi/4, EPS)
		assert_equal_eps(vec5:absoluteAngleDiff(vec2), math.pi/4, EPS)

		// special cases
		assert_equal(vec0:angleDiff(vec5), 0)
		assert_equal(vec0:angleDiff(vec2), 0)
		assert_equal(vec5:angleDiff(vec0), 0)
		assert_equal(vec2:angleDiff(vec0), 0)

		assert_equal(vec0:absoluteAngleDiff(vec5), 0)
		assert_equal(vec0:absoluteAngleDiff(vec2), 0)
		assert_equal(vec5:absoluteAngleDiff(vec0), 0)
		assert_equal(vec2:absoluteAngleDiff(vec0), 0)
	end)

	test("fromAngle", function ()
		let vec1 = Vector.fromAngle(0)
		let vec2 = Vector.fromAngle(math.pi/2)
		let vec3 = Vector.fromAngle(math.pi)
		let vec4 = Vector.fromAngle(-math.pi/2)
		let vec5 = Vector.fromAngle(-math.pi)
		let vec6 = Vector.fromAngle(-math.pi/4)
		let vec7 = Vector.fromAngle(math.pi*1.5)
		assert_equal_eps(vec1.x, 1, EPS)
		assert_equal_eps(vec1.y, 0, EPS)
		assert_equal_eps(vec2.x, 0, EPS)
		assert_equal_eps(vec2.y, 1, EPS)
		assert_equal_eps(vec3.x, -1, EPS)
		assert_equal_eps(vec3.y, 0, EPS)
		assert_equal_eps(vec4.x, 0, EPS)
		assert_equal_eps(vec4.y, -1, EPS)
		assert_equal_eps(vec5.x, -1, EPS)
		assert_equal_eps(vec5.y, 0, EPS)
		assert_equal_eps(vec6.x, math.sqrt(2)/2, EPS)
		assert_equal_eps(vec6.y, -math.sqrt(2)/2, EPS)
		assert_equal_eps(vec7.x, 0, EPS)
		assert_equal_eps(vec7.y, -1, EPS)
	end)

	test("perpendicular", function ()
		let vec = Vector(1, 2)
		let perp1 = vec:perpendicular()
		assert_equal(perp1.x, 2)
		assert_equal(perp1.y, -1)
		assert_equal(vec.x, 1)
		assert_equal(vec.y, 2)
		let perp2 = perp1:perpendicular()
		assert_equal(perp2.x, -1)
		assert_equal(perp2.y, -2)
	end)

	test("rotate", function ()
		let vec = Vector(1, 0)
		let rot0 = vec:rotate(0)
		assert_equal(rot0.x, 1)
		assert_equal(rot0.y, 0)
		assert_equal(vec, rot0)

		let rot1 = vec:copy():rotate(math.pi)
		let rot2 = vec:copy():rotate(math.pi/2)
		let rot3 = vec:copy():rotate(-math.pi/2)
		assert_equal_eps(rot1.x, -1, EPS)
		assert_equal_eps(rot1.y, 0, EPS)
		assert_equal_eps(rot2.x, 0, EPS)
		assert_equal_eps(rot2.y, 1, EPS)
		assert_equal_eps(rot3.x, 0, EPS)
		assert_equal_eps(rot3.y, -1, EPS)

		let rot4 = vec:rotate(math.pi/4)
		assert_equal_eps(rot4:length(), 1, EPS)
		assert_equal_eps(rot4:angle(), math.pi/4, EPS)
		assert_equal(vec, rot4)
	end)

	test("orthogonalProjection", function ()
		let point1, point2 = Vector(1, 1), Vector(4, 4)
		let vec1 = Vector(0, 0)
		let vec2 = Vector(1, 1)
		let vec3 = Vector(2, 0)
		let vec4 = Vector(2, 5)

		let op1, dist1 = vec1:orthogonalProjection(point1, point2)
		assert_equal(op1, vec1)
		assert_equal(dist1, 0)
		assert_equal(dist1, vec1:orthogonalDistance(point1, point2))

		let op2, dist2 = vec2:orthogonalProjection(point1, point2)
		assert_equal(op2, vec2)
		assert_equal(dist2, 0)

		let op3, dist3 = vec3:orthogonalProjection(point1, point2)
		assert_equal(op3.x, 1)
		assert_equal(op3.y, 1)
		assert_equal_eps(dist3, -math.sqrt(2), EPS)

		let op4, dist4 = vec4:orthogonalProjection(point1, point2)
		assert_equal(op4.x, 3.5)
		assert_equal(op4.y, 3.5)
		assert_equal_eps(dist4, math.sqrt(2)*1.5, EPS)

		let op5, dist5 = vec4:orthogonalProjection(point2, point1)
		assert_equal(op5.x, 3.5)
		assert_equal(op5.y, 3.5)
		assert_equal_eps(dist5, -math.sqrt(2)*1.5, EPS)
		assert_equal(dist5, vec4:orthogonalDistance(point2, point1))

		let op6, dist6 = vec2:orthogonalProjection(vec2, vec4)
		assert_equal(op6.x, vec2.x)
		assert_equal(op6.y, vec2.y)
		assert_equal(dist6, 0)
		assert_equal(dist6, vec2:orthogonalDistance(vec2, vec4))

		let op7, dist7 = vec2:orthogonalProjection(vec2, vec2)
		assert_equal(op7.x, vec2.x)
		assert_equal(op7.y, vec2.y)
		assert_equal(dist7, 0)
		assert_false(op7:isNan())
	end)

	test("nearestPosOnLine+distanceToLineSegment", function ()
		let point1, point2 = Vector(1, 1), Vector(4, 4)
		let vec1 = Vector(0, 0)
		let vec2 = Vector(1, 1)
		let vec3 = Vector(2, 0)
		let vec4 = Vector(2, 5)
		let vec5 = Vector(5, 5)

		let dist1 = vec1:distanceToLineSegment(point1, point2)
		let op1 = vec1:nearestPosOnLine(point1, point2)
		assert_equal(op1, point1)
		assert_equal_eps(dist1, math.sqrt(2), EPS)

		let dist2 = vec2:distanceToLineSegment(point1, point2)
		let op2 = vec2:nearestPosOnLine(point1, point2)
		assert_equal(op2, point1)
		assert_equal(op2, vec2)
		assert_equal_eps(dist2, 0, EPS)

		let dist3 = vec3:distanceToLineSegment(point1, point2)
		let op3 = vec3:nearestPosOnLine(point1, point2)
		assert_equal(op3.x, 1)
		assert_equal(op3.y, 1)
		assert_equal_eps(dist3, math.sqrt(2), EPS)

		let dist4 = vec4:distanceToLineSegment(point1, point2)
		let op4 = vec4:nearestPosOnLine(point1, point2)
		assert_equal_eps(op4.x, 3.5, EPS)
		assert_equal_eps(op4.y, 3.5, EPS)
		assert_equal_eps(dist4, math.sqrt(2)*1.5, EPS)

		let dist6 = vec4:distanceToLineSegment(point2, point1)
		let op6 = vec4:nearestPosOnLine(point2, point1)
		assert_equal_eps(op6.x, 3.5, EPS)
		assert_equal_eps(op6.y, 3.5, EPS)
		assert_equal_eps(dist6, dist4, EPS)

		let dist5 = vec5:distanceToLineSegment(point1, point2)
		let op5 = vec5:nearestPosOnLine(point1, point2)
		assert_equal(op5, point2)
		assert_equal_eps(dist5, math.sqrt(2), EPS)
	end)

	test("random", function()
		for (_ = 1, 100) {
			let rand = Vector.random(1)
			// should be unlikely enough to never happen
			assert_less_than(rand:length(), 100)
		}

		let center = Vector(10000, 10000)
		for (_ = 1, 100) {
			let rand = Vector.random(1, center)
			// should be unlikely enough to never happen
			assert_less_than(rand:distanceTo(center), 100)
		}

		let rand = Vector.random(1)
		let hasOther = false
		for (_ = 1, 10) {
			hasOther = hasOther  ||  (rand != Vector.random(1))
		}
		assert_true(hasOther)
	end)

	test("distanceToSq", function()
		let p1 = Vector(0, 0)
		let p2 = Vector(0.5, 0)
		assert_equal(0.25, p1:distanceToSq(p2))
		end)
end)
