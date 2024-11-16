/**
 * @module bezier
 * Implementation of uniform cubic bezier splines
 */

/**************************************************************************
*   Copyright 2024 Maximilian Hausen                                      *
*   Robotics Erlangen e.V.                                                *
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

import * as Mathutil from "base/mathutil";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";

/**
 * Generic implementation of an immutable cubic bezier curve, as described in https://youtu.be/aVwxzDHniEw.
 */
export class CubicBezierCurve {
	public readonly p0: Position; // start
	public readonly p1: Position; // startHandle
	public readonly p2: Position; // endHandle
	public readonly p3: Position; // end

	// Coefficient caches
	private readonly _t0: Vector;
	private readonly _t1: Vector;
	private readonly _t2: Vector;
	private readonly _t3: Vector;

	private readonly _t0d: Vector;
	private readonly _t1d: Vector;
	private readonly _t2d: Vector;

	private readonly _t0d2: Vector;
	private readonly _t1d2: Vector;

	// Distance caches
	public readonly arcLength: number;
	private readonly _distanceLUTPoints: Position[];
	private readonly _distanceLUT: number[];

	// Intersection caches (lazily initialized)
	private _boundingBox: [Position, Position] | undefined;

	// ==== Constructors ====

	/**
	 * Creates a new bezier curve that is a line between two points. In this special case,
	 * t is proportional to the traveled distance, so distance conversions will be fully accurate.
	 */
	public static newLinear(start: Position, end: Position): CubicBezierCurve {
		// This uses a special case of bezier curves:
		// When the control points are equally spaced on a line, t is linear, so no lookup table is needed
		let diff = end - start;
		return new CubicBezierCurve(start, start + ((1 / 3) * diff), end - ((1 / 3) * diff), end, 0);
	}

	/**
	 * Generalized version of {@link newQuarterCircle}.
	 * With the right parameters, this will generate a quarter circle approximation,
	 * but it will still connect the two points in a sensible way otherwise.
	 * @param startDir Movement direction at the start point
	 * @param endDir Movement direction at the end point
	 */
	public static newArc(start: Position, startDir: Vector, end: Position, endDir: Vector, precision?: number): CubicBezierCurve {
		let diff = end - start;
		let radius = diff.length() / Math.SQRT2;

		// Magic value for quarter circle approximation taken from https://spencermortensen.com/articles/bezier-circle
		return new CubicBezierCurve(
			start,
			start + startDir.withLength(radius * 0.5519150244935105707435627),
			end - endDir.withLength(radius * 0.5519150244935105707435627),
			end,
			precision
		);
	}

	/**
	 * Creates a new bezier curve that is an approximated quarter circle between two points.
	 * @param xFirst Whether to start moving along the x axis or the y axis
	 */
	public static newQuarterCircle(start: Position, end: Position, clockwise: boolean, precision?: number): CubicBezierCurve {
		let diagonal = end - start;
		let startDir = diagonal.rotated(clockwise ? Math.PI / 4 : Math.PI / -4);
		let endDir = diagonal.rotated(clockwise ? Math.PI / -4 : Math.PI / 4);
		return this.newArc(start, startDir, end, endDir, precision);
	}

