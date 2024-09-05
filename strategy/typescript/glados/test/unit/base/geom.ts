import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";

const EPS = 1E-12;

export class BaseGeom extends UnitTest {
	public constructor() {
		super();
		this._addTest("intersectCircleCircle", this._testIntersectCircleCircle);
		this._addTest("boundRect", this._testBoundRect);
		this._addTest("intersectLineCircle", this._testIntersectLineCircle);
		this._addTest("intersectLineCorridor", this._testIntersectLineCorridor);
		this._addTest("tangensToCircle", this._testGetTangesToCircle);
		this._addTest("innerTangensToCircle", this._testGetInnerTangensToCircle);
		this._addTest("intersectLineLine", this._testIntersectLineLine);
		this._addTest("intersectLinesByPoints", this._testIntersectLinesByPoints);
		this._addTest("triangleArea", this._testTriangleArea);
		this._addTest("checkTriangleOrientation", this._testCheckTriangleOrientation);
		this._addTest("quadrangleArea", this._testQuadrangleArea);
		this._addTest("geomCenter", this._testGeomCenter);
		this._addTest("isInTriangle", this._testIsInTriangle);
		this._addTest("normalizeAngle", this._testNormalizeAngle);
		this._addTest("normalizeAnglePositive", this._testNormalizeAnglePositive);
		this._addTest("angleDiff", this._testGetAngleDiff);
		this._addTest("bisectingAngle", this._testBisectingAngle);
		this._addTest("inscribedAngle", this._testInscribedAngle);
		this._addTest("insideRect", this._testInsideRect);
		this._addTest("isInStadium", this._testIsInStadium);
		this._addTest("angleBound", this._testAngleBound);
		this._addTest("enclosingAngles", this._testEnclosingAngles);
	}

