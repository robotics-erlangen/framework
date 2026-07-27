/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
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
**************************************************************************/

import * as MathUtil from "base/mathutil";
import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";

const EPS = 1E-12;

export class BaseVector extends UnitTest {
	public constructor() {
		super();
		this._addTest("constructor", this._testConstructor);
		this._addTest("operators", this._testOperators);
		this._addTest("withX", this._testWithX);
		this._addTest("withY", this._testWithY);
		this._addTest("isNan", this._testIsNan);
		this._addTest("length", this._testLength);
		this._addTest("normalized", this._testNormalized);
		this._addTest("withLength", this._testWithLength);
		this._addTest("distanceTo", this._testDistanceTo);
		this._addTest("dot", this._testDot);
		this._addTest("angle", this._testAngle);
		this._addTest("fromAngle", this._testFromAngle);
		this._addTest("fromPolar", this._testFromPolar);
		this._addTest("perpendicular", this._testPerpendicular);
		this._addTest("rotated", this._testRotated);
		this._addTest("orthogonalProjection", this._testOrthogonalProjection);
		this._addTest("nearestPosOnLine+distanceToLineSegment", this._testNearestPosOnLineAndDistanceToLineSegment);
		this._addTest("random", this._testRandom);
		this._addTest("distanceToSq", this._testDistanceToSq);
		this._addTest("crossProdLength", this._testCrossProdLength);
		this._addTest("orthognalAndParallelComponents", this._testOrthogonalAndParallelComponent);
	}

	private _testConstructor() {
		let vec = new Vector(1, 2);
		this._assert_eq(vec.x, 1);
		this._assert_eq(vec.y, 2);
	}

	private _testOperators() {
		let vec1 = new Vector(1, 2);
		let vec2 = new Vector(2, 1);

		let sum = vec1 + vec2;
		this._assert_eq(sum.x, 3);
		this._assert_eq(sum.y, 3);

		let sub = vec1 - vec2;
		this._assert_eq(sub.x, -1);
		this._assert_eq(sub.y, 1);

		let unaryMinus = -vec1;
		this._assert_eq(unaryMinus.x, -1);
		this._assert_eq(unaryMinus.y, -2);

		let factor = 3;
		let mul = vec1 * factor;
		this._assert_eq(mul.x, 3);
		this._assert_eq(mul.y, 6);

		let div = mul / factor;
		this._assert_eq(div.x, 1);
		this._assert_eq(div.y, 2);

		let vec1mod1 = new Vector(1, 2);
		let vec1mod2 = new Vector(2, 2);
		let vec1mod3 = new Vector(1, 1);
		let vec1mod4 = new Vector(2, 3);
		let vec1mod5 = new Vector(2, 1);
		this._assert_vector_eq(vec1, vec1mod1);
		this._assert_vector_eq(vec1, div);
		this._assert_vector_ne(vec1, vec1mod2);
		this._assert_vector_ne(vec1, vec1mod3);
		this._assert_vector_ne(vec1, vec1mod4);
		this._assert_vector_ne(vec1, vec1mod5);

		let vecLen = new Vector(3, -4);
		let vecLen2 = new Vector(-3, -4);
		let vecLen3 = new Vector(0, 0);
		this._assert_eq(vecLen.length(), 5);
		this._assert_eq(vecLen2.length(), 5);
		this._assert_eq(vecLen3.length(), 0);

		this._assert_eq(vec1._toString(), "Vector(1.00, 2.00)");
	}

	private _testWithX() {
		let vec = new Vector(4, 5);
		let vec_copy = vec.withX(1);
		this._assert_eq(vec_copy.x, 1);
		this._assert_eq(vec_copy.y, 5);
	}

	private _testWithY() {
		let vec = new Vector(4, 5);
		let vec_copy = vec.withY(1);
		this._assert_eq(vec_copy.x, 4);
		this._assert_eq(vec_copy.y, 1);
	}

	/* eslint-disable sonarjs/no-identical-expressions */
	private _testIsNan() {
		let vec = new Vector(0, 0);
		this._assert_false(vec.isNan());
		vec = new Vector(0 / 0, 0);
		this._assert_true(vec.isNan());
		vec = new Vector(0 / 0, 0 / 0);
		this._assert_true(vec.isNan());
		vec = new Vector(0, 0 / 0);
		this._assert_true(vec.isNan());
	}
	/* eslint-enable sonarjs/no-identical-expressions */