	/**
	 * Creates a new arbitrary bezier curve and calculates the LUT used for distance-based calculations and visualizations
	 * @param precision The amount of points to build the LUT from.
	 * Besides distance-based point sampling, this value also affects the accuracy of the reported total length.
	 * Must be an integer >= 0
	 */
	public constructor(start: Position, startHandle: Position, endHandle: Position, end: Position, precision?: number) {
		if (precision === undefined) {
			precision = 20;
		} else if (precision < 0) {
			throw new Error(`Bezier curve precision must be >= 0 (value was ${precision})`);
		}

		this.p0 = start;
		this.p1 = startHandle;
		this.p2 = endHandle;
		this.p3 = end;

		// Pre-calculate the coefficients for sampling

		this._t0 = this.p0;
		this._t1 = (-3 * this.p0) + (3 * this.p1);
		this._t2 = (3 * this.p0) - (6 * this.p1) + (3 * this.p2);
		this._t3 = -this.p0 + (3 * this.p1) - (3 * this.p2) + this.p3;

		this._t0d = this._t1; // (-3 * this.p0) + (3 * this.p1)
		this._t1d = (6 * this.p0) - (12 * this.p1) + (6 * this.p2);
		this._t2d = (-3 * this.p0) + (9 * this.p1) - (9 * this.p2) + (3 * this.p3);

		this._t0d2 = this._t1d; // (6 * this.p0) - (12 * this.p1) + (6 * this.p2)
		this._t1d2 = (-6 * this.p0) + (18 * this.p1) - (18 * this.p2) + (6 * this.p3);

		// Generate distance LUT (Start- and endpoints are also stored to avoid special cases during lookup)

		this._distanceLUTPoints = this._generateSamplePoints(precision + 2);
		this._distanceLUT = new Array<number>(this._distanceLUTPoints.length);

		this._distanceLUT[0] = 0;
		for (let i = 1; i < this._distanceLUT.length; i++) {
			let lastPoint = this._distanceLUTPoints[i - 1];
			let newPoint = this._distanceLUTPoints[i];
			this._distanceLUT[i] = this._distanceLUT[i - 1] + lastPoint.distanceTo(newPoint);
		}

		this.arcLength = this._distanceLUT[this._distanceLUT.length - 1];
	}

	// ==== Private utility methods ====

	/**
	 * Generates a number of equally spaced points along the curve
	 * @param amount The amount of points to generate. Must be >=2 because the end points will always be included.
	 */
	private _generateSamplePoints(amount: number): Position[] {
		if (amount < 2) {
			throw new Error(`The minimal amount of allowed sample points on a bezier curve is 2 (requested ${amount})`);
		}

		let points = new Array<Position>(amount);

		for (let i = 0; i < amount; i++) {
			let t = i / (amount - 1);
			points[i] = this.getPosByT(t);
		}

		return points;
	}

	// ==== Sampling methods ====

	/**
	 * Calculates the exact point on the curve at a certain t value.
	 * The t value might not change linearly along the curve.
	 * If you want to traverse the curve at a constant speed, use {@link getPosByDist} instead.
	 *
	 * May also be used with values outside of the usual [0,1] range.
	 */
	public getPosByT(t: number): Position {
		// Polynomial form with cached coefficient
		// this._t0 + (t * this._t1) + ((t ** 2) * this._t2) + ((t ** 3) * this._t3)
		return this._t0 + t * (this._t1 + t * (this._t2 + t * this._t3));
	}

	/**
	 * Calculates the approximate point on the curve at a certain distance.
	 * The returned position will always be a point on the curve,
	 * but the accuracy of the distance measurement will depend on the "precision" value set by the constructor.
	 *
	 * Distance values will be clamped to the range [0,length].
	 * @param distance Distance from the start of the curve (in meters)
	 */
	public getPosByDist(distance: number): Position {
		return this.getPosByT(this.distToT(distance));
	}

	/**
	 * First derivative of {@link getPosByT}.
	 * Calculates the exact speed/direction of the curve at a certain t value.
	 *
	 * The t value might not increase linearly along the curve.
	 * If you want to traverse the curve at a constant speed, use {@link getDirByDist} instead.
	 *
	 * May also be used with values outside of the usual [0,1] range.
	 */
	public getDirByT(t: number): Speed {
		// First derivative of the polynomial form with cached coefficient
		// this._t0d + (t * this._t1d) + ((t ** 2) * this._t2d)
		return this._t0d + t * (this._t1d + t * this._t2d);
	}

	/**
	 * First derivative of {@link getPosByDist}.
	 * Calculates the approximate speed/direction of the curve at a certain distance.
	 * The accuracy of the distance measurement will depend on the "precision" value set by the constructor.
	 *
	 * The returned vector is not normalized, but its length is probably irrelevant for you
	 * (it depends on the t value, which has little connection to the distance)
	 *
	 * Distance values will be clamped to the range [0,length].
	 * @param distance Distance from the start of the curve (in meters)
	 */
	public getDirByDist(distance: number): Position {
		return this.getDirByT(this.distToT(distance));
	}

