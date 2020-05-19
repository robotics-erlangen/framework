import * as MathUtil from "base/mathutil";
import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";

let EPS = 1E-12;

export class BaseVector extends UnitTest {
	constructor() {
		super();
		this.addTest("constructor", this.testConstructor);
		this.addTest("attributes", this.testAttributes);
		this.addTest("operators", this.testOperators);
		this.addTest("copy", this.testCopy);
		this.addTest("isNan", this.testIsNan);
		this.addTest("length", this.testLength);
		this.addTest("normalized", this.testNormalized);
		this.addTest("withLength", this.testWithLength);
		this.addTest("distanceTo", this.testDistanceTo);
		this.addTest("dot", this.testDot);
		this.addTest("angle", this.testAngle);
		this.addTest("fromAngle", this.testFromAngle);
		this.addTest("fromPolar", this.testFromPolar);
		this.addTest("perpendicular", this.testPerpendicular);
		this.addTest("rotated", this.testRotated);
		this.addTest("orthogonalProjection", this.testOrthogonalProjection);
		this.addTest("nearestPosOnLine+distanceToLineSegment", this.testNearestPosOnLineAndDistanceToLineSegment);
		this.addTest("random", this.testRandom);
		this.addTest("distanceToSq", this.testDistanceToSq);
	}

	private testConstructor() {
		let vec = new Vector(1, 2);
		this.assert_equal(vec.x, 1);
		this.assert_equal(vec.y, 2);
	}

	private testAttributes() {
		let vec = new Vector(1, 2);
		vec.x = 3;
		this.assert_equal(vec.x, 3);
		this.assert_equal(vec.y, 2);
		vec.y = 4;
		this.assert_equal(vec.x, 3);
		this.assert_equal(vec.y, 4);
	}

	private testOperators() {
		let vec1 = new Vector(1, 2);
		let vec2 = new Vector(2, 1);

		let sum = vec1 + vec2;
		this.assert_equal(sum.x, 3);
		this.assert_equal(sum.y, 3);

		let sub = vec1 - vec2;
		this.assert_equal(sub.x, -1);
		this.assert_equal(sub.y, 1);

		let unaryMinus = -vec1;
		this.assert_equal(unaryMinus.x, -1);
		this.assert_equal(unaryMinus.y, -2);

		let factor = 3;
		let mul = vec1 * factor;
		this.assert_equal(mul.x, 3);
		this.assert_equal(mul.y, 6);

		let div = mul / factor;
		this.assert_equal(div.x, 1);
		this.assert_equal(div.y, 2);

		let vec1mod1 = new Vector(1, 2);
		let vec1mod2 = new Vector(2, 2);
		let vec1mod3 = new Vector(1, 1);
		let vec1mod4 = new Vector(2, 3);
		let vec1mod5 = new Vector(2, 1);
		this.assert_vector_equal(vec1, vec1mod1);
		this.assert_vector_equal(vec1, div);
		this.assert_vector_not_equal(vec1, vec1mod2);
		this.assert_vector_not_equal(vec1, vec1mod3);
		this.assert_vector_not_equal(vec1, vec1mod4);
		this.assert_vector_not_equal(vec1, vec1mod5);

		let vecLen = new Vector(3, -4);
		let vecLen2 = new Vector(-3, -4);
		let vecLen3 = new Vector(0, 0);
		this.assert_equal(vecLen.length(), 5);
		this.assert_equal(vecLen2.length(), 5);
		this.assert_equal(vecLen3.length(), 0);

		this.assert_equal(vec1._toString(), "Vector(1.00, 2.00)");
	}

	private testCopy() {
		let vec = new Vector(4, 5);
		let vec_copy = vec.copy();
		this.assert_equal(vec_copy.x, 4);
		this.assert_equal(vec_copy.y, 5);
		this.assert_vector_equal(vec_copy, vec);
	}