	private _testLength() {
		let vecLen = new Vector(3, -4);
		let vecLen2 = new Vector(-3, -4);
		let vecLen3 = new Vector(0, 0);
		this._assert_eq(vecLen.length(), 5);
		this._assert_eq(vecLen2.length(), 5);
		this._assert_eq(vecLen3.length(), 0);
		this._assert_eq(vecLen.lengthSq(), 25);
		this._assert_eq(vecLen2.lengthSq(), 25);
		this._assert_eq(vecLen3.lengthSq(), 0);
		this._assert_eq(vecLen.length(), vecLen.length());
		this._assert_eq(vecLen2.length(), vecLen2.length());
		this._assert_eq(vecLen3.length(), vecLen3.length());
	}

	private _testNormalized() {
		let vec = new Vector(2, 0);
		let res = vec.normalized();
		this._assert_eq(vec.x, 2); // check non-modifying
		this._assert_eq(vec.y, 0);
		this._assert_eq(res.x, 1);
		this._assert_eq(res.y, 0);

		let vec2 = new Vector(0.5, 0.5);
		vec2 = vec2.normalized();
		this._assert_eq_eps(vec2.length(), 1, EPS);

		let nullVec = new Vector(0, 0);
		nullVec = nullVec.normalized();
		this._assert_eq(nullVec.x, 0);
		this._assert_eq(nullVec.y, 0);
	}

	private _testWithLength() {
		let vec = new Vector(2, 0);
		let ret = vec.withLength(1.5);
		this._assert_eq(vec.x, 2);
		this._assert_eq(vec.y, 0);
		this._assert_eq(ret.x, 1.5);
		this._assert_eq(ret.y, 0);

		let vec2 = new Vector(0.5, 0.5);
		vec2 = vec2.withLength(2);
		this._assert_eq_eps(vec2.length(), 2, EPS);
		vec2 = vec2.withLength(0);
		this._assert_eq(vec2.x, 0);
		this._assert_eq(vec2.y, 0);

		let nullVec = new Vector(0, 0);
		let nullRet = nullVec.withLength(3);
		this._assert_eq(nullVec.x, 0);
		this._assert_eq(nullVec.y, 0);
		this._assert_eq(nullRet.x, 0);
		this._assert_eq(nullRet.y, 0);
	}

	private _testDistanceTo() {
		let vec1 = new Vector(1, 2);
		let vec2 = new Vector(2, 2);
		this._assert_eq(vec1.distanceTo(vec2), 1);
		this._assert_eq(vec2.distanceTo(vec1), 1);

		let vec3 = new Vector(5, 5);
		this._assert_eq(vec1.distanceTo(vec3), 5);
		this._assert_eq(vec3.distanceTo(vec1), 5);
	}

	private _testDot() {
		let vec1 = new Vector(0, 1);
		let vec2 = new Vector(1, 0);
		this._assert_eq(vec1.dot(vec2), 0);
		this._assert_eq(vec2.dot(vec1), 0);

		let vec3 = new Vector(1, 2);
		let vec4 = new Vector(3, 4);
		this._assert_eq(vec3.dot(vec4), 11);
		this._assert_eq(vec4.dot(vec3), 11);
	}