	private _testIntersectCircleCircle() {
		{
			let [ret, r1] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(0, 1), 1);
			this._assert_not_undefined(ret);
			this._assert_vector_eq_eps(ret!, new Vector(0, 2), EPS);
			this._assert_undefined(r1);
		}
		{
			let [ret, r1] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(0, -1), 1);
			this._assert_not_undefined(ret);
			this._assert_vector_eq_eps(ret!, new Vector(0, -2), EPS);
			this._assert_undefined(r1);
		}
		{
			let [ret, r1] = geom.intersectCircleCircle(new Vector(0, 0), 1, new Vector(0, 2), 1);
			this._assert_not_undefined(ret);
			this._assert_vector_eq(ret!, new Vector(0, 1));
			this._assert_undefined(r1);
		}
		{
			let [ret2, l2] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(2, 0), 1);
			if (ret2!.distanceToSq(new Vector(1.75, Math.sqrt(15) / 4)) > EPS * EPS) {
				[ret2, l2] = [l2, ret2];
			}
			this._assert_eq_eps(ret2!.distanceToSq(new Vector(1.75, Math.sqrt(15) / 4)), 0, EPS);
			this._assert_eq_eps(l2!.distanceToSq(new Vector(1.75, -Math.sqrt(15) / 4)), 0, EPS);
		}
		{
			let [ret3, l3] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(0, Math.sqrt(3)), 1);
			this._assert_eq_eps(ret3!.distanceToSq(new Vector(1, Math.sqrt(3))), 0, EPS);
			this._assert_eq_eps(l3!.distanceToSq(new Vector(-1, Math.sqrt(3))), 0, EPS);
		}
		{
			let [ret4, l4] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(2, 2), 1);
			this._assert_eq_eps(ret4!.distanceToSq(new Vector(1.0 / 8 * (11 + Math.sqrt(7)), 1.0 / 8 * (11 - Math.sqrt(7)))), 0, EPS);
			this._assert_eq_eps(l4!.distanceToSq(new Vector(1.0 / 8 * (11 - Math.sqrt(7)), 1.0 / 8 * (11 + Math.sqrt(7)))), 0, EPS);
		}
		{
			let [ret4, l4] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(2, 0), 0);
			this._assert_not_undefined(ret4);
			this._assert_vector_eq(ret4!, new Vector(2, 0));
			this._assert_undefined(l4);
		}
		{
			let [ret6, l6] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(2, 0), EPS);
			this._assert_not_undefined(ret6);
			this._assert_eq_eps(ret6!.distanceToSq(new Vector(2, 0)), 0, EPS * EPS);
			this._assert_undefined(l6);
		}
		{
			let [ret7, l7] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(2, 4), 1);
			this._assert_undefined(ret7);
			this._assert_undefined(l7);
		}
		{
			let [ret8, l8] = geom.intersectCircleCircle(new Vector(0, 0), 2, new Vector(0, 0), 1);
			this._assert_undefined(ret8);
			this._assert_undefined(l8);
		}
	}

	private _testBoundRect() {
		// right
		this._assert_vector_eq(geom.boundRect(new Vector(-1, -1), new Vector(2, 0), new Vector(1, 1)), new Vector(1, 0));
		this._assert_vector_eq(geom.boundRect(new Vector(-1, -1), new Vector(0.5, 0), new Vector(1, 1)), new Vector(0.5, 0));

		// left
		this._assert_vector_eq(geom.boundRect(new Vector(-1, -1), new Vector(-2, 0), new Vector(1, 1)), new Vector(-1, 0));
		this._assert_vector_eq(geom.boundRect(new Vector(-1, -1), new Vector(-0.5, 0), new Vector(1, 1)), new Vector(-0.5, 0));

		// top
		this._assert_vector_eq(geom.boundRect(new Vector(-1, -1), new Vector(0, -2), new Vector(1, 1)), new Vector(0, -1));
		this._assert_vector_eq(geom.boundRect(new Vector(-1, -1), new Vector(0, -0.5), new Vector(1, 1)), new Vector(0, -0.5));

		// bottom
		this._assert_vector_eq(geom.boundRect(new Vector(-1, -1), new Vector(0, 2), new Vector(1, 1)), new Vector(0, 1));
		this._assert_vector_eq(geom.boundRect(new Vector(-1, -1), new Vector(0, 0.5), new Vector(1, 1)), new Vector(0, 0.5));

		// other
		this._assert_vector_eq(geom.boundRect(new Vector(0, 0), new Vector(123, 321), new Vector(0, 0)), new Vector(0, 0));
	}

	private _testIntersectLineCircle() {
		// x direction
		let [intersect1, intersect2, l1, l2] = geom.intersectLineCircle(new Vector(-2, 0), new Vector(1, 0), new Vector(0, 0), 1);
		this._assert_not_undefined(intersect1);
		this._assert_not_undefined(intersect2);
		this._assert_not_undefined(l1);
		this._assert_not_undefined(l2);
		this._assert_eq_eps(l2!, 1, EPS);
		this._assert_eq_eps(l1!, 3, EPS);
		this._assert_vector_eq(intersect2!, new Vector(-1, 0));
		this._assert_vector_eq(intersect1!, new Vector(1, 0));

		// y direction
		[intersect1, intersect2, l1, l2] = geom.intersectLineCircle(new Vector(0, -2), new Vector(0, 1), new Vector(0, 0), 1);
		this._assert_not_undefined(intersect1);
		this._assert_not_undefined(intersect2);
		this._assert_not_undefined(l1);
		this._assert_not_undefined(l2);
		this._assert_vector_eq(intersect2!, new Vector(0, -1));
		this._assert_vector_eq(intersect1!, new Vector(0, 1));
		this._assert_eq_eps(l2!, 1, EPS);
		this._assert_eq_eps(l1!, 3, EPS);


		// line start inside
		[intersect1, intersect2, l1, l2] = geom.intersectLineCircle(new Vector(0, 0), new Vector(0, 1), new Vector(0, 0), 1);
		this._assert_not_undefined(intersect1);
		this._assert_not_undefined(intersect2);
		this._assert_not_undefined(l1);
		this._assert_not_undefined(l2);
		this._assert_vector_eq(intersect2!, new Vector(0, -1));
		this._assert_vector_eq(intersect1!, new Vector(0, 1));
		this._assert_eq_eps(l2!, -1, EPS);
		this._assert_eq_eps(l1!, 1, EPS);

		// no intersection case
		this._assert_eq(geom.intersectLineCircle(new Vector(-2, -2), new Vector(1, 0), new Vector(0, 0), 1).length, 0);
	}

	private _testIntersectLineCorridor() {
		// line with no direction and base point outside the corridor
		let [p1, p2, l1, l2, l3, l4] = geom.intersectLineCorridor(new Vector(0, 0), new Vector(0, 0), new Vector(1, 1), new Vector(1, 0), 0.5);
		this._assert_eq(p1, undefined);
		this._assert_eq(p2, undefined);
		this._assert_eq(l1, undefined);
		this._assert_eq(l2, undefined);
		this._assert_eq(l3, undefined);
		this._assert_eq(l4, undefined);

		// line with no direction and base point inside the corridor
		[p1, p2, l1, l2, l3, l4] = geom.intersectLineCorridor(new Vector(1, 1), new Vector(0, 0), new Vector(1, 1), new Vector(1, 0), 0.5);
		this._assert_eq(p1, undefined);
		this._assert_eq(p2, undefined);
		this._assert_eq(l1, -Infinity);
		this._assert_eq(l2, Infinity);
		this._assert_eq(l3, -Infinity);
		this._assert_eq(l4, Infinity);

		// line inside the corridor
		[p1, p2, l1, l2, l3, l4] = geom.intersectLineCorridor(new Vector(0, 1), new Vector(1, 0), new Vector(1, 1), new Vector(1, 0), 0.5);
		this._assert_eq(p1, undefined);
		this._assert_eq(p2, undefined);
		this._assert_eq(l1, -Infinity);
		this._assert_eq(l2, Infinity);
		this._assert_eq(l3, -Infinity);
		this._assert_eq(l4, Infinity);

		// line outside the corridor parallel (->no intersection)
		[p1, p2, l1, l2, l3, l4] = geom.intersectLineCorridor(new Vector(0, 100), new Vector(1, 0), new Vector(1, 1), new Vector(1, 0), 0.5);
		this._assert_eq(p1, undefined);
		this._assert_eq(p2, undefined);
		this._assert_eq(l1, undefined);
		this._assert_eq(l2, undefined);
		this._assert_eq(l3, undefined);
		this._assert_eq(l4, undefined);

		// line perpendicular to corridor
		[p1, p2, l1, l2, l3, l4] = geom.intersectLineCorridor(new Vector(0, 100), new Vector(0, -1), new Vector(1, 1), new Vector(1, 0), 0.5);
		this._assert_not_undefined(p1);
		this._assert_not_undefined(p2);
		this._assert_vector_eq(p1!, new Vector(0, 1.5));
		this._assert_vector_eq(p2!, new Vector(0, 0.5));
		this._assert_eq(l1, 98.5);
		this._assert_eq(l2, 99.5);
		this._assert_eq(l3, -1);
		this._assert_eq(l4, -1);

		// regular case
		[p1, p2, l1, l2, l3, l4] = geom.intersectLineCorridor(new Vector(0, 0), new Vector(1, 1), new Vector(2, 0), new Vector(0, 1), 1);
		this._assert_not_undefined(p1);
		this._assert_not_undefined(p2);
		this._assert_vector_eq(p1!, new Vector(1, 1));
		this._assert_vector_eq(p2!, new Vector(3, 3));
		this._assert_eq(l1, 1);
		this._assert_eq(l2, 3);
		this._assert_eq(l3, 1);
		this._assert_eq(l4, 3);

		// corridor with width = 0
		[p1, p2, l1, l2, l3, l4] = geom.intersectLineCorridor(new Vector(0, 0), new Vector(1, 1), new Vector(2, 0), new Vector(0, 1), 0);
		this._assert_not_undefined(p1);
		this._assert_not_undefined(p2);
		this._assert_vector_eq(p1!, new Vector(2, 2));
		this._assert_vector_eq(p2!, new Vector(2, 2));
		this._assert_eq(l1, 2);
		this._assert_eq(l2, 2);
		this._assert_eq(l3, 2);
		this._assert_eq(l4, 2);
	}

	private _testGetTangesToCircle() {
		let [tp1, tp2] = geom.getTangentsToCircle(new Vector(4, 3), new Vector(0, 0), 3);
		this._assert_not_undefined(tp1);
		this._assert_not_undefined(tp2);
		if (tp1!.distanceToSq(new Vector(0, 3)) > EPS) {
			[tp2, tp1] = [tp1, tp2];
		}
		this._assert_vector_eq_eps(tp1!, new Vector(0, 3), EPS);
		this._assert_vector_eq_eps(tp2!, new Vector(72 / 25, -21 / 25), EPS);

		let [tp3, tp4] = geom.getTangentsToCircle(new Vector(3, 3), new Vector(0, 0), 3);
		this._assert_not_undefined(tp3);
		this._assert_not_undefined(tp4);
		if (tp3!.distanceToSq(new Vector(0, 3)) > EPS) {
			[tp4, tp3] = [tp3, tp4];
		}
		this._assert_vector_eq_eps(tp3!, new Vector(0, 3), EPS);
		this._assert_vector_eq_eps(tp4!, new Vector(3, 0), EPS);

		let [tp5, tp6] = geom.getTangentsToCircle(new Vector(3, 0), new Vector(0, 0), 3);
		this._assert_not_undefined(tp5);
		this._assert_vector_eq_eps(tp5!, new Vector(3, 0), EPS);
		this._assert_undefined(tp6);

		let [tp7, tp8] = geom.getTangentsToCircle(new Vector(2, 0), new Vector(0, 0), 3);
		this._assert_undefined(tp7);
		this._assert_undefined(tp8);
	}

	private _testGetInnerTangensToCircle() {
		let [i1, t1, t2] = geom.getInnerTangentsToCircles(new Vector(0, 0), 3, new Vector(8, 0), 3);
		this._assert_not_undefined(i1);
		this._assert_vector_eq_eps(i1!, new Vector(4, 0), EPS);
		let [s1, s2] = [new Vector(9 / 4, -3 / 4 * Math.sqrt(7)), new Vector(9 / 4, 3 / 4 * Math.sqrt(7))];
		if (s1.distanceToSq(t1!) > EPS * EPS) {
			[s1, s2] = [s2, s1];
		}
		this._assert_not_undefined(t1);
		this._assert_not_undefined(t2);
		this._assert_vector_eq_eps(t1!, s1, EPS);
		this._assert_vector_eq_eps(t2!, s2, EPS);
		this._assert_eq(geom.getInnerTangentsToCircles(new Vector(0, 0), 2, new Vector(3, 0), 2).length, 0);
	}

	private _testIntersectLineLine() {
		{
			let [ret, l1, l2] = geom.intersectLineLine(new Vector(0, 0), new Vector(0, 1), new Vector(0, 1), new Vector(0, -1));
			this._assert_eq(ret, undefined);
			this._assert_eq(l1, undefined);
			this._assert_eq(l2, undefined);
		}
		{
			let [ret, l1, l2] = geom.intersectLineLine(new Vector(0, 0), new Vector(0, 1), new Vector(0.1, 1), new Vector(0, -1));
			this._assert_eq(ret, undefined);
			this._assert_eq(l1, undefined);
			this._assert_eq(l2, undefined);
		}
		{
			let [ret, l1, l2] = geom.intersectLineLine(new Vector(0, 0), new Vector(0, 1), new Vector(1, 1), new Vector(1, 0));
			this._assert_vector_eq(ret!, new Vector(0, 1));
			this._assert_eq(l1, 1);
			this._assert_eq(l2, -1);
		}
		{
			// parallel
			let [ret, l1, l2] = geom.intersectLineLine(new Vector(0, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, -1));
			this._assert_eq(ret, undefined);
			this._assert_eq(l1, undefined);
			this._assert_eq(l2, undefined);
		}
	}

	private _testIntersectLinesByPoints() {
		let [ret1, l1, l2] = geom.intersectLinesByPoints(new Vector(0, 0), new Vector(0, 1), new Vector(0, 1), new Vector(0, 0));
		this._assert_undefined(ret1);
		this._assert_undefined(l1);
		this._assert_undefined(l2);
		[ret1, l1, l2] = geom.intersectLinesByPoints(new Vector(0, 0), new Vector(0, 2), new Vector(3, 3), new Vector(2, 2));
		this._assert_not_undefined(ret1);
		this._assert_vector_eq_eps(ret1!, new Vector(0, 0), EPS);
		this._assert_eq_eps(l1!, 0, EPS);
		this._assert_eq_eps(l2!, 3, EPS);
		[ret1, l1, l2] = geom.intersectLinesByPoints(new Vector(0, 0), new Vector(0, 1), new Vector(1, 1), new Vector(1, 0));
		this._assert_undefined(ret1);
		this._assert_undefined(l1);
		this._assert_undefined(l2);
	}

	private _testTriangleArea() {
		let area = geom.calcTriangleArea(new Vector(0, 0), new Vector(0, 3), new Vector(4, 3));
		this._assert_eq_eps(area, 6, EPS);
		area = geom.calcTriangleArea(new Vector(0, 0), new Vector(3, 0), new Vector(3, 4));
		this._assert_eq_eps(area, 6, EPS);
		area = geom.calcTriangleArea(new Vector(0, 0), new Vector(0, 6), new Vector(3, 3));
		this._assert_eq_eps(area, 9, EPS);
		for (let i = 1; i < 90; ++i) {
			let alpha = geom.degreeToRadian(i);
			let intersect = geom.intersectCircleCircle(new Vector(3, 4), Math.sqrt(2 * (2.5) * (2.5) * (1 - Math.cos(2 * alpha))), new Vector(1.5, 2), 2.5)[0]!;
			area = geom.calcTriangleArea(new Vector(0, 0), new Vector(3, 4), intersect);
			// sin = opposite / hypotenuse
			let b = Math.sin(alpha) * 5;
			// cos = adjecent / hypotenuse
			let a = Math.cos(alpha) * 5;
			this._assert_eq_eps(area, a * b * 0.5, EPS);
		}
	}

	private _testCheckTriangleOrientation() {
		this._assert_eq(geom.checkTriangleOrientation(new Vector(-1, 0), new Vector(0, 1), new Vector(1, 0)), -1);
		this._assert_eq(geom.checkTriangleOrientation(new Vector(-1, 0), new Vector(0, 0), new Vector(1, 0)), 0);
		this._assert_eq(geom.checkTriangleOrientation(new Vector(1, 0), new Vector(0, 1), new Vector(-1, 0)), 1);
	}

	private _testQuadrangleArea() {
		// Squares
		this._assert_eq_eps(geom.calcQuadrangleArea(new Vector(0, 0), new Vector(1, 0), new Vector(1, 1), new Vector(0, 1)), 1, EPS);
		this._assert_eq_eps(geom.calcQuadrangleArea(new Vector(0, 0), new Vector(0, 1), new Vector(1, 1), new Vector(1, 0)), 1, EPS);
		this._assert_eq_eps(geom.calcQuadrangleArea(new Vector(0, 0), new Vector(3, 4), new Vector(-1, 7), new Vector(-4, 3)), 25, EPS);
		// Rhombi
		for (let i = 1; i < 50; ++i) {
			this._assert_eq_eps(geom.calcQuadrangleArea(new Vector(0, 0), new Vector(5, i), new Vector(10, 0), new Vector(5, -i)), 10 * i, EPS);
		}
		// Parallelogram
		for (let i = 0; i < 500; ++i) {
			this._assert_eq_eps(geom.calcQuadrangleArea(new Vector(0, 0), new Vector(5, 0), new Vector(5 + i, 2), new Vector(i, 2)), 10, EPS);
		}
	}

	private _testGeomCenter() {
		// circle
		let circle = [];
		for (let i = 0; i < 360; ++i) {
			let alpha = geom.degreeToRadian(i);
			circle.push(Vector.fromAngle(alpha));
		}
		this._assert_vector_eq_eps(geom.center(circle), new Vector(0, 0), EPS);
		// square
		let square = [new Vector(0, 0), new Vector(2, 0), new Vector(2, 2), new Vector(0, 2)];
		this._assert_vector_eq_eps(geom.center(square), new Vector(1, 1), EPS);
	}

	private _testIsInTriangle() {
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(-1, -1)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(-1, 0)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0, -1)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0, -0.5)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(1, 1)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(2, 0.1)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0.1, 2)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0.6, 0.6)));

		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0, 0)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0, 1)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(1, 0)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0.5, 0.5)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0.3, 0.3)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0, 0.5)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(0, 1), new Vector(1, 0), new Vector(0.5, 0)));

		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(-1, -1)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(-1, 0)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0, -1)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0, -0.5)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(1, 1)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(2, 0.1)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0.1, 2)));
		this._assert_false(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0.6, 0.6)));

		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0, 0)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0, 1)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(1, 0)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0.5, 0.5)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0.3, 0.3)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0, 0.5)));
		this._assert_true(geom.isInTriangle(new Vector(0, 0), new Vector(1, 0), new Vector(0, 1), new Vector(0.5, 0)));

		this._assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(-1, -1)));
		this._assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(-1, 0)));
		this._assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, -1)));
		this._assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, -0.5)));
		this._assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(1, 1)));
		this._assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(2, 0.1)));
		this._assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0.1, 2)));
		this._assert_false(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0.6, 0.6)));

		this._assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, 0)));
		this._assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, 1)));
		this._assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(1, 0)));
		this._assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0.5, 0.5)));
		this._assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0.3, 0.3)));
		this._assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0, 0.5)));
		this._assert_true(geom.isInTriangle(new Vector(1, 0), new Vector(0, 1), new Vector(0, 0), new Vector(0.5, 0)));
	}

	private _testNormalizeAngle() {
		this._assert_eq(geom.normalizeAngle(0), 0);
		this._assert_eq(geom.normalizeAngle(-1), -1);
		this._assert_eq(geom.normalizeAngle(1), 1);

		this._assert_eq_eps(geom.normalizeAngle(4), 4 - 2 * Math.PI, 0.001);
		this._assert_eq_eps(geom.normalizeAngle(-4), -4 + 2 * Math.PI, 0.001);

		this._assert_nan(geom.normalizeAngle(NaN));
	}

	private _testNormalizeAnglePositive() {
		this._assert_eq(geom.normalizeAnglePositive(0), 0);
		this._assert_eq(geom.normalizeAnglePositive(1), 1);
		this._assert_eq(geom.normalizeAnglePositive(4), 4);

		this._assert_eq_eps(geom.normalizeAnglePositive(7), 7 - 2 * Math.PI, 0.001);
		this._assert_eq_eps(geom.normalizeAnglePositive(-1), -1 + 2 * Math.PI, 0.001);

		this._assert_nan(geom.normalizeAnglePositive(NaN));
	}

	private _testGetAngleDiff() {
		// test return interval
		MathUtil.randomseed(500);
		for (let i = 0; i < 1000; ++i) {
			let left = MathUtil.random() * 5;
			let right = MathUtil.random() * 5;
			let res = geom.getAngleDiff(left, right);
			this._assert_le(res, Math.PI);
			this._assert_le(-Math.PI, res);
		}

		this._assert_eq_eps(geom.getAngleDiff(-0.5, 0.5), 1, EPS);
	}

	private _testBisectingAngle() {
		let pi = Math.PI;
		let piHalf = Math.PI / 2;
		this._assert_eq(geom.bisectingAngle(0, 0), 0);
		this._assert_eq(geom.bisectingAngle(pi, pi), pi);
		this._assert_eq(geom.bisectingAngle(-pi, -pi), -pi);
		this._assert_eq(geom.bisectingAngle(piHalf, piHalf), piHalf);
		this._assert_eq(geom.bisectingAngle(-piHalf, -piHalf), -piHalf);

		this._assert_eq(geom.bisectingAngle(pi, -pi), pi);
		this._assert_eq(geom.bisectingAngle(piHalf, -piHalf), 0);

		this._assert_eq(geom.bisectingAngle((pi / 4), -(pi / 4)), 0);
		this._assert_eq(geom.bisectingAngle((pi * 3 / 4), -(pi * 3 / 4)), pi);
		this._assert_eq(geom.bisectingAngle((pi * 3 / 4), (pi / 4)), (pi / 2));
		this._assert_eq(geom.bisectingAngle(-(pi * 3 / 4), -(pi / 4)), -(pi / 2));

		this._assert_eq(geom.bisectingAngle((7 * pi / 9), -(7 * pi / 9)), pi);
		this._assert_eq(geom.bisectingAngle(-(7 * pi / 9), (7 * pi / 9)), pi);

		this._assert_eq(geom.bisectingAngle(pi / 6, pi / 8), pi * 7 / 48);
		this._assert_eq(geom.bisectingAngle(pi / 8, pi / 6), pi * 7 / 48);

		this._assert_eq(geom.bisectingAngle(pi / 8, pi / 6), pi * 7 / 48);
		this._assert_eq(geom.bisectingAngle(pi / 8, pi / 6), pi * 7 / 48);
	}

	// This test uses geom.intersectCircleCircle to verify the results
	private _testInscribedAngle() {
		// test Thales theorem
		let [c1, c2, r] = geom.inscribedAngle(new Vector(0, 0), new Vector(2, 0), Math.PI / 2);
		this._assert_vector_eq_eps(c1, c2, EPS);
		this._assert_vector_eq_eps(c1, new Vector(1, 0), EPS);
		this._assert_eq_eps(r, 1, EPS);
		[c1, c2, r] = geom.inscribedAngle(new Vector(0, 0), new Vector(6, 8), Math.PI / 2);
		this._assert_vector_eq_eps(c1, c2, EPS);
		this._assert_vector_eq_eps(c1, new Vector(3, 4), EPS);
		this._assert_eq_eps(r, 5, EPS);

		// test for theta = Math.PI / 6 (30 degree), as ABC1 and ABC2 are regular triangles in that case.
		[c1, c2, r] = geom.inscribedAngle(new Vector(0, 0), new Vector(0, 5), Math.PI / 6);
		if (c1.x < 0) {
			[c2, c1] = [c1, c2];
		}
		let [r1, r2] = geom.intersectCircleCircle(new Vector(0, 0), 5, new Vector(0, 5), 5);
		this._assert_not_undefined(r1);
		this._assert_not_undefined(r2);
		this._assert_vector_eq_eps(c1, r1!, EPS);
		this._assert_vector_eq_eps(c2, r2!, EPS);
	}

	private _testInsideRect() {
		this._assert_true(geom.insideRect(new Vector(0, 0), new Vector(1, 1), new Vector(0.5, 0.5)));
		this._assert_true(geom.insideRect(new Vector(1, 1), new Vector(0, 0), new Vector(0.5, 0.5)));
		this._assert_true(geom.insideRect(new Vector(0, 1), new Vector(1, 0), new Vector(0.5, 0.5)));
		this._assert_true(geom.insideRect(new Vector(1, 0), new Vector(0, 1), new Vector(0.5, 0.5)));
		this._assert_true(geom.insideRect(new Vector(0, 0), new Vector(1, 1), new Vector(1 - EPS, 1 - EPS)));
		this._assert_false(geom.insideRect(new Vector(0, 0), new Vector(2, 1), new Vector(0.5, 1.5)));
		this._assert_false(geom.insideRect(new Vector(0, 0), new Vector(2, 1), new Vector(1.5, 1.5)));
		this._assert_false(geom.insideRect(new Vector(0, 0), new Vector(1, 2), new Vector(1.5, 1.5)));
		this._assert_false(geom.insideRect(new Vector(0, 0), new Vector(1, 2), new Vector(1.5, 0.5)));
		// lines and corners are considered outside
		this._assert_false(geom.insideRect(new Vector(0, 0), new Vector(1, 1), new Vector(1, 0.5)));
		this._assert_false(geom.insideRect(new Vector(0, 0), new Vector(1, 1), new Vector(1, 1)));
	}

	private _testIsInStadium() {
		this._assert_true(geom.isInStadium(new Vector(0, 0), new Vector(1, 0), 0.5, new Vector(0, 0)));
		this._assert_true(geom.isInStadium(new Vector(0, 0), new Vector(1, 0), 0.5, new Vector(1, 0)));
		this._assert_true(geom.isInStadium(new Vector(0, 0), new Vector(1, 0), 0.5, new Vector(0.5, 0)));

		this._assert_false(geom.isInStadium(new Vector(0, 0), new Vector(1, 0), 0.5, new Vector(-0.5, -0.5)));
		this._assert_false(geom.isInStadium(new Vector(0, 0), new Vector(1, 0), 0.5, new Vector(1.5, 0.5)));
	}

	private _testAngleBound() {
		// easy scenario: angle is in between both
		this._assert_eq(geom.angleBound(1.0 / 2 * Math.PI, Math.PI, 3.0 / 2 * Math.PI), Math.PI);
		// easy scenario: angle is left boundary
		this._assert_eq(geom.angleBound(1.0 / 2 * Math.PI, 1.0 / 2 * Math.PI, 3.0 / 2 * Math.PI), 1.0 / 2 * Math.PI);
		// easy scenario: angle is right boundary
		this._assert_eq(geom.angleBound(1.0 / 2 * Math.PI, 3.0 / 2 * Math.PI, 3.0 / 2 * Math.PI), 3.0 / 2 * Math.PI);

		// medium scenario: normal bound would be correct
		this._assert_eq(geom.angleBound(1.0 / 2 * Math.PI, 7.0 / 4 * Math.PI, 3.0 / 2 * Math.PI), 3.0 / 2 * Math.PI);
		this._assert_eq(geom.angleBound(1.0 / 2 * Math.PI, 1.0 / 4 * Math.PI, 3.0 / 2 * Math.PI), 1.0 / 2 * Math.PI);


		// hard scenario: normal bound would be wrong
		const EPSILON = 1e-6;
		this._assert_eq(geom.angleBound(Math.PI, 1.0 / 8 * Math.PI, 2 * Math.PI - EPSILON), 2 * Math.PI - EPSILON);
		this._assert_eq(geom.angleBound(Math.PI, 3.0 / 8 * Math.PI, 2 * Math.PI - EPSILON), 2 * Math.PI - EPSILON);
		this._assert_eq(geom.angleBound(Math.PI, 5.0 / 8 * Math.PI, 2 * Math.PI - EPSILON), Math.PI);
	}

	private _testEnclosingAngles() {
		// Angle lists before and after center are empty
		this._assert_deep_eq(
			geom.enclosingAngles(0, []),
			[0, 0, 0, 0],
		);

		// Angle lists before center is empty
		this._assert_deep_eq(
			geom.enclosingAngles(Math.PI / 2, [0]),
			[0, Math.PI / 2, -Math.PI / 2, 0],
		);
		this._assert_deep_eq(
			geom.enclosingAngles(Math.PI / 2, [0, -Math.PI / 4]),
			[-Math.PI / 4, Math.PI / 2, -3 * Math.PI / 4, 0],
		);

		// Angle lists after center is empty
		this._assert_deep_eq(
			geom.enclosingAngles(Math.PI / 2, [Math.PI]),
			[Math.PI / 2, Math.PI, 0, Math.PI / 2],
		);
		this._assert_deep_eq(
			geom.enclosingAngles(Math.PI / 2, [Math.PI, 0.75 * Math.PI]),
			[Math.PI / 2, Math.PI, 0, Math.PI / 2],
		);

		// Both angle lists are filled
		this._assert_deep_eq(
			geom.enclosingAngles(0, [Math.PI / 2, -Math.PI / 2]),
			[-Math.PI / 2, Math.PI / 2, -Math.PI / 2, Math.PI / 2],
		);

		this._assert_deep_eq(
			geom.enclosingAngles(0, [Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4]),
			[-Math.PI / 2, Math.PI / 2, -Math.PI / 2, Math.PI / 2],
		);

		// Handles some weird cases
		this._assert_deep_eq(
			geom.enclosingAngles(3 * Math.PI, [Math.PI / 2, -Math.PI / 2]),
			[Math.PI / 2, -Math.PI / 2, -Math.PI / 2, Math.PI / 2],
		);
	}
}
export let testClass = BaseGeom;