	private testIsNan() {
		let vec = new Vector(0, 0);
		this.assert_false(vec.isNan());
		vec.x = 0 / 0;
		this.assert_true(vec.isNan());
		vec.y = 0 / 0;
		this.assert_true(vec.isNan());
		vec.x = 0;
		this.assert_true(vec.isNan());
		vec.y = 0;
		this.assert_false(vec.isNan());
	}

	private testLength() {
		let vecLen = new Vector(3, -4);
		let vecLen2 = new Vector(-3, -4);
		let vecLen3 = new Vector(0, 0);
		this.assert_equal(vecLen.length(), 5);
		this.assert_equal(vecLen2.length(), 5);
		this.assert_equal(vecLen3.length(), 0);
		this.assert_equal(vecLen.lengthSq(), 25);
		this.assert_equal(vecLen2.lengthSq(), 25);
		this.assert_equal(vecLen3.lengthSq(), 0);
		this.assert_equal(vecLen.length(), vecLen.length());
		this.assert_equal(vecLen2.length(), vecLen2.length());
		this.assert_equal(vecLen3.length(), vecLen3.length());
	}

	private testNormalized() {
		let vec = new Vector(2, 0);
		let res = vec.normalized();
		this.assert_equal(vec.x, 2); // check non-modifying
		this.assert_equal(vec.y, 0);
		this.assert_equal(res.x, 1);
		this.assert_equal(res.y, 0);

		let vec2 = new Vector(0.5, 0.5);
		vec2 = vec2.normalized();
		this.assert_equal_eps(vec2.length(), 1, EPS);

		let nullVec = new Vector(0, 0);
		nullVec = nullVec.normalized();
		this.assert_equal(nullVec.x, 0);
		this.assert_equal(nullVec.y, 0);
	}

	private testWithLength() {
		let vec = new Vector(2, 0);
		let ret = vec.withLength(1.5);
		this.assert_equal(vec.x, 2);
		this.assert_equal(vec.y, 0);
		this.assert_equal(ret.x, 1.5);
		this.assert_equal(ret.y, 0);

		let vec2 = new Vector(0.5, 0.5);
		vec2 = vec2.withLength(2);
		this.assert_equal_eps(vec2.length(), 2, EPS);
		vec2 = vec2.withLength(0);
		this.assert_equal(vec2.x, 0);
		this.assert_equal(vec2.y, 0);

		let nullVec = new Vector(0, 0);
		let nullRet = nullVec.withLength(3);
		this.assert_equal(nullVec.x, 0);
		this.assert_equal(nullVec.y, 0);
		this.assert_equal(nullRet.x, 0);
		this.assert_equal(nullRet.y, 0);
	}

	private testDistanceTo() {
		let vec1 = new Vector(1, 2);
		let vec2 = new Vector(2, 2);
		this.assert_equal(vec1.distanceTo(vec2), 1);
		this.assert_equal(vec2.distanceTo(vec1), 1);

		let vec3 = new Vector(5, 5);
		this.assert_equal(vec1.distanceTo(vec3), 5);
		this.assert_equal(vec3.distanceTo(vec1), 5);
	}

	private testDot() {
		let vec1 = new Vector(0, 1);
		let vec2 = new Vector(1, 0);
		this.assert_equal(vec1.dot(vec2), 0);
		this.assert_equal(vec2.dot(vec1), 0);

		let vec3 = new Vector(1, 2);
		let vec4 = new Vector(3, 4);
		this.assert_equal(vec3.dot(vec4), 11);
		this.assert_equal(vec4.dot(vec3), 11);
	}