	/**
	 * Second derivative of {@link getPosByT}.
	 * Calculates the exact acceleration of the curve at a certain t value.
	 *
	 * The t value might not increase linearly along the curve.
	 * If you want to traverse the curve at a constant speed, use {@link getAccByDist} instead.
	 *
	 * May also be used with values outside of the usual [0,1] range.
	 */
	public getAccByT(t: number): Speed {
		// Second derivative of the polynomial form with cached coefficient
		return this._t0d2 + t * this._t1d2;
	}

	/**
	 * Second derivative of {@link getPosByDist}.
	 * Calculates the approximate acceleration of the curve at a certain distance.
	 * The accuracy of the distance measurement will depend on the "precision" value set by the constructor.
	 *
	 * This is only useful in very rare circumstances.
	 * The result heavily depends the t value, which has little connection to the distance.
	 *
	 * Distance values will be clamped to the range [0,length].
	 * @param distance Distance from the start of the curve (in meters)
	 */
	public getAccByDist(distance: number): Position {
		return this.getAccByT(this.distToT(distance));
	}

	/**
	 * Draws the amun debug visualization
	 * @param precision If set, new sample points of the specified precision will be generated
	 * instead of using the ones from the LUT. THIS IS REALLY SLOW AND WILL NOT BE CACHED
	 */
	public drawVisualization(name: string, color: vis.Color = vis.colors.black, showControlPoints: boolean = false, showBoundingBox: boolean = false, precision?: number) {
		let points = this._distanceLUTPoints;
		if (precision !== undefined) {
			points = this._generateSamplePoints(precision + 2);
		}

		if (showControlPoints) {
			vis.addCircle(name, this.p0, 0.05, color, true);
			vis.addCircle(name, this.p1, 0.05, color, false);
			vis.addCircle(name, this.p2, 0.05, color, false);
			vis.addCircle(name, this.p3, 0.05, color, true);

			vis.addPath(name, [this.p0, this.p1], color, false, undefined, 0.005);
			vis.addPath(name, [this.p2, this.p3], color, false, undefined, 0.005);
		}
		if (showBoundingBox) {
			let bb = this.getBoundingBox();
			vis.addAxisAlignedRectangle(name, bb[0], bb[1], color, false);

			vis.addPath(name, [this.p0, this.p1], color, false, undefined, 0.005);
			vis.addPath(name, [this.p2, this.p3], color, false, undefined, 0.005);
		}

		vis.addPath(name, points, color, false, undefined, 0.015);
	}

	// ==== Conversion methods ====

	/**
	 * Approximate conversion from a distance along the path in meters to the t value of the curve at that point.
	 *
	 * Doing this analytically is literally impossible, so this is implemented with a LUT.
	 * This means that the accuracy of this conversion is dependent on the precision value set by the constructor,
	 * but the operation is still perfectly reversible.
	 *
	 * Distance values will be clamped to the range [0,length].
	 * @param distance Distance from the start of the curve (in meters)
	 * @returns The approximate t value, from 0 to 1
	 */
	public distToT(distance: number): number {
		if (distance <= 0) {
			return 0;
		}
		if (distance >= this.arcLength) {
			return 1;
		}

		// Find closest points in the LUT (binary search)
		let smallerIndex = 0;
		let largerIndex = this._distanceLUT.length - 1;
		while (smallerIndex !== largerIndex - 1) {
			let mid = Math.trunc((smallerIndex + largerIndex) / 2);
			if (this._distanceLUT[mid] > distance) {
				largerIndex = mid;
			} else {
				smallerIndex = mid;
			}
		}

		let pointRatio = (distance - this._distanceLUT[smallerIndex]) / (this._distanceLUT[largerIndex] - this._distanceLUT[smallerIndex]);

		return (smallerIndex + pointRatio) / (this._distanceLUT.length - 1);
	}

	/**
	 * Inverse of {@link distToT}
	 */
	public tToDist(t: number): number {
		if (t <= 0) {
			return 0;
		}
		if (t >= 1) {
			return this.arcLength;
		}

		let smallerIndex = Math.floor((this._distanceLUT.length - 1) * t);
		let largerIndex = smallerIndex + 1;

		let smallerT = (smallerIndex / (this._distanceLUT.length - 1));
		let largerT = (largerIndex / (this._distanceLUT.length - 1));

		let pointRatio = (t - smallerT) / (largerT - smallerT);

		return this._distanceLUT[smallerIndex] + (pointRatio * (this._distanceLUT[largerIndex] - this._distanceLUT[smallerIndex]));
	}