	private _testAngle() {
		let vec0 = new Vector(0, 0);
		let vec1 = new Vector(1, 0);
		let vec2 = new Vector(0, 1);
		let vec3 = new Vector(-1, 0);
		let vec4 = new Vector(0, -1);

		this._assert_eq(vec0.angle(), 0);
		this._assert_eq(vec1.angle(), 0);
		this._assert_eq(vec2.angle(), Math.PI / 2);
		this._assert_eq(vec3.angle(), Math.PI);
		this._assert_eq(vec4.angle(), -Math.PI / 2);

		let vec5 = new Vector(1, 1);
		this._assert_eq(vec5.angle(), Math.PI / 4);

		this._assert_eq(vec2.angleDiff(vec3), Math.PI / 2);
		this._assert_eq(vec2.angleDiff(vec4), -Math.PI);
		this._assert_eq(vec4.angleDiff(vec2), Math.PI);
		this._assert_eq(vec2.angleDiff(vec1), -Math.PI / 2);
		this._assert_eq(vec5.angleDiff(vec1), -Math.PI / 4);
		this._assert_eq(vec5.angleDiff(vec2), Math.PI / 4);

		this._assert_eq(vec2.absoluteAngleDiff(vec3), Math.PI / 2);
		this._assert_eq(vec2.absoluteAngleDiff(vec4), Math.PI);
		this._assert_eq(vec4.absoluteAngleDiff(vec2), Math.PI);
		this._assert_eq(vec2.absoluteAngleDiff(vec1), Math.PI / 2);
		this._assert_eq_eps(vec5.absoluteAngleDiff(vec1), Math.PI / 4, EPS);
		this._assert_eq_eps(vec5.absoluteAngleDiff(vec2), Math.PI / 4, EPS);

		// special cases
		this._assert_eq(vec0.angleDiff(vec5), 0);
		this._assert_eq(vec0.angleDiff(vec2), 0);
		this._assert_eq(vec5.angleDiff(vec0), 0);
		this._assert_eq(vec2.angleDiff(vec0), 0);

		this._assert_eq(vec0.absoluteAngleDiff(vec5), 0);
		this._assert_eq(vec0.absoluteAngleDiff(vec2), 0);
		this._assert_eq(vec5.absoluteAngleDiff(vec0), 0);
		this._assert_eq(vec2.absoluteAngleDiff(vec0), 0);
	}

	private _testFromAngle() {
		let vec1 = Vector.fromAngle(0);
		let vec2 = Vector.fromAngle(Math.PI / 2);
		let vec3 = Vector.fromAngle(Math.PI);
		let vec4 = Vector.fromAngle(-Math.PI / 2);
		let vec5 = Vector.fromAngle(-Math.PI);
		let vec6 = Vector.fromAngle(-Math.PI / 4);
		let vec7 = Vector.fromAngle(Math.PI * 1.5);
		this._assert_eq_eps(vec1.x, 1, EPS);
		this._assert_eq_eps(vec1.y, 0, EPS);
		this._assert_eq_eps(vec2.x, 0, EPS);
		this._assert_eq_eps(vec2.y, 1, EPS);
		this._assert_eq_eps(vec3.x, -1, EPS);
		this._assert_eq_eps(vec3.y, 0, EPS);
		this._assert_eq_eps(vec4.x, 0, EPS);
		this._assert_eq_eps(vec4.y, -1, EPS);
		this._assert_eq_eps(vec5.x, -1, EPS);
		this._assert_eq_eps(vec5.y, 0, EPS);
		this._assert_eq_eps(vec6.x, Math.sqrt(2) / 2, EPS);
		this._assert_eq_eps(vec6.y, -Math.sqrt(2) / 2, EPS);
		this._assert_eq_eps(vec7.x, 0, EPS);
		this._assert_eq_eps(vec7.y, -1, EPS);
	}

	private _testFromPolar() {
		let vec1 = Vector.fromPolar(0, 3);
		let vec2 = Vector.fromPolar(Math.PI / 2, 2);
		let vec3 = Vector.fromPolar(Math.PI, 1);
		let vec4 = Vector.fromPolar(-Math.PI / 2, 1);
		let vec5 = Vector.fromPolar(-Math.PI, 1);
		let vec6 = Vector.fromPolar(-Math.PI / 4, 1);
		let vec7 = Vector.fromPolar(Math.PI * 1.5, 1);
		this._assert_eq_eps(vec1.x, 3, EPS);
		this._assert_eq_eps(vec1.y, 0, EPS);
		this._assert_eq_eps(vec2.x, 0, EPS);
		this._assert_eq_eps(vec2.y, 2, EPS);
		this._assert_eq_eps(vec3.x, -1, EPS);
		this._assert_eq_eps(vec3.y, 0, EPS);
		this._assert_eq_eps(vec4.x, 0, EPS);
		this._assert_eq_eps(vec4.y, -1, EPS);
		this._assert_eq_eps(vec5.x, -1, EPS);
		this._assert_eq_eps(vec5.y, 0, EPS);
		this._assert_eq_eps(vec6.x, Math.sqrt(2) / 2, EPS);
		this._assert_eq_eps(vec6.y, -Math.sqrt(2) / 2, EPS);
		this._assert_eq_eps(vec7.x, 0, EPS);
		this._assert_eq_eps(vec7.y, -1, EPS);

		let z1 = Vector.fromPolar(1, 0);
		this._assert_eq(z1.x, 0);
		this._assert_eq(z1.y, 0);
	}