	private testAngle() {
		let vec0 = new Vector(0, 0);
		let vec1 = new Vector(1, 0);
		let vec2 = new Vector(0, 1);
		let vec3 = new Vector(-1, 0);
		let vec4 = new Vector(0, -1);

		this.assert_equal(vec0.angle(), 0);
		this.assert_equal(vec1.angle(), 0);
		this.assert_equal(vec2.angle(), Math.PI / 2);
		this.assert_equal(vec3.angle(), Math.PI);
		this.assert_equal(vec4.angle(), -Math.PI / 2);

		let vec5 = new Vector(1, 1);
		this.assert_equal(vec5.angle(), Math.PI / 4);

		this.assert_equal(vec2.angleDiff(vec3), Math.PI / 2);
		this.assert_equal(vec2.angleDiff(vec4), -Math.PI);
		this.assert_equal(vec4.angleDiff(vec2), Math.PI);
		this.assert_equal(vec2.angleDiff(vec1), -Math.PI / 2);
		this.assert_equal(vec5.angleDiff(vec1), -Math.PI / 4);
		this.assert_equal(vec5.angleDiff(vec2), Math.PI / 4);

		this.assert_equal(vec2.absoluteAngleDiff(vec3), Math.PI / 2);
		this.assert_equal(vec2.absoluteAngleDiff(vec4), Math.PI);
		this.assert_equal(vec4.absoluteAngleDiff(vec2), Math.PI);
		this.assert_equal(vec2.absoluteAngleDiff(vec1), Math.PI / 2);
		this.assert_equal_eps(vec5.absoluteAngleDiff(vec1), Math.PI / 4, EPS);
		this.assert_equal_eps(vec5.absoluteAngleDiff(vec2), Math.PI / 4, EPS);

		// special cases
		this.assert_equal(vec0.angleDiff(vec5), 0);
		this.assert_equal(vec0.angleDiff(vec2), 0);
		this.assert_equal(vec5.angleDiff(vec0), 0);
		this.assert_equal(vec2.angleDiff(vec0), 0);

		this.assert_equal(vec0.absoluteAngleDiff(vec5), 0);
		this.assert_equal(vec0.absoluteAngleDiff(vec2), 0);
		this.assert_equal(vec5.absoluteAngleDiff(vec0), 0);
		this.assert_equal(vec2.absoluteAngleDiff(vec0), 0);
	}

	private testFromAngle() {
		let vec1 = Vector.fromAngle(0);
		let vec2 = Vector.fromAngle(Math.PI / 2);
		let vec3 = Vector.fromAngle(Math.PI);
		let vec4 = Vector.fromAngle(-Math.PI / 2);
		let vec5 = Vector.fromAngle(-Math.PI);
		let vec6 = Vector.fromAngle(-Math.PI / 4);
		let vec7 = Vector.fromAngle(Math.PI * 1.5);
		this.assert_equal_eps(vec1.x, 1, EPS);
		this.assert_equal_eps(vec1.y, 0, EPS);
		this.assert_equal_eps(vec2.x, 0, EPS);
		this.assert_equal_eps(vec2.y, 1, EPS);
		this.assert_equal_eps(vec3.x, -1, EPS);
		this.assert_equal_eps(vec3.y, 0, EPS);
		this.assert_equal_eps(vec4.x, 0, EPS);
		this.assert_equal_eps(vec4.y, -1, EPS);
		this.assert_equal_eps(vec5.x, -1, EPS);
		this.assert_equal_eps(vec5.y, 0, EPS);
		this.assert_equal_eps(vec6.x, Math.sqrt(2) / 2, EPS);
		this.assert_equal_eps(vec6.y, -Math.sqrt(2) / 2, EPS);
		this.assert_equal_eps(vec7.x, 0, EPS);
		this.assert_equal_eps(vec7.y, -1, EPS);
	}