	// ==== Intersection methods ====

	/**
	 * Gets the tight axis aligned bounding box of the curve,
	 * meaning the smallest possible rectangle that contains the whole curve.
	 * This calculation is not done ahead of time in the constructor because it is not commonly used.
	 * It is cached after the first call though, so repeated calls are no problem.
	 * @returns The minimum (bottom left) and maximum (top right) corner of the box
	 */
	public getBoundingBox(): [Position, Position] {
		if (this._boundingBox === undefined) {
			let points = [this.p0, this.p3];
			let xSolutions = Mathutil.solveSq(this._t2d.x, this._t1d.x, this._t0d.x);
			for (const t of xSolutions) {
				if (t < 0 || t > 1) continue;
				points.push(this.getPosByT(t));
			}
			let ySolutions = Mathutil.solveSq(this._t2d.y, this._t1d.y, this._t0d.y);
			for (const t of ySolutions) {
				if (t < 0 || t > 1) continue;
				points.push(this.getPosByT(t));
			}
			this._boundingBox = [
				new Vector(Math.min(...points.map((v) => v.x)), Math.min(...points.map((v) => v.y))),
				new Vector(Math.max(...points.map((v) => v.x)), Math.max(...points.map((v) => v.y)))
			];
		}
		return this._boundingBox!;
	}

	/**
	 * Finds all intersections of this curve and the line from lineStart to lineEnd.
	 * @param lineStart Start point of the line segment
	 * @param lineEnd End point of the line segment
	 * @returns All intersections (up to three), each with a position (0), the t value of the curve (1) and the t value of the line segment (2)
	 */
	public intersectLineSegment(lineStart: Position, lineEnd: Position): [Position, number, number][] {
		const vx = lineEnd.y - lineStart.y;
		const vy = lineStart.x - lineEnd.x;

		const d = lineStart.x * vx + lineStart.y * vy;

		const roots = Mathutil.solveCub(
			vx * this._t3.x + vy * this._t3.y,
			vx * this._t2.x + vy * this._t2.y,
			vx * this._t1.x + vy * this._t1.y,
			vx * this._t0.x + vy * this._t0.y - d
		);

		let results: [Position, number, number][] = [];
		for (let curveT of roots) {
			if (curveT < 0 || curveT > 1) continue;
			let point = this.getPosByT(curveT);
			let lineT = lineStart.distanceTo(point) / lineStart.distanceTo(lineEnd);
			if (lineT < 0 || lineT > 1) continue;
			if (results.some((value) => value[2] === lineT)) continue;
			results.push([point, curveT, lineT]);
		}
		return results;
	}
};

/**
 * Generic implementation of an uniform cubic bezier spline, as described in https://youtu.be/jvPPXbo87ds.
 * The path can be extended, but any existing segments are immutable.
 */
export class CubicBezierSpline {
	private readonly _segments: CubicBezierCurve[];
	private _length: number = 0;

	// Only used for extendSmooth visualization
	private _nextPoint: Position | undefined;

	public constructor(...segments: [CubicBezierCurve, ...CubicBezierCurve[]]) {
		this._segments = segments;
		for (let i = 0; i < segments.length; i++) {
			this._length += segments[i].arcLength;
		}
	}

	// ==== Getters ====

	public getStartPos(): Position {
		return this._segments[0].p0;
	}

	public getEndPos(): Position {
		return this._segments[this._segments.length - 1].p3;
	}

	public getSegmentCount(): number {
		return this._segments.length;
	}

	public getTotalLength(): number {
		return this._length;
	}

	// ==== Sampling methods ====

	/**
	 * Calculates the exact point on the spline at a certain u value.
	 * The u value might not increase linearly along the spline.
	 * If you want to traverse the spline at a constant speed, use {@link getPosByDist} instead.
	 *
	 * May also be used with values outside of the usual [0,segmentCount) range.
	 */
	public getPosByU(u: number): Position {
		let [segmentIndex, t] = this._uToSegmentT(u);
		return this._segments[segmentIndex].getPosByT(t);
	}