	private _testPerpendicular() {
		let vec = new Vector(1, 2);
		let perp1 = vec.perpendicular();
		this._assert_eq(perp1.x, 2);
		this._assert_eq(perp1.y, -1);
		this._assert_eq(vec.x, 1);
		this._assert_eq(vec.y, 2);
		let perp2 = perp1.perpendicular();
		this._assert_eq(perp2.x, -1);
		this._assert_eq(perp2.y, -2);
	}

	private _testRotated() {
		let vec = new Vector(1, 0);
		let rot0 = vec.rotated(0);
		this._assert_eq(rot0.x, 1);
		this._assert_eq(rot0.y, 0);

		let rot1 = vec.rotated(Math.PI);
		let rot2 = vec.rotated(Math.PI / 2);
		let rot3 = vec.rotated(-Math.PI / 2);
		this._assert_eq_eps(rot1.x, -1, EPS);
		this._assert_eq_eps(rot1.y, 0, EPS);
		this._assert_eq_eps(rot2.x, 0, EPS);
		this._assert_eq_eps(rot2.y, 1, EPS);
		this._assert_eq_eps(rot3.x, 0, EPS);
		this._assert_eq_eps(rot3.y, -1, EPS);

		let rot4 = vec.rotated(Math.PI / 4);
		this._assert_eq_eps(rot4.length(), 1, EPS);
		this._assert_eq_eps(rot4.angle(), Math.PI / 4, EPS);
		this._assert_eq(vec.x, 1);
		this._assert_eq(vec.y, 0);
	}

	private _testOrthogonalProjection() {
		let [point1, point2] = [new Vector(1, 1), new Vector(4, 4)];
		let vec1 = new Vector(0, 0);
		let vec2 = new Vector(1, 1);
		let vec3 = new Vector(2, 0);
		let vec4 = new Vector(2, 5);

		let [op1, dist1] = vec1.orthogonalProjection(point1, point2);
		this._assert_vector_eq(op1, vec1);
		this._assert_eq(dist1, 0);
		this._assert_eq(dist1, vec1.orthogonalDistance(point1, point2));

		let [op2, dist2] = vec2.orthogonalProjection(point1, point2);
		this._assert_vector_eq(op2, vec2);
		this._assert_eq(dist2, 0);

		let [op3, dist3] = vec3.orthogonalProjection(point1, point2);
		this._assert_eq(op3.x, 1);
		this._assert_eq(op3.y, 1);
		this._assert_eq_eps(dist3, -Math.sqrt(2), EPS);

		let [op4, dist4] = vec4.orthogonalProjection(point1, point2);
		this._assert_eq(op4.x, 3.5);
		this._assert_eq(op4.y, 3.5);
		this._assert_eq_eps(dist4, Math.sqrt(2) * 1.5, EPS);

		let [op5, dist5] = vec4.orthogonalProjection(point2, point1);
		this._assert_eq(op5.x, 3.5);
		this._assert_eq(op5.y, 3.5);
		this._assert_eq_eps(dist5, -Math.sqrt(2) * 1.5, EPS);
		this._assert_eq(dist5, vec4.orthogonalDistance(point2, point1));

		let [op6, dist6] = vec2.orthogonalProjection(vec2, vec4);
		this._assert_eq(op6.x, vec2.x);
		this._assert_eq(op6.y, vec2.y);
		this._assert_eq(dist6, 0);
		this._assert_eq(dist6, vec2.orthogonalDistance(vec2, vec4));

		let [op7, dist7] = vec2.orthogonalProjection(vec2, vec2);
		this._assert_eq(op7.x, vec2.x);
		this._assert_eq(op7.y, vec2.y);
		this._assert_eq(dist7, 0);
		this._assert_false(op7.isNan());
	}

