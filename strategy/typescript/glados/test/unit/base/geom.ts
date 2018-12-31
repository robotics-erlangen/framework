import * as geom from "base/geom";
import { Vector } from "base/vector";
import { UnitTest } from "glados/test/unit/unittest";

export class BaseGeom extends UnitTest {
	constructor() {
		super();
		this.addTest("intersectLineLine", this.testIntersectLineLine);
		this.addTest("duplicates", this.testIsInTriangle);
		this.addTest("intersectLineCorridor", this.testIntersectLineCorridor);
	}

	private testIntersectLineLine() {
		{
			let [ret, l1, l2] = geom.intersectLineLine(new Vector(0, 0), new Vector(0, 1), new Vector(0, 1), new Vector(0, -1));
			this.assert_vector_equal(ret!, new Vector(0, 0));
			this.assert_equal(l1, 0);
			this.assert_equal(l2, 0);
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
}
export let testClass = BaseGeom;