	/**
	 * Calculates the approximate point on the spline at a certain distance.
	 * The returned position will always be a point on the spline,
	 * but the accuracy of the distance measurement will depend on the precision of the individual curves.
	 *
	 * Distance values will be clamped to the range [0,length].
	 * @param distance Distance from the start of the spline (in meters)
	 */
	public getPosByDist(distance: number): Position {
		return this.getPosByU(this.distToU(distance));
	}

	/**
	 * First derivative of {@link getPosByU}.
	 * Calculates the exact speed/direction of the spline at a certain u value.
	 *
	 * The u value might not increase linearly along the spline.
	 * If you want to traverse the spline at a constant speed, use {@link getDirByDist} instead.
	 *
	 * May also be used with values outside of the usual [0,segmentCount) range.
	 */
	public getDirByU(u: number): Speed {
		let [segmentIndex, t] = this._uToSegmentT(u);
		return this._segments[segmentIndex].getDirByT(t);
	}

	/**
	 * First derivative of {@link getPosByDist}.
	 * Calculates the approximate speed/direction of the spline at a certain distance.
	 * The accuracy of the distance measurement will depend on the precision of the individual curves.
	 *
	 * The returned vector is not normalized, but its length is probably irrelevant for you
	 * (it depends on the u value, which has little connection to the distance)
	 *
	 * Distance values will be clamped to the range [0,length].
	 * @param distance Distance from the start of the spline (in meters)
	 */
	public getDirByDist(distance: number): Position {
		return this.getDirByU(this.distToU(distance));
	}

	/**
	 * Second derivative of {@link getPosByU}.
	 * Calculates the exact acceleration of the spline at a certain u value.
	 *
	 * The u value might not increase linearly along the spline.
	 * If you want to traverse the spline at a constant speed, use {@link getAccByDist} instead.
	 *
	 * May also be used with values outside of the usual [0,segmentCount) range.
	 */
	public getAccByU(u: number): Speed {
		let [segmentIndex, t] = this._uToSegmentT(u);
		return this._segments[segmentIndex].getAccByT(t);
	}

	/**
	 * Second derivative of {@link getPosByDist}.
	 * Calculates the approximate acceleration of the spline at a certain distance.
	 * The accuracy of the distance measurement will depend on the precision of the individual curves.
	 *
	 * This is only useful in very rare circumstances.
	 * The result heavily depends the u value, which has little connection to the distance.
	 *
	 * Distance values will be clamped to the range [0,length].
	 * @param distance Distance from the start of the spline (in meters)
	 */
	public getAccByDist(distance: number): Position {
		return this.getAccByU(this.distToU(distance));
	}

	public drawVisualization(name: string, color: vis.Color = vis.colors.black, showControlPoints: boolean = false, showBoundingBoxes: boolean = false, precision?: number) {
		for (const curve of this._segments) {
			curve.drawVisualization(name, color, showControlPoints, showBoundingBoxes, precision);
		}

		if (this._nextPoint !== undefined) {
			vis.addCircle(name, this._nextPoint, 0.05, vis.colors.red, true);
		}
	}

	// ==== Conversion methods ====

	private _uToSegmentT(u: number): [number, number] {
		let segmentIndex = Mathutil.bound(0, Math.trunc(u), this._segments.length - 1);
		let t = u - segmentIndex;
		return [segmentIndex, t];
	}

	/**
	 * Approximate conversion from a distance along the spline in meters to the u value of the spline at that point.
	 *
	 * Doing this analytically is literally impossible, so this is implemented with a LUT.
	 * This means that the accuracy of this conversion is dependent on the precision of the individual curves,
	 * but the operation is still perfectly reversible.
	 *
	 * Distance values will be clamped to the range [0,length].
	 * @param distance Distance from the start of the spline (in meters)
	 * @returns The approximate u value, from 0 to <segmentCount>
	 */
	public distToU(distance: number): number {
		if (distance <= 0) {
			return 0;
		}
		if (distance >= this.getTotalLength()) {
			return this._segments.length;
		}

		// Find the containing segment
		let segmentIndex = 0;
		let prevLength = 0;
		for (let i = 0; i < this._segments.length; i++) {
			let segment = this._segments[i];
			if (prevLength + segment.arcLength >= distance) {
				segmentIndex = i;
				break;
			}
			prevLength += segment.arcLength;
		}

		return segmentIndex + this._segments[segmentIndex].distToT(distance - prevLength);
	}

