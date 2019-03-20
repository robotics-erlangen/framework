import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";

const EPS = 1E-12;

export class BaseGeom extends UnitTest {
	constructor() {
		super();
		this.addTest("intersectCircleCircle", this.testIntersectCircleCircle);
		this.addTest("boundRect", this.testBoundRect);
		this.addTest("intersectLineCircle", this.testIntersectLineCircle);
		this.addTest("intersectLineCorridor", this.testIntersectLineCorridor);
		this.addTest("tangensToCircle", this.testGetTangesToCircle);
		this.addTest("innerTangensToCircle", this.testGetInnerTangensToCircle);
		this.addTest("intersectLineLine", this.testIntersectLineLine);
		this.addTest("intersectLinesByPoints", this.testIntersectLinesByPoints);
		this.addTest("triangleArea", this.testTriangleArea);
		this.addTest("checkTriangleOrientation", this.testCheckTriangleOrientation);
		this.addTest("quadrangleArea", this.testQuadrangleArea);
		this.addTest("geomCenter", this.testGeomCenter);
		this.addTest("isInTriangle", this.testIsInTriangle);
		this.addTest("normalizeAngle", this.testNormalizeAngle);
		this.addTest("normalizeAnglePositive", this.testNormalizeAnglePositive);
		this.addTest("angleDiff", this.testGetAngleDiff);
		this.addTest("inscribedAngle", this.testInscribedAngle);
		this.addTest("insideRect", this.testInsideRect);
	}