	private testFromPolar() {
		let vec1 = Vector.fromPolar(0, 3);
		let vec2 = Vector.fromPolar(Math.PI / 2, 2);
		let vec3 = Vector.fromPolar(Math.PI, 1);
		let vec4 = Vector.fromPolar(-Math.PI / 2, 1);
		let vec5 = Vector.fromPolar(-Math.PI, 1);
		let vec6 = Vector.fromPolar(-Math.PI / 4, 1);
		let vec7 = Vector.fromPolar(Math.PI * 1.5, 1);
		this.assert_equal_eps(vec1.x, 3, EPS);
		this.assert_equal_eps(vec1.y, 0, EPS);
		this.assert_equal_eps(vec2.x, 0, EPS);
		this.assert_equal_eps(vec2.y, 2, EPS);
		this.assert_equal_eps(vec3.x, -1, EPS);
		this.assert_equal_eps(vec3.y, 0, EPS);
		this.assert_equal_eps(vec4.x, 0, EPS);
		this.assert_equal_eps(vec4.y, -1, EPS);
		this.assert_equal_eps(vec5.x, -1, EPS);
		this.assert_equal_eps(vec5.y, 0, EPS);
		this.assert_equal_eps(vec6.x, Math.sqrt(2) / 2, EPS);
		this.assert_equal_eps(vec6.y, -Math.sqrt(2) / 2, EPS);
		this.assert_equal_eps(vec7.x, 0, EPS);
		this.assert_equal_eps(vec7.y, -1, EPS);

		let z1 = Vector.fromPolar(1, 0);
		this.assert_equal(z1.x, 0);
		this.assert_equal(z1.y, 0);
	}

	private testPerpendicular() {
		let vec = new Vector(1, 2);
		let perp1 = vec.perpendicular();
		this.assert_equal(perp1.x, 2);
		this.assert_equal(perp1.y, -1);
		this.assert_equal(vec.x, 1);
		this.assert_equal(vec.y, 2);
		let perp2 = perp1.perpendicular();
		this.assert_equal(perp2.x, -1);
		this.assert_equal(perp2.y, -2);
	}

	private testRotated() {
		let vec = new Vector(1, 0);
		let rot0 = vec.rotated(0);
		this.assert_equal(rot0.x, 1);
		this.assert_equal(rot0.y, 0);

		let rot1 = vec.copy().rotated(Math.PI);
		let rot2 = vec.copy().rotated(Math.PI / 2);
		let rot3 = vec.copy().rotated(-Math.PI / 2);
		this.assert_equal_eps(rot1.x, -1, EPS);
		this.assert_equal_eps(rot1.y, 0, EPS);
		this.assert_equal_eps(rot2.x, 0, EPS);
		this.assert_equal_eps(rot2.y, 1, EPS);
		this.assert_equal_eps(rot3.x, 0, EPS);
		this.assert_equal_eps(rot3.y, -1, EPS);

		let rot4 = vec.rotated(Math.PI / 4);
		this.assert_equal_eps(rot4.length(), 1, EPS);
		this.assert_equal_eps(rot4.angle(), Math.PI / 4, EPS);
		this.assert_equal(vec.x, 1);
		this.assert_equal(vec.y, 0);
	}

	private testOrthogonalProjection() {
		let [point1, point2] = [new Vector(1, 1), new Vector(4, 4)];
		let vec1 = new Vector(0, 0);
		let vec2 = new Vector(1, 1);
		let vec3 = new Vector(2, 0);
		let vec4 = new Vector(2, 5);

		let [op1, dist1] = vec1.orthogonalProjection(point1, point2);
		this.assert_vector_equal(op1, vec1);
		this.assert_equal(dist1, 0);
		this.assert_equal(dist1, vec1.orthogonalDistance(point1, point2));

		let [op2, dist2] = vec2.orthogonalProjection(point1, point2);
		this.assert_vector_equal(op2, vec2);
		this.assert_equal(dist2, 0);

		let [op3, dist3] = vec3.orthogonalProjection(point1, point2);
		this.assert_equal(op3.x, 1);
		this.assert_equal(op3.y, 1);
		this.assert_equal_eps(dist3, -Math.sqrt(2), EPS);

		let [op4, dist4] = vec4.orthogonalProjection(point1, point2);
		this.assert_equal(op4.x, 3.5);
		this.assert_equal(op4.y, 3.5);
		this.assert_equal_eps(dist4, Math.sqrt(2) * 1.5, EPS);

		let [op5, dist5] = vec4.orthogonalProjection(point2, point1);
		this.assert_equal(op5.x, 3.5);
		this.assert_equal(op5.y, 3.5);
		this.assert_equal_eps(dist5, -Math.sqrt(2) * 1.5, EPS);
		this.assert_equal(dist5, vec4.orthogonalDistance(point2, point1));

		let [op6, dist6] = vec2.orthogonalProjection(vec2, vec4);
		this.assert_equal(op6.x, vec2.x);
		this.assert_equal(op6.y, vec2.y);
		this.assert_equal(dist6, 0);
		this.assert_equal(dist6, vec2.orthogonalDistance(vec2, vec4));

		let [op7, dist7] = vec2.orthogonalProjection(vec2, vec2);
		this.assert_equal(op7.x, vec2.x);
		this.assert_equal(op7.y, vec2.y);
		this.assert_equal(dist7, 0);
		this.assert_false(op7.isNan());
	}