	/**
	 * Inverse of {@link distToU}
	 */
	public uToDist(u: number): number {
		if (u <= 0) {
			return 0;
		}
		if (u >= this._segments.length) {
			return this.getTotalLength();
		}

		let [segmentIndex, t] = this._uToSegmentT(u);

		// Add up the length of all previous segments
		let prevLength = 0;
		for (let i = 0; i < segmentIndex; i++) {
			prevLength += this._segments[i].arcLength;
		}

		return prevLength + this._segments[segmentIndex].tToDist(t);
	}

	// ==== Extension methods ====

	public addSegments(...segments: CubicBezierCurve[]) {
		this._segments.push(...segments);
		for (const curve of segments) {
			this._length += curve.arcLength;
		}
		this._nextPoint = undefined;
	}

	/**
	 * Extends the spline with a new segment that is guaranteed to be G1 continous with the last one (Meaning the handles are aligned around the join).
	 * @param startHandleLength Distance of the start handle from the join
	 * @param endHandle Absolute position of the end handle
	 * @param end The absolute position of the next join. This will be the new end of the spline.
	 */
	public extendG1(startHandleLength: number, endHandle: Position, end: Position, precision?: number) {
		if (this._segments.length < 1) {
			throw new Error("The first segment in a CubicBezierSpline must be created manually (Tried to extend with G1 continuity)");
		}
		let last = this._segments[this._segments.length - 1];
		this.addSegments(new CubicBezierCurve(last.p3, last.p3 + (last.p3 - last.p2).withLength(startHandleLength), endHandle, end, precision));
	}

	/**
	 * Extends the spline with a new segment that is guaranteed to be C1 continous with the last one (Meaning the handles are mirrored around the join).
	 *
	 * This takes away a lot of control over the shape of the new segment.
	 * If you just want to create a smooth path, you should use {@link extendInterpolating} or {@link extendSmooth} instead.
	 * @param endHandle Absolute position of the end handle
	 * @param end The absolute position of the next join. This will be the new end of the spline.
	 */
	public extendC1(endHandle: Position, end: Position, precision?: number) {
		if (this._segments.length < 1) {
			throw new Error("The first segment in a CubicBezierSpline must be created manually (Tried to extend with C1 continuity)");
		}
		let last = this._segments[this._segments.length - 1];
		this.addSegments(new CubicBezierCurve(last.p3, last.p3 + (last.p3 - last.p2), endHandle, end, precision));
	}

	/**
	 * Extends the spline with a new segment that is calculated like a hermite spline.
	 * The new segment will smoothly connect to the current one with C1 (and G1) continuity.
	 * @param end The absolute position of the next join. This will be the new end of the spline.
	 * @param endSpeed The speed at the end point.
	 */
	public extendInterpolating(end: Position, endSpeed: Speed, precision?: number) {
		if (this._segments.length < 1) {
			throw new Error("The first segment in a CubicBezierSpline must be created manually (Tried to extend with interpolation). If you want a full hermite spline, you can start with a spline containing a bezier curve with all points in one.");
		}
		let last = this._segments[this._segments.length - 1];
		this.addSegments(new CubicBezierCurve(last.p3, last.p3 + (last.p3 - last.p2), end - (endSpeed / 3), end, precision));
	}

	/**
	 * Extends the spline with a new segment that is calculated like a catmull-rom spline.
	 * The new segment will smoothly connect to the current one with C1 (and G1) continuity.
	 * @param end The absolute position of the next join. This will be the new end of the spline.
	 * @param nextEnd A predicted "next step" for the spline, used to calculate a smooth curve for the new segment.
	 */
	public extendSmooth(end: Position, nextEnd: Position, precision?: number) {
		if (this._segments.length < 1) {
			throw new Error("The first segment in a CubicBezierSpline must be created manually (Tried to extend smoothly). If you want a full catmull-rom spline, you can start with a spline containing a bezier curve with all points in one.");
		}

		let last = this._segments[this._segments.length - 1];
		this.extendInterpolating(end, 0.5 * (nextEnd - last.p3), precision);
		this._nextPoint = nextEnd; // For visualization
	}