	private _testNearestPosOnLineAndDistanceToLineSegment() {
		let [point1, point2] = [new Vector(1, 1), new Vector(4, 4)];
		let vec1 = new Vector(0, 0);
		let vec2 = new Vector(1, 1);
		let vec3 = new Vector(2, 0);
		let vec4 = new Vector(2, 5);
		let vec5 = new Vector(5, 5);

		let dist1 = vec1.distanceToLineSegment(point1, point2);
		let op1 = vec1.nearestPosOnLine(point1, point2);
		this._assert_vector_eq(op1, point1);
		this._assert_eq_eps(dist1, Math.sqrt(2), EPS);

		let dist2 = vec2.distanceToLineSegment(point1, point2);
		let op2 = vec2.nearestPosOnLine(point1, point2);
		this._assert_vector_eq(op2, point1);
		this._assert_vector_eq(op2, vec2);
		this._assert_eq_eps(dist2, 0, EPS);

		let dist3 = vec3.distanceToLineSegment(point1, point2);
		let op3 = vec3.nearestPosOnLine(point1, point2);
		this._assert_eq(op3.x, 1);
		this._assert_eq(op3.y, 1);
		this._assert_eq_eps(dist3, Math.sqrt(2), EPS);

		let dist4 = vec4.distanceToLineSegment(point1, point2);
		let op4 = vec4.nearestPosOnLine(point1, point2);
		this._assert_eq_eps(op4.x, 3.5, EPS);
		this._assert_eq_eps(op4.y, 3.5, EPS);
		this._assert_eq_eps(dist4, Math.sqrt(2) * 1.5, EPS);

		let dist6 = vec4.distanceToLineSegment(point2, point1);
		let op6 = vec4.nearestPosOnLine(point2, point1);
		this._assert_eq_eps(op6.x, 3.5, EPS);
		this._assert_eq_eps(op6.y, 3.5, EPS);
		this._assert_eq_eps(dist6, dist4, EPS);

		let dist5 = vec5.distanceToLineSegment(point1, point2);
		let op5 = vec5.nearestPosOnLine(point1, point2);
		this._assert_vector_eq(op5, point2);
		this._assert_eq_eps(dist5, Math.sqrt(2), EPS);
	}

	private _testRandom() {
		MathUtil.randomseed(0);
		for (let i = 0; i < 100; i++) {
			let rand = Vector.random(1);
			// should be unlikely enough to never happen
			this._assert_lt(rand.length(), 100);
		}

		let center = new Vector(10000, 10000);
		for (let i = 0; i < 100; i++) {
			let rand = Vector.random(1, center);
			// should be unlikely enough to never happen
			this._assert_lt(rand.distanceTo(center), 100);
		}

		let rand = Vector.random(1);
		let hasOther = false;
		for (let i = 0; i < 10; i++) {
			hasOther = hasOther || (rand !== Vector.random(1));
		}
		this._assert_true(hasOther);
	}

	private _testDistanceToSq() {
		let p1 = new Vector(0, 0);
		let p2 = new Vector(0.5, 0);
		this._assert_eq(0.25, p1.distanceToSq(p2));
	}

	private _testCrossProdLength() {
		let x = new Vector(1, 0);
		let y = new Vector(0, 1);
		this._assert_eq(Vector.crossProdLength(x, y), 1);
		this._assert_eq(Vector.crossProdLength(y, x), -1);
		this._assert_eq(Vector.crossProdLength(x, x), 0);
		this._assert_eq(Vector.crossProdLength(y, y), 0);

		let v = new Vector(1, 1).normalized();
		this._assert_eq_eps(Vector.crossProdLength(x, v), Math.sin(Math.PI / 4), EPS);
		this._assert_eq_eps(Vector.crossProdLength(y, v), -Math.sin(Math.PI / 4), EPS);
	}

	private _testOrthogonalAndParallelComponent() {
		let x = new Vector(1, 1);
		this._assert_eq_eps((x.orthogonalComponent(new Vector(1, 0)) - new Vector(0, 1)).lengthSq(), 0, EPS * EPS);
		this._assert_eq_eps((x.parallelComponent(new Vector(1, 0)) - new Vector(1, 0)).lengthSq(), 0, EPS * EPS);

		// Test that the result is independent of the length of dir
		this._assert_eq_eps((x.orthogonalComponent(new Vector(2, 0)) - new Vector(0, 1)).lengthSq(), 0, EPS * EPS);
		this._assert_eq_eps((x.parallelComponent(new Vector(2, 0)) - new Vector(1, 0)).lengthSq(), 0, EPS * EPS);

		// Test that for some random vector the docomposition
		// x = x.orthogonalComponent(dir) + x.parallelComponent(dir)
		let dir = new Vector(3.1415, 2.71828);
		this._assert_eq_eps((x - x.orthogonalComponent(dir) - x.parallelComponent(dir)).lengthSq(), 0, EPS * EPS);
	}
}
export let testClass = BaseVector;