	private testNearestPosOnLineAndDistanceToLineSegment() {
		let [point1, point2] = [new Vector(1, 1), new Vector(4, 4)];
		let vec1 = new Vector(0, 0);
		let vec2 = new Vector(1, 1);
		let vec3 = new Vector(2, 0);
		let vec4 = new Vector(2, 5);
		let vec5 = new Vector(5, 5);

		let dist1 = vec1.distanceToLineSegment(point1, point2);
		let op1 = vec1.nearestPosOnLine(point1, point2);
		this.assert_vector_equal(op1, point1);
		this.assert_equal_eps(dist1, Math.sqrt(2), EPS);

		let dist2 = vec2.distanceToLineSegment(point1, point2);
		let op2 = vec2.nearestPosOnLine(point1, point2);
		this.assert_vector_equal(op2, point1);
		this.assert_vector_equal(op2, vec2);
		this.assert_equal_eps(dist2, 0, EPS);

		let dist3 = vec3.distanceToLineSegment(point1, point2);
		let op3 = vec3.nearestPosOnLine(point1, point2);
		this.assert_equal(op3.x, 1);
		this.assert_equal(op3.y, 1);
		this.assert_equal_eps(dist3, Math.sqrt(2), EPS);

		let dist4 = vec4.distanceToLineSegment(point1, point2);
		let op4 = vec4.nearestPosOnLine(point1, point2);
		this.assert_equal_eps(op4.x, 3.5, EPS);
		this.assert_equal_eps(op4.y, 3.5, EPS);
		this.assert_equal_eps(dist4, Math.sqrt(2) * 1.5, EPS);

		let dist6 = vec4.distanceToLineSegment(point2, point1);
		let op6 = vec4.nearestPosOnLine(point2, point1);
		this.assert_equal_eps(op6.x, 3.5, EPS);
		this.assert_equal_eps(op6.y, 3.5, EPS);
		this.assert_equal_eps(dist6, dist4, EPS);

		let dist5 = vec5.distanceToLineSegment(point1, point2);
		let op5 = vec5.nearestPosOnLine(point1, point2);
		this.assert_vector_equal(op5, point2);
		this.assert_equal_eps(dist5, Math.sqrt(2), EPS);
	}

	private testRandom() {
		MathUtil.randomseed(0);
		for (let i = 0;i < 100;i++) {
			let rand = Vector.random(1);
			// should be unlikely enough to never happen
			this.assert_less_than(rand.length(), 100);
		}

		let center = new Vector(10000, 10000);
		for (let i = 0;i < 100;i++) {
			let rand = Vector.random(1, center);
			// should be unlikely enough to never happen
			this.assert_less_than(rand.distanceTo(center), 100);
		}

		let rand = Vector.random(1);
		let hasOther = false;
		for (let i = 0;i < 10;i++) {
			hasOther = hasOther || (rand !== Vector.random(1));
		}
		this.assert_true(hasOther);
	}

	private testDistanceToSq() {
		let p1 = new Vector(0, 0);
		let p2 = new Vector(0.5, 0);
		this.assert_equal(0.25, p1.distanceToSq(p2));
	}
}
export let testClass = BaseVector;