	/**
	 * Extends the spline using {@link CubicBezierCurve.newArc}.
	 * The new segment will connect to the current one with G1 continuity.
	 * @param end The absolute position of the next join. This will be the new end of the spline.
	 * @param endDir The movement direction at the end point.
	 */
	public extendArc(end: Position, endDir: Vector, precision?: number) {
		if (this._segments.length < 1) {
			throw new Error("The first segment in a CubicBezierSpline must be created manually (Tried to extend with an arc)");
		}
		let last = this._segments[this._segments.length - 1];
		this.addSegments(CubicBezierCurve.newArc(last.p3, last.getDirByT(1), end, endDir, precision));
	}

	// ==== Intersection methods ====

	/**
	 * Finds all intersections of this spline and the line from lineStart to lineEnd.
	 * @param lineStart Start point of the line segment
	 * @param lineEnd End point of the line segment
	 * @returns All intersections, each with a position (0), the u value of the spline (1) and the t value of the line segment (2)
	 */
	public intersectLineSegment(lineStart: Position, lineEnd: Position): [Position, number, number][] {
		let intersections: [Position, number, number][] = [];
		for (let i = 0; i < this._segments.length; i++) {
			const curve = this._segments[i];
			// Doing a bounding box check here brings no relevant performance improvements, even for larger splines

			// Precise intersection test (Skip duplicates that can occur at joins)
			for (const intersection of curve.intersectLineSegment(lineStart, lineEnd)) {
				if (!intersections.some((value) => value[2] === intersection[2])) {
					intersections.push([intersection[0], intersection[1] + i, intersection[2]]);
				}
			}
		}
		return intersections;
	}

	// ==== Cool math stuff ====

	/**
	 * Finds the highest degree of parametric continuity of this spline (Up to C2).
	 * If you are just moving along the spline by distance, parametric continuity is irrelevant for you
	 * and you probably want to use {@link checkGeomContinuity} instead.
	 * @returns The highest degree of parametric continuity this spline fulfills, or -1 if it is not continuous
	 */
	public checkParamContinuity(): number {
		let result: number = 2;

		for (let i = 0; i < this._segments.length - 1; i++) {
			let prev = this._segments[i];
			let next = this._segments[i + 1];

			if (!prev.p3.equals(next.p0)) {
				// Ends do not meet -> Not continuous
				return -1;
			} else if (result > 0 && prev.getDirByT(1).distanceToSq(next.getDirByT(0)) > 0.0001) {
				// First derivative does not match at join -> No C1 continuity (velocity)
				result = 0;
			} else if (result > 1 && prev.getAccByT(1).distanceToSq(next.getAccByT(0)) > 0.0001) {
				// Second derivative does not match at join -> No C2 continuity (acceleration)
				result = 1;
			}
		}

		return result;
	}

	/**
	 * Finds the highest degree of geometric continuity of this spline (Up to G1)
	 * Geometric continuity is basically the same as parametric continuity, but only using normalized vectors.
	 *
	 * WARNING: The individual curves are not checked for regularity (first derivative != 0).
	 * Sudden directional changes at these points can make the curve C∞G0, but this method will still treat them as G∞.
	 * @returns The highest degree of geometric continuity this spline fulfills, or -1 if it is not continuous
	 */
	public checkGeomContinuity(): number {
		let result: number = 1;

		for (let i = 0; i < this._segments.length - 1; i++) {
			let prev = this._segments[i];
			let next = this._segments[i + 1];

			if (!prev.p3.equals(next.p0)) {
				// Ends do not meet -> Not continuous
				return -1;
			} else if (result > 0 && Math.abs(prev.getDirByT(1).angle() - next.getDirByT(0).angle()) > 0.0001) {
				// First derivative angle does not match at join -> No G1 continuity (direction)
				result = 0;
			}
			// G2 continuity is much more complicated (and less useful in this context) than G1 (or even C2) continuity, so it is not implemented here
		}

		return result;
	}
};
