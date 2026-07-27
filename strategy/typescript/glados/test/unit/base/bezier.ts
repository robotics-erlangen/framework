/**************************************************************************
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
**************************************************************************/

import { CubicBezierCurve, CubicBezierSpline } from "base/bezier";
import * as Mathutil from "base/mathutil";
import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseBezier extends UnitTest {
	public constructor() {
		super();
		this._addTest("curve sampling (linear)", this._curveSamplingLinear);
		this._addTest("curve distance conversions (linear)", this._curveDistLinear);
		this._addTest("curve circle approximation and sampling", this._curveCirc);
		this._addTest("curve precision value (circle)", this._curvePrecisionCirc);
		this._addTest("curve bounding box", this._curveBoundingBox);
		this._addTest("curve line intersection", this._curveLineIntersect);

		this._addTest("spline construction", this._splineConstruction);
		this._addTest("spline one segment (linear)", this._splineOneSegmentLinear);
		this._addTest("spline sampling (corner)", this._splineSamplingCorner);
		this._addTest("spline distance conversions (corner)", this._splineDistCorner);
		this._addTest("spline line intersection", this._splineLineIntersect);
		this._addTest("spline continuity check", this._splineContinuityCheck);
		this._addTest("spline extension", this._splineExtension);
	}

	private _curveSamplingLinear() {
		let startPoint = new Vector(0, 0);
		let endPoint = new Vector(2, 0);
		let curve = CubicBezierCurve.newLinear(startPoint, endPoint);
		this._assert_deep_eq(curve.getPosByT(0), startPoint, () => "getPosByT(0)");
		this._assert_lt(curve.getPosByT(0.1).distanceToSq(new Vector(0.2, 0)), 1e-5, () => "getPosByT(0.1)");
		this._assert_deep_eq(curve.getPosByT(1), endPoint, () => "getPosByT(1)");
		this._assert_lt(curve.getDirByT(0).distanceToSq(new Vector(2, 0)), 1e-5, () => "getDirByT(0)");
		this._assert_lt(curve.getDirByT(0.1).distanceToSq(new Vector(2, 0)), 1e-5, () => "getDirByT(0.1)");
		this._assert_lt(curve.getDirByT(1).distanceToSq(new Vector(2, 0)), 1e-5, () => "getDirByT(1)");
		this._assert_lt(curve.getAccByT(0).lengthSq(), 1e-5, () => "getAccByT(0)");
		this._assert_lt(curve.getAccByT(0.1).lengthSq(), 1e-5, () => "getAccByT(0.1)");
		this._assert_lt(curve.getAccByT(1).lengthSq(), 1e-5, () => "getAccByT(1)");
	}

	private _curveDistLinear() {
		let startPoint = new Vector(0, 0);
		let endPoint = new Vector(2, 0);
		let curve = CubicBezierCurve.newLinear(startPoint, endPoint);
		// Perfect conversion for linear curves
		this._assert_eq(curve.arcLength, 2, () => "arcLength");
		this._assert_eq(curve.distToT(0), 0, () => "distToT(0)");
		this._assert_eq(curve.distToT(0.2), 0.1, () => "distToT(0.2)");
		this._assert_eq(curve.distToT(2), 1, () => "distToT(2)");
		this._assert_eq(curve.tToDist(0), 0, () => "tToDist(0)");
		this._assert_eq(curve.tToDist(0.1), 0.2, () => "tToDist(0.1)");
		this._assert_eq(curve.tToDist(1), 2, () => "tToDist(1)");
	}

	private _curveCirc() {
		for (let i = 0; i < 10; i++) {
			Mathutil.randomseed(i);
			let startPoint = new Vector(Mathutil.random(), Mathutil.random());
			let endPoint = new Vector(Mathutil.random(), Mathutil.random());
			let clockwise = Mathutil.randomInt([0, 1]) === 1;
			let centerPoint = startPoint + (endPoint - startPoint).rotated(clockwise ? Math.PI / -4 : Math.PI / 4) / Math.SQRT2;
			let curve = CubicBezierCurve.newQuarterCircle(startPoint, endPoint, clockwise, 1000); // High precision to test the approximation without sampling errors

			let maxDiff = 0;
			for (let j = 0; j < 100; j++) {
				Mathutil.randomseed(j);
				let rand = Mathutil.random();
				let r = clockwise ? 0.5 * Math.PI * rand : -0.5 * Math.PI * rand;
				let reference = centerPoint + (startPoint - centerPoint).rotated(-r);
				let approx = curve.getPosByDist(rand * curve.arcLength);
				maxDiff = Math.max(maxDiff, approx.distanceTo(reference));
			}
			this._assert_lt(maxDiff, 0.0002, () => `max radial drift with ${clockwise ? "clockwise" : "counter-clockwise"} quarter circle from ${startPoint} to ${endPoint}`);
		}
	}

	private _curvePrecisionCirc() {
		let startPoint = new Vector(0, 1);
		let endPoint = new Vector(1, 0);
		let curve1 = CubicBezierCurve.newQuarterCircle(startPoint, endPoint, true, 0);
		let curve2 = CubicBezierCurve.newQuarterCircle(startPoint, endPoint, true, 10);
		let curve3 = CubicBezierCurve.newQuarterCircle(startPoint, endPoint, true, 100);
		let refLength = 0.5 * Math.PI;
		this._assert_lt(Math.abs(curve3.arcLength - refLength), Math.abs(curve2.arcLength - refLength), () => "100 < 10");
		this._assert_lt(Math.abs(curve2.arcLength - refLength), Math.abs(curve1.arcLength - refLength), () => "10 < 0");
	}

	private _curveBoundingBox() {
		// Check the analytical solution by comparing it to the really slow numerical one
		for (let i = 0; i < 10; i++) {
			Mathutil.randomseed(i);
			let curve = new CubicBezierCurve(
				new Vector(Mathutil.random(), Mathutil.random()),
				new Vector(Mathutil.random(), Mathutil.random()),
				new Vector(Mathutil.random(), Mathutil.random()),
				new Vector(Mathutil.random(), Mathutil.random())
			);

			let minX = Number.MAX_VALUE;
			let minY = Number.MAX_VALUE;
			let maxX = Number.MIN_VALUE;
			let maxY = Number.MIN_VALUE;
			for (let j = 0; j <= 1000; j++) {
				let pos = curve.getPosByT(j / 1000);
				if (pos.x < minX) minX = pos.x;
				if (pos.x > maxX) maxX = pos.x;
				if (pos.y < minY) minY = pos.y;
				if (pos.y > maxY) maxY = pos.y;
			}

			let bb = curve.getBoundingBox();
			this._assert_lt(bb[0].distanceToSq(new Vector(minX, minY)), 0.001, () => "bbMin");
			this._assert_lt(bb[1].distanceToSq(new Vector(maxX, maxY)), 0.001, () => "bbMax");
		}
	}

	private _curveLineIntersect() {
		let curve = CubicBezierCurve.newLinear(new Vector(-1, -0.5), new Vector(2, 1));
		let intersections = curve.intersectLineSegment(new Vector(1, 0), new Vector(3, 2));
		this._assert_eq(intersections.length, 1, () => "curveIntersectTouchEndPoint");
		this._assert_lt(intersections[0][0].distanceToSq(new Vector(2, 1)), 1e-4, () => "curveIntersectTouchEndPoint");
		intersections = curve.intersectLineSegment(new Vector(-1, -1), new Vector(1, 1));
		this._assert_eq(intersections.length, 1, () => "curveIntersectZeroPoint");
		this._assert_lt(intersections[0][0].distanceToSq(new Vector(0, 0)), 1e-4, () => "curveIntersect0");

		curve = new CubicBezierCurve(new Vector(0, -1), new Vector(0, 2), new Vector(1, -2), new Vector(1, 1));
		intersections = curve.intersectLineSegment(new Vector(0, 0), new Vector(1, 0));
		this._assert_eq(intersections.length, 3, () => "curveIntersectTriple");
		intersections = curve.intersectLineSegment(new Vector(0, 0), new Vector(0.75, 0));
		this._assert_eq(intersections.length, 2, () => "curveIntersectDouble");
		intersections = curve.intersectLineSegment(new Vector(0, 0), new Vector(0.05, 0));
		this._assert_eq(intersections.length, 0, () => "curveIntersectNone");
	}

	private _splineConstruction() {
		let p0 = new Vector(0, 0);
		let p1 = new Vector(1, 0);
		let p2 = new Vector(2, 0);
		let curve1 = CubicBezierCurve.newLinear(p0, p1);
		let curve2 = CubicBezierCurve.newLinear(p1, p2);
		let newSingle = new CubicBezierSpline(curve1);
		let newMulti = new CubicBezierSpline(curve1, curve2);
		let runtimeAdd = new CubicBezierSpline(curve1);
		runtimeAdd.addSegments(curve2);
		this._assert_eq(newSingle.getTotalLength(), curve1.arcLength, () => "newSingle.getTotalLength()");
		this._assert_eq(newMulti.getTotalLength(), curve1.arcLength + curve2.arcLength, () => "newMulti.getTotalLength()");
		this._assert_eq(runtimeAdd.getTotalLength(), curve1.arcLength + curve2.arcLength, () => "runtimeAdd.getTotalLength()");
	}

	private _splineOneSegmentLinear() {
		let startPoint = new Vector(0, 0);
		let endPoint = new Vector(2, 0);
		let curve = CubicBezierCurve.newLinear(startPoint, endPoint);
		let spline = new CubicBezierSpline(curve);
		this._assert_deep_eq(spline.getPosByDist(0), startPoint, () => "getPosByDist(0)");
		this._assert_lt(spline.getPosByDist(0.1).distanceToSq(new Vector(0.1, 0)), 1e-5, () => "getPosByDist(0.1)");
		this._assert_deep_eq(spline.getPosByDist(2), endPoint, () => "getPosByDist(2)");
		this._assert_lt(spline.getDirByDist(0).distanceToSq(new Vector(2, 0)), 1e-5, () => "getDirByDist(0)");
		this._assert_lt(spline.getDirByDist(0.1).distanceToSq(new Vector(2, 0)), 1e-5, () => "getDirByT(0.1)");
		this._assert_lt(spline.getDirByDist(2).distanceToSq(new Vector(2, 0)), 1e-5, () => "getDirByDist(2)");
		this._assert_lt(spline.getAccByDist(0).lengthSq(), 1e-5, () => "getAccByDist(0)");
		this._assert_lt(spline.getAccByDist(0.1).lengthSq(), 1e-5, () => "getAccByT(0.1)");
		this._assert_lt(spline.getAccByDist(2).lengthSq(), 1e-5, () => "getAccByDist(2)");
	}

	private _splineSamplingCorner() {
		let startPoint = new Vector(0, 0);
		let cornerPoint = new Vector(2, 0);
		let endPoint = new Vector(2, 2);
		let curve1 = CubicBezierCurve.newLinear(startPoint, cornerPoint);
		let curve2 = CubicBezierCurve.newLinear(cornerPoint, endPoint);
		let spline = new CubicBezierSpline(curve1, curve2);
		this._assert_deep_eq(spline.getPosByU(0), startPoint, () => "getPosByU(0)");
		this._assert_deep_eq(spline.getPosByU(0.1), new Vector(0.2, 0), () => "getPosByU(0.1)");
		this._assert_deep_eq(spline.getPosByU(1), cornerPoint, () => "getPosByU(1)");
		this._assert_deep_eq(spline.getPosByU(1.5), new Vector(2, 1), () => "getPosByU(1.5)");
		this._assert_deep_eq(spline.getPosByU(2), new Vector(2, 2), () => "getPosByU(2)");
		this._assert_deep_eq(spline.getDirByU(0), new Vector(2, 0), () => "getDirByU(0)");
		this._assert_deep_eq(spline.getDirByU(0.1), new Vector(2, 0), () => "getDirByU(0.1)");
		// At a join between two segments, the second segment should be sampled
		this._assert_deep_eq(spline.getDirByU(1), new Vector(0, 2), () => "getDirByU(1)");
	}

	private _splineDistCorner() {
		let startPoint = new Vector(0, 0);
		let cornerPoint = new Vector(2, 0);
		let endPoint = new Vector(2, 2);
		let curve1 = CubicBezierCurve.newLinear(startPoint, cornerPoint);
		let curve2 = CubicBezierCurve.newLinear(cornerPoint, endPoint);
		let spline = new CubicBezierSpline(curve1, curve2);
		this._assert_eq(spline.getTotalLength(), 4, () => "getTotalLength()");
		this._assert_eq(spline.distToU(0), 0, () => "distToU(0)");
		this._assert_eq(spline.distToU(0.2), 0.1, () => "distToU(0.2)");
		this._assert_eq(spline.distToU(2), 1, () => "distToU(2)");
		this._assert_eq(spline.distToU(3), 1.5, () => "distToU(3)");
		this._assert_eq(spline.distToU(4), 2, () => "distToU(4)");
		this._assert_eq(spline.uToDist(0), 0, () => "uToDist(0)");
		this._assert_eq(spline.uToDist(0.1), 0.2, () => "uToDist(0.1)");
		this._assert_eq(spline.uToDist(1), 2, () => "uToDist(1)");
		this._assert_eq(spline.uToDist(1.5), 3, () => "uToDist(1.5)");
		this._assert_eq(spline.uToDist(2), 4, () => "uToDist(2)");
	}

	private _splineLineIntersect() {
		// Testspline: /\
		let spline = new CubicBezierSpline(CubicBezierCurve.newLinear(new Vector(0, -1), new Vector(1, 1)), CubicBezierCurve.newLinear(new Vector(1, 1), new Vector(2, -1)));
		let intersections = spline.intersectLineSegment(new Vector(0, 0), new Vector(2, 0));
		this._assert_eq(intersections.length, 2, () => "splineIntersectTwo");
		this._assert_eq(intersections[1][1], 1.5, () => "splineIntersectTtoU");
		intersections = spline.intersectLineSegment(new Vector(0, 0), new Vector(1.2, 0));
		this._assert_eq(intersections.length, 1, () => "splineIntersectJustBoundingBox");
		intersections = spline.intersectLineSegment(new Vector(1, 0), new Vector(1, 2));
		this._assert_eq(intersections.length, 1, () => "splineIntersectDedup");
		intersections = spline.intersectLineSegment(new Vector(1, 0), new Vector(1, 1));
		this._assert_eq(intersections.length, 1, () => "splineIntersectDedupTouch");
	}

	private _splineContinuityCheck() {
		let noneSpline = new CubicBezierSpline(
			CubicBezierCurve.newLinear(new Vector(0, 0), new Vector(1, 0)),
			CubicBezierCurve.newLinear(new Vector(2, 0), new Vector(3, 0))
		);
		this._assert_eq(noneSpline.checkParamContinuity(), -1, () => "none.checkParam");
		this._assert_eq(noneSpline.checkGeomContinuity(), -1, () => "none.checkGeom");

		let c0g0Spline = new CubicBezierSpline(
			CubicBezierCurve.newLinear(new Vector(0, 0), new Vector(1, 0)),
			CubicBezierCurve.newLinear(new Vector(1, 0), new Vector(1, 1))
		);
		this._assert_eq(c0g0Spline.checkParamContinuity(), 0, () => "c0g0.checkParam");
		this._assert_eq(c0g0Spline.checkGeomContinuity(), 0, () => "c0g0.checkGeom");

		let c0g1Spline = new CubicBezierSpline(
			CubicBezierCurve.newLinear(new Vector(0, 0), new Vector(1, 0)),
			CubicBezierCurve.newLinear(new Vector(1, 0), new Vector(1.5, 0))
		);
		this._assert_eq(c0g1Spline.checkParamContinuity(), 0, () => "c0g1.checkParam");
		this._assert_eq(c0g1Spline.checkGeomContinuity(), 1, () => "c0g1.checkGeom");

		let c1g1Spline = new CubicBezierSpline(
			new CubicBezierCurve(new Vector(0, 0), new Vector(1, 0), new Vector(1, 0), new Vector(2, 0)),
			new CubicBezierCurve(new Vector(2, 0), new Vector(3, 0), new Vector(4, 1), new Vector(4, 2))
		);
		this._assert_eq(c1g1Spline.checkParamContinuity(), 1, () => "c1g1.checkParam");
		this._assert_eq(c1g1Spline.checkGeomContinuity(), 1, () => "c1g1.checkGeom");

		let c2Spline = new CubicBezierSpline(
			new CubicBezierCurve(new Vector(0, 0), new Vector(0, 1), new Vector(1, 2), new Vector(2, 2)),
			new CubicBezierCurve(new Vector(2, 2), new Vector(3, 2), new Vector(4, 1), new Vector(4, 0))
		);
		this._assert_eq(c2Spline.checkParamContinuity(), 2, () => "c2.checkParam");
	}

	private _splineExtension() {
		// extendG1
		for (let i = 0; i < 10; i++) {
			Mathutil.randomseed(i);
			let spline = new CubicBezierSpline(CubicBezierCurve.newLinear(new Vector(0, 0), new Vector(0.1, 0)));
			for (let j = 0; j < Mathutil.randomInt([2, 10]); j++) {
				Mathutil.randomseed(i * 10 + j);
				let endHandle = new Vector(Mathutil.random(), Mathutil.random());
				let endPoint = new Vector(Mathutil.random(), Mathutil.random());
				spline.extendG1(Mathutil.random(), endHandle, endPoint);
			}
			this._assert_ge(spline.checkGeomContinuity(), 1, () => "extendG1");
		}

		// extendC1
		for (let i = 0; i < 10; i++) {
			Mathutil.randomseed(i);
			let spline = new CubicBezierSpline(CubicBezierCurve.newLinear(new Vector(0, 0), new Vector(0.1, 0)));
			for (let j = 0; j < Mathutil.randomInt([2, 10]); j++) {
				Mathutil.randomseed(i * 10 + j);
				let endHandle = new Vector(Mathutil.random(), Mathutil.random());
				let endPoint = new Vector(Mathutil.random(), Mathutil.random());
				spline.extendC1(endHandle, endPoint);
			}
			this._assert_ge(spline.checkParamContinuity(), 1, () => "extendC1");
		}

		// extendInterpolating
		for (let i = 0; i < 10; i++) {
			Mathutil.randomseed(i);
			let spline = new CubicBezierSpline(CubicBezierCurve.newLinear(new Vector(0, 0), new Vector(0.1, 0)));
			for (let j = 0; j < Mathutil.randomInt([2, 10]); j++) {
				Mathutil.randomseed(i * 10 + j);
				let endPoint = new Vector(Mathutil.random(), Mathutil.random());
				let endSpeed = new Vector(Mathutil.random(), Mathutil.random());
				spline.extendInterpolating(endPoint, endSpeed);
			}
			this._assert_ge(spline.checkParamContinuity(), 1, () => "extendInterpolating");
		}

		// extendSmooth
		for (let i = 0; i < 10; i++) {
			let spline = new CubicBezierSpline(CubicBezierCurve.newLinear(new Vector(0, 0), new Vector(0.1, 0)));
			Mathutil.randomseed(i);
			let next = new Vector(Mathutil.random(), Mathutil.random());
			for (let j = 0; j < Mathutil.randomInt([2, 10]); j++) {
				Mathutil.randomseed(i * 10 + j);
				let newNext = new Vector(Mathutil.random(), Mathutil.random());
				spline.extendSmooth(next, newNext);
				next = newNext;
			}
			this._assert_ge(spline.checkParamContinuity(), 1, () => "extendSmooth");
		}

		// extendArc
		for (let i = 0; i < 10; i++) {
			Mathutil.randomseed(i);
			let spline = new CubicBezierSpline(CubicBezierCurve.newLinear(new Vector(0, 0), new Vector(0.1, 0)));
			for (let j = 0; j < Mathutil.randomInt([2, 10]); j++) {
				Mathutil.randomseed(i * 10 + j);
				let endPoint = new Vector(Mathutil.random(), Mathutil.random());
				let endDir = new Vector(Mathutil.random(), Mathutil.random());
				spline.extendInterpolating(endPoint, endDir);
			}
			this._assert_ge(spline.checkGeomContinuity(), 1, () => "extendArc");
		}
	}
}

export let testClass = BaseBezier;