	private testIntersectCircleCircle() {
		{
			let [ret, r1] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(0, 1), 1);
			this.assert_vector_equal_eps(ret, new Vector(0, 2), EPS);
			this.assert_undefined(r1);
		}
		{
			let [ret, r1] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(0, -1), 1);
			this.assert_vector_equal_eps(ret, new Vector(0, -2), EPS);
			this.assert_undefined(r1);
		}
		{
			let [ret, r1] = geom.intersectCircleCircle(new Vector(0, 0), 1, new Vector(0, 2), 1);
			this.assert_vector_equal(ret, new Vector(0, 1));
			this.assert_undefined(r1);
		}
		{
			let [ret2, l2] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(2, 0), 1);
			if (ret2!.distanceToSq(new Vector(1.75, Math.sqrt(15) / 4)) > EPS * EPS) {
				[ret2, l2] = [l2, ret2];
			}
			this.assert_equal_eps(ret2!.distanceToSq(new Vector(1.75, Math.sqrt(15) / 4)), 0, EPS);
			this.assert_equal_eps(l2!.distanceToSq(new Vector(1.75, -Math.sqrt(15) / 4)), 0, EPS);
		}
		{
			let [ret3, l3] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(0, Math.sqrt(3)), 1);
			this.assert_equal_eps(ret3!.distanceToSq(new Vector(1, Math.sqrt(3))), 0, EPS);
			this.assert_equal_eps(l3!.distanceToSq(new Vector(-1, Math.sqrt(3))), 0, EPS);
		}
		{
			let [ret4, l4] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(2, 2), 1);
			this.assert_equal_eps(ret4!.distanceToSq(new Vector(1.0 / 8 * (11 + Math.sqrt(7)), 1.0 / 8 * (11 - Math.sqrt(7)))), 0, EPS);
			this.assert_equal_eps(l4!.distanceToSq(new Vector(1.0 / 8 * (11 - Math.sqrt(7)), 1.0 / 8 * (11 + Math.sqrt(7)))), 0, EPS);
		}
		{
			let [ret4, l4] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(2, 0), 0);
			this.assert_undefined(l4);
			this.assert_equal_eps(ret4!.distanceToSq(new Vector(2,0)), 0, EPS);
			this.assert_vector_equal(ret4, new Vector(2,0));
		}
		{
			let [ret6, l6] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(2, 0), EPS);
			this.assert_equal_eps(ret6!.distanceToSq(new Vector(2,0)), 0, EPS * EPS);
		}
		{
			let [ret7, l7] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(2, 4), 1);
			this.assert_undefined(ret7);
			this.assert_undefined(l7);
		}
		{
			let [ret8, l8] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(0, 0), 1);
			this.assert_undefined(ret8);
			this.assert_undefined(l8);
		}
	}

	private testBoundRect() {
		// right
		this.assert_vector_equal(geom.boundRect(new Vector(-1, -1), new Vector(2, 0), new Vector(1, 1)), new Vector(1, 0));
		this.assert_vector_equal(geom.boundRect(new Vector(-1, -1), new Vector(0.5, 0), new Vector(1, 1)), new Vector(0.5, 0));

		// left
		this.assert_vector_equal(geom.boundRect(new Vector(-1, -1), new Vector(-2, 0), new Vector(1, 1)), new Vector(-1, 0));
		this.assert_vector_equal(geom.boundRect(new Vector(-1, -1), new Vector(-0.5, 0), new Vector(1, 1)), new Vector(-0.5, 0));

		// top
		this.assert_vector_equal(geom.boundRect(new Vector(-1, -1), new Vector(0, -2), new Vector(1, 1)), new Vector(0, -1));
		this.assert_vector_equal(geom.boundRect(new Vector(-1, -1), new Vector(0, -0.5), new Vector(1, 1)), new Vector(0, -0.5));

		// bottom
		this.assert_vector_equal(geom.boundRect(new Vector(-1, -1), new Vector(0, 2), new Vector(1, 1)), new Vector(0, 1));
		this.assert_vector_equal(geom.boundRect(new Vector(-1, -1), new Vector(0, 0.5), new Vector(1, 1)), new Vector(0, 0.5));

		// other
		this.assert_vector_equal(geom.boundRect(new Vector(0, 0), new Vector(123, 321), new Vector(0, 0)), new Vector(0, 0));
	}

	private testIntersectLineCircle() {
		// x direction
		let [intersect1, intersect2, l1, l2] = geom.intersectLineCircle(new Vector(-2, 0), new Vector(1, 0), new Vector(0, 0), 1);
		this.assert_not_undefined(intersect1);
		this.assert_not_undefined(intersect2);
		this.assert_not_undefined(l1);
		this.assert_not_undefined(l2);
		this.assert_equal_eps(l2!, 1, EPS);
		this.assert_equal_eps(l1!, 3, EPS);
		this.assert_vector_equal(intersect2, new Vector(-1, 0));
		this.assert_vector_equal(intersect1, new Vector(1, 0));

		// y direction
		[intersect1, intersect2, l1, l2] = geom.intersectLineCircle(new Vector(0, -2), new Vector(0, 1), new Vector(0, 0), 1);
		this.assert_not_undefined(intersect1);
		this.assert_not_undefined(intersect2);
		this.assert_not_undefined(l1);
		this.assert_not_undefined(l2);
		this.assert_vector_equal(intersect2, new Vector(0, -1));
		this.assert_vector_equal(intersect1, new Vector(0, 1));
		this.assert_equal_eps(l2!, 1, EPS);
		this.assert_equal_eps(l1!, 3, EPS);


		// line start inside
		[intersect1, intersect2, l1, l2] = geom.intersectLineCircle(new Vector(0, 0), new Vector(0, 1), new Vector(0, 0), 1);
		this.assert_not_undefined(intersect1);
		this.assert_not_undefined(intersect2);
		this.assert_not_undefined(l1);
		this.assert_not_undefined(l2);
		this.assert_vector_equal(intersect2, new Vector(0, -1));
		this.assert_vector_equal(intersect1, new Vector(0, 1));
		this.assert_equal_eps(l2!, -1, EPS);
		this.assert_equal_eps(l1!, 1, EPS);

		// no intersection case
		this.assert_equal(geom.intersectLineCircle(new Vector(-2, -2), new Vector(1, 0), new Vector(0, 0), 1).length, 0);
	}

	private testIntersectLineCorridor() {
		// line with no direction and base point outside the corridor
		let [p1, p2, l1, l2] = geom.intersectLineCorridor(new Vector(0, 0), new Vector(0, 0), new Vector(1, 1), new Vector(1, 0), 0.5);
		this.assert_equal(p1, undefined);
		this.assert_equal(p2, undefined);
		this.assert_equal(l1, undefined);
		this.assert_equal(l2, undefined);

		// line with no direction and base point inside the corridor
		[p1, p2, l1, l2] = geom.intersectLineCorridor(new Vector(1, 1), new Vector(0, 0), new Vector(1, 1), new Vector(1, 0), 0.5);
		this.assert_equal(p1, undefined);
		this.assert_equal(p2, undefined);
		this.assert_equal(l1, -Infinity);
		this.assert_equal(l2, Infinity);

		// line inside the corridor
		[p1, p2, l1, l2] = geom.intersectLineCorridor(new Vector(0, 1), new Vector(1, 0), new Vector(1, 1), new Vector(1, 0), 0.5);
		this.assert_equal(p1, undefined);
		this.assert_equal(p2, undefined);
		this.assert_equal(l1, -Infinity);
		this.assert_equal(l2, Infinity);

		// line outside the corridor parallel (->no intersection)
		[p1, p2, l1, l2] = geom.intersectLineCorridor(new Vector(0, 100), new Vector(1, 0), new Vector(1, 1), new Vector(1, 0), 0.5);
		this.assert_equal(p1, undefined);
		this.assert_equal(p2, undefined);
		this.assert_equal(l1, undefined);
		this.assert_equal(l2, undefined);

		// line perpendicular to corridor
		[p1, p2, l1, l2] = geom.intersectLineCorridor(new Vector(0, 100), new Vector(0, -1), new Vector(1, 1), new Vector(1, 0), 0.5);
		this.assert_vector_equal(p1, new Vector(0, 1.5));
		this.assert_vector_equal(p2, new Vector(0, 0.5));
		this.assert_equal(l1, 98.5);
		this.assert_equal(l2, 99.5);

		// regular case
		[p1, p2, l1, l2] = geom.intersectLineCorridor(new Vector(0, 0), new Vector(1, 1), new Vector(2, 0), new Vector(0, 1), 1);
		this.assert_vector_equal(p1, new Vector(1, 1));
		this.assert_vector_equal(p2, new Vector(3, 3));
		this.assert_equal(l1, 1);
		this.assert_equal(l2, 3);

		// corridor with width = 0
		[p1, p2, l1, l2] = geom.intersectLineCorridor(new Vector(0, 0), new Vector(1, 1), new Vector(2, 0), new Vector(0, 1), 0);
		this.assert_vector_equal(p1, new Vector(2, 2));
		this.assert_vector_equal(p2, new Vector(2, 2));
		this.assert_equal(l1, 2);
		this.assert_equal(l2, 2);
	}

	private testGetTangesToCircle() {
		let [tp1, tp2] = geom.getTangentsToCircle(new Vector(4,3), new Vector(0,0), 3);
		if (tp1!.distanceToSq(new Vector(0,3)) > EPS) {
			[tp2, tp1] = [tp1, tp2];
		}
		this.assert_vector_equal_eps(tp1, new Vector(0, 3), EPS);
		this.assert_vector_equal_eps(tp2, new Vector(72 / 25, -21 / 25), EPS);

		let [tp3, tp4] = geom.getTangentsToCircle(new Vector(3, 3), new Vector(0, 0), 3);
		if (tp3!.distanceToSq(new Vector(0, 3)) > EPS) {
			[tp4, tp3] = [tp3, tp4];
		}
		this.assert_vector_equal_eps(tp3, new Vector(0, 3), EPS);
		this.assert_vector_equal_eps(tp4, new Vector(3, 0), EPS);

		let [tp5, tp6] = geom.getTangentsToCircle(new Vector(3, 0), new Vector(0, 0), 3);
		this.assert_vector_equal_eps(tp5, new Vector(3,0), EPS);
		this.assert_undefined(tp6);

		let [tp7, tp8] = geom.getTangentsToCircle(new Vector(2, 0), new Vector(0, 0), 3);
		this.assert_undefined(tp7);
		this.assert_undefined(tp8);
	}

	private testGetInnerTangensToCircle() {
		let [i1, t1, t2] = geom.getInnerTangentsToCircles(new Vector(0, 0), 3, new Vector(8, 0), 3);
		this.assert_vector_equal_eps(i1, new Vector(4, 0), EPS);
		let [s1, s2] = [ new Vector(9 / 4, -3 / 4 * Math.sqrt(7)), new Vector(9 / 4, 3 / 4 * Math.sqrt(7)) ];
		if (s1.distanceToSq(t1!) > EPS * EPS) {
			[s1, s2] = [s2, s1];
		}
		this.assert_vector_equal_eps(t1, s1, EPS);
		this.assert_vector_equal_eps(t2, s2, EPS);
		this.assert_equal(geom.getInnerTangentsToCircles(new Vector(0, 0), 2, new Vector(3, 0), 2).length, 0);
	}

	private testIntersectLineLine() {
		{
			let [ret, l1, l2] = geom.intersectLineLine(new Vector(0, 0), new Vector(0, 1), new Vector(0, 1), new Vector(0, -1));
			this.assert_equal(ret, undefined);
			this.assert_equal(l1, undefined);
			this.assert_equal(l2, undefined);
		}
		{
			let [ret, l1, l2] = geom.intersectLineLine(new Vector(0, 0), new Vector(0, 1), new Vector(0.1, 1), new Vector(0, -1));
			this.assert_equal(ret, undefined);
			this.assert_equal(l1, undefined);
			this.assert_equal(l2, undefined);
		}
		{
			let [ret, l1, l2] = geom.intersectLineLine(new Vector(0, 0), new Vector(0, 1), new Vector(1, 1), new Vector(1, 0));
			this.assert_vector_equal(ret!, new Vector(0, 1));
			this.assert_equal(l1, 1);
			this.assert_equal(l2, -1);
		}
		{
			// parallel
			let [ret, l1, l2] = geom.intersectLineLine(new Vector(0, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, -1));
			this.assert_equal(ret, undefined);
			this.assert_equal(l1, undefined);
			this.assert_equal(l2, undefined);
		}
	}

	private testIntersectLinesByPoints() {
		let [ret1, l1, l2] = geom.intersectLinesByPoints(new Vector(0, 0), new Vector(0, 1), new Vector(0, 1), new Vector(0, 0));
		this.assert_undefined(ret1);
		this.assert_undefined(l1);
		this.assert_undefined(l2);
		[ret1, l1, l2] = geom.intersectLinesByPoints(new Vector(0, 0), new Vector(0, 2), new Vector(3, 3), new Vector(2, 2));
		this.assert_vector_equal_eps(ret1, new Vector(0, 0), EPS);
		this.assert_equal_eps(l1!, 0, EPS);
		this.assert_equal_eps(l2!, 3, EPS);
		[ret1, l1, l2] = geom.intersectLinesByPoints(new Vector(0, 0), new Vector(0, 1), new Vector(1, 1), new Vector(1, 0));
		this.assert_undefined(ret1);
		this.assert_undefined(l1);
		this.assert_undefined(l2);
	}

	private testTriangleArea() {
		let area = geom.calcTriangleArea(new Vector(0, 0), new Vector(0, 3), new Vector(4, 3));
		this.assert_equal_eps(area, 6, EPS);
		area = geom.calcTriangleArea(new Vector(0, 0), new Vector(3, 0), new Vector(3, 4));
		this.assert_equal_eps(area, 6, EPS);
		area = geom.calcTriangleArea(new Vector(0, 0), new Vector(0, 6), new Vector(3, 3));
		this.assert_equal_eps(area, 9, EPS);
		for (let i = 1; i < 90; ++i) {
			let alpha = i * Math.PI / 180;
			let intersect = geom.intersectCircleCircle(new Vector(3, 4), Math.sqrt(2 * (2.5) * (2.5) * (1 - Math.cos(2 * alpha))), new Vector(1.5, 2), 2.5)[0]!;
			area = geom.calcTriangleArea(new Vector(0, 0), new Vector(3, 4), intersect);
			// sin = opposite / hypotenuse
			let b = Math.sin(alpha) * 5;
			// cos = adjecent / hypotenuse
			let a = Math.cos(alpha) * 5;
			this.assert_equal_eps(area, a * b * 0.5, EPS);
		}
	}

	private testCheckTriangleOrientation() {
		this.assert_equal(geom.checkTriangleOrientation(new Vector(-1, 0), new Vector(0, 1), new Vector(1, 0)), -1);
		this.assert_equal(geom.checkTriangleOrientation(new Vector(-1, 0), new Vector(0, 0), new Vector(1, 0)), 0);
		this.assert_equal(geom.checkTriangleOrientation(new Vector(1, 0), new Vector(0, 1), new Vector(-1, 0)), 1);
	}

	private testQuadrangleArea() {
		// Squares
		this.assert_equal_eps(geom.calcQuadrangleArea(new Vector(0, 0), new Vector(1, 0), new Vector(1, 1), new Vector(0, 1)), 1, EPS);
		this.assert_equal_eps(geom.calcQuadrangleArea(new Vector(0, 0), new Vector(0, 1), new Vector(1, 1), new Vector(1, 0)), 1, EPS);
		this.assert_equal_eps(geom.calcQuadrangleArea(new Vector(0, 0), new Vector(3, 4), new Vector(-1, 7), new Vector(-4, 3)), 25, EPS);
		// Rhombi
		for (let i = 1; i < 50; ++i) {
			this.assert_equal_eps(geom.calcQuadrangleArea(new Vector(0, 0), new Vector(5, i), new Vector(10, 0), new Vector(5, -i)), 10 * i, EPS);
		}
		// Parallelogram
		for (let i = 0; i < 500; ++i) {
			this.assert_equal_eps(geom.calcQuadrangleArea(new Vector(0, 0), new Vector(5, 0), new Vector(5 + i, 2), new Vector(i, 2)), 10, EPS);
		}
	}

		private testGeomCenter() {
		// circle
		let circle = [];
		for (let i = 0; i < 360; ++i) {
			let alpha = i * Math.PI / 180;
			circle.push(Vector.fromAngle(alpha));
		}
		this.assert_vector_equal_eps(geom.center(circle), new Vector(0, 0), EPS);
		// square
		let square = [new Vector(0, 0), new Vector(2, 0), new Vector(2, 2), new Vector(0, 2)];
		this.assert_vector_equal_eps(geom.center(square), new Vector(1, 1), EPS);
	}

	private testIsInTriangle() {
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(-1, -1)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(-1, 0)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0, -1)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0, -0.5)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(1, 1)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(2, 0.1)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0.1, 2)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0.6, 0.6)));

		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0, 0)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0, 1)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(1, 0)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0.5, 0.5)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0.3, 0.3)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0, 0.5)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0.5, 0)));

		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(-1, -1)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(-1, 0)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0, -1)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0, -0.5)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(1, 1)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(2, 0.1)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0.1, 2)));
		this.assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0.6, 0.6)));

		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0, 0)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0, 1)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(1, 0)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0.5, 0.5)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0.3, 0.3)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0, 0.5)));
		this.assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0.5, 0)));

		this.assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(-1, -1)));
		this.assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(-1, 0)));
		this.assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, -1)));
		this.assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, -0.5)));
		this.assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(1, 1)));
		this.assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(2, 0.1)));
		this.assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0.1, 2)));
		this.assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0.6, 0.6)));

		this.assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, 0)));
		this.assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, 1)));
		this.assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(1, 0)));
		this.assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0.5, 0.5)));
		this.assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0.3, 0.3)));
		this.assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, 0.5)));
		this.assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0.5, 0)));
	}

	private testNormalizeAngle() {
		this.assert_equal(geom.normalizeAngle(0), 0);
		this.assert_equal(geom.normalizeAngle(-1), -1);
		this.assert_equal(geom.normalizeAngle(1), 1);

		this.assert_equal_eps(geom.normalizeAngle(4), 4 - 2 * Math.PI, 0.001);
		this.assert_equal_eps(geom.normalizeAngle(-4), -4 + 2 * Math.PI, 0.001);
	}

	private testNormalizeAnglePositive() {
		this.assert_equal(geom.normalizeAnglePositive(0), 0);
		this.assert_equal(geom.normalizeAnglePositive(1), 1);
		this.assert_equal(geom.normalizeAnglePositive(4), 4);

		this.assert_equal_eps(geom.normalizeAnglePositive(7), 7 - 2 * Math.PI, 0.001);
		this.assert_equal_eps(geom.normalizeAnglePositive(-1), -1 + 2 * Math.PI, 0.001);
	}

	private testGetAngleDiff() {
		// test return interval
		MathUtil.randomseed(500);
		for (let i = 0; i < 1000; ++i) {
			let left = MathUtil.random() * 5;
			let right = MathUtil.random() * 5;
			let res = geom.getAngleDiff(left, right);
			this.assert_lte(res, Math.PI);
			this.assert_lte(-Math.PI, res);
		}

		this.assert_equal_eps(geom.getAngleDiff(-0.5, 0.5), 1, EPS);
	}

	// This test uses geom.intersectCircleCircle to verify the results
	private testInscribedAngle() {
		// test Thales theorem
		let [c1, c2, r] = geom.inscribedAngle(new Vector(0, 0), new Vector(2, 0), Math.PI / 2);
		this.assert_vector_equal_eps(c1, c2, EPS);
		this.assert_vector_equal_eps(c1, new Vector(1, 0), EPS);
		this.assert_equal_eps(r, 1, EPS);
		[c1, c2, r] = geom.inscribedAngle(new Vector(0, 0), new Vector(6, 8), Math.PI / 2);
		this.assert_vector_equal_eps(c1, c2, EPS);
		this.assert_vector_equal_eps(c1, new Vector(3, 4), EPS);
		this.assert_equal_eps(r, 5, EPS);

		// test for theta = Math.PI / 6 (30 degree), as ABC1 and ABC2 are regular triangles in that case.
		[c1, c2, r] = geom.inscribedAngle(new Vector(0, 0), new Vector(0, 5), Math.PI / 6);
		if (c1.x < 0) {
			[c2, c1] = [c1, c2];
		}
		let [r1, r2] = geom.intersectCircleCircle(new Vector(0, 0), 5, new Vector(0, 5), 5);
		this.assert_vector_equal_eps(c1, r1, EPS);
		this.assert_vector_equal_eps(c2, r2, EPS);
	}

	private testInsideRect() {
		this.assert_true(geom.insideRect(new Vector(0, 0), new Vector(1, 1), new Vector(0.5, 0.5)));
		this.assert_true(geom.insideRect(new Vector(1, 1), new Vector(0, 0), new Vector(0.5, 0.5)));
		this.assert_true(geom.insideRect(new Vector(0, 1), new Vector(1, 0), new Vector(0.5, 0.5)));
		this.assert_true(geom.insideRect(new Vector(1, 0), new Vector(0, 1), new Vector(0.5, 0.5)));
		this.assert_true(geom.insideRect(new Vector(0, 0), new Vector(1, 1), new Vector(1 - EPS, 1 - EPS)));
		this.assert_false(geom.insideRect(new Vector(0, 0), new Vector(2, 1), new Vector(0.5, 1.5)));
		this.assert_false(geom.insideRect(new Vector(0, 0), new Vector(2, 1), new Vector(1.5, 1.5)));
		this.assert_false(geom.insideRect(new Vector(0, 0), new Vector(1, 2), new Vector(1.5, 1.5)));
		this.assert_false(geom.insideRect(new Vector(0, 0), new Vector(1, 2), new Vector(1.5, 0.5)));
		// lines and corners are considered outside
		this.assert_false(geom.insideRect(new Vector(0, 0), new Vector(1, 1), new Vector(1, 0.5)));
		this.assert_false(geom.insideRect(new Vector(0, 0), new Vector(1, 1), new Vector(1, 1)));
	}
}
export let testClass = BaseGeom;
