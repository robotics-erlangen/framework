import * as ListUtil from "base/listutil";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";

const G = World.Geometry;


export class Race extends Move {
	/***********************************************************************
	 * If you just want to quickly use this move, search for "Presets:"    *
	 * in this file for a list of common situations and turn on            *
	 * the "te/m/race: positions" visualization, else read the next        *
	 * paragraph below for a more thorough explanation.                    *
	 ***********************************************************************/

	/***********************************************************************
	 * This move works by having a list of positions for each robot        *
	 * through which it cycles. That's the _POSITIONS array. For each list *
	 * in there, this move will have one robot cycling between those       *
	 * positions.                                                          *
	 *                                                                     *
	 * If you just want N robots driving up and down in a predefined       *
	 * rectangle, you can use the _nRobots function, see its               *
	 * documentation.                                                      *
	 ***********************************************************************/

	/***********************************************************************
	 * _CORNERS defines some common points to use for this move. Namely,   *
	 * it defines the corners of the field, as well as the corners of each *
	 * field half, inset by PADDING to avoid having the robots drive on    *
	 * the field lines and too close to the boundary of the field.         *
	 *                                                                     *
	 * [FO][MG][LR] = { friendly, opponent } { mid, goal } { left, right } *
	 *                                                                     *
	 *               OPPONENT HALF     FRIENDLY HALF                       *
	 *                +-------------+-------------+                        *
	 *                |             |             |                        *
	 *                |  OGR   OMR  |  FMR   FGR  |    RIGHT               *
	 *              +-+             |             +-+                      *
	 *              | |             |             | |                      *
	 *              +-+             |             +-+                      *
	 *                |  OGL   OML  |  FML   FGL  |    LEFT                *
	 *                |             |             |                        *
	 *                +-------------+-------------+                        *
	 *                                                                     *
	 ***********************************************************************/
	private static readonly _PADDING = 0.5;
	private static readonly _CORNERS = {
		FGL: new Vector(-G.FieldWidthHalf + Race._PADDING, -G.FieldHeightHalf + Race._PADDING),
		FGR: new Vector(+G.FieldWidthHalf - Race._PADDING, -G.FieldHeightHalf + Race._PADDING),
		FML: new Vector(-G.FieldWidthHalf + Race._PADDING, -Race._PADDING),
		FMR: new Vector(+G.FieldWidthHalf - Race._PADDING, -Race._PADDING),
		OGL: new Vector(-G.FieldWidthHalf + Race._PADDING, +G.FieldHeightHalf - Race._PADDING),
		OGR: new Vector(+G.FieldWidthHalf - Race._PADDING, +G.FieldHeightHalf - Race._PADDING),
		OML: new Vector(-G.FieldWidthHalf + Race._PADDING, +Race._PADDING),
		OMR: new Vector(+G.FieldWidthHalf - Race._PADDING, +Race._PADDING),
	};

	/***********************************************************************
	 * Presets:                                                            *
	 * (a) have one robot drive back and forth between two positions       *
	 * (b) have 4 robots drive back and forth in the friendly half         *
	 * (c) have 4 robots drive back and forth in the opponent half         *
	 * (d) have 4 robots drive back and forth on the full field            *
	 ***********************************************************************/
	/* (a) */ private static readonly _POSITIONS: Vector[][] = [[new Vector(-2, -2), new Vector(2, -2)]];
	/* (b) */ // private static readonly _POSITIONS: Vector[][] = Race._nRobots(4, Race._CORNERS.FML, Race._CORNERS.FGR);
	/* (c) */ // private static readonly _POSITIONS: Vector[][] = Race._nRobots(4, Race._CORNERS.OML, Race._CORNERS.OGR);
	/* (d) */ // private static readonly _POSITIONS: Vector[][] = Race._nRobots(4, Race._CORNERS.FGL, Race._CORNERS.OGR);

	/***********************************************************************
	 * If you want the robots to wait for each other and only start        *
	 * driving to the next position after everyone arrived at the          *
	 * current target, you can set SYNC to true (that's the default).      *
	 * If it is set to false, every robot cycles through its               *
	 * positions independently of the others.                              *
	 ***********************************************************************/
	private static readonly _SYNC: boolean = true;

	/***********************************************************************
	 * To control how close to its target each robot has to drive and how  *
	 * slow it needs to be, you can use these parameters                   *
	 ***********************************************************************/
	private static readonly _POS_TOLERANCE: number = 0.2;
	private static readonly _SPEED_TOLERANCE: number = 0.05;

	private _positions: Vector[][];

	private static readonly _N: number = Race._POSITIONS.length;
	private static readonly _COLORS: vis.Color[] = [
		vis.colors.red,
		vis.colors.blue,
		vis.colors.green,
		vis.colors.yellow,
		vis.colors.darkPurple,
		vis.colors.cyan,
		vis.colors.skyBlue,
		vis.colors.magenta,
		vis.colors.gold,
		vis.colors.pink,
	];

	public static readonly MIN_ROBOTS = 1;
	public static readonly MAX_ROBOTS = Race._N;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	private _posIndices: number[] = Race._POSITIONS.map((_) => 0);

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);

		// random offset for carpet wear leveling
		const randomOffset = new Vector(MathUtil.random(), MathUtil.random()) * Race._PADDING * 0.4;
		this._positions = Race._POSITIONS.map((ps) => ps.map((p) => p + randomOffset));
	}

	public static canStart() {
		return true;
	}

	/**
	 * Generate position pairs in a rectangle
	 *
	 * This function creates n line segments in the passed rectangle, parallel
	 * to the axis specified in driveDirection or, if driveDirection is undefined,
	 * parallel to the shorter side of the rectangle.
	 *
	 * @param n - number of pairs to generate
	 * @param topLeft - top left corner of the rectangle
	 * @param bottomRight - bottom right corner of the rectangle
	 * @param driveDirection - alignment of the lines, if left out, the alignment that maximizes the space between the lines
	 * @returns a list of pairs of points representing evenly spaced, parallel lines in the specified rectangle
	 */
	private static _nRobots(n: number, topLeft: Vector, bottomRight: Vector, driveDirection?: "x" | "y"): [Vector, Vector][] {
		const x0 = topLeft.x;
		const y0 = topLeft.y;
		const x1 = bottomRight.x;
		const y1 = bottomRight.y;

		driveDirection ??= (Math.abs(x1 - x0) > Math.abs(y1 - y0)) ? "y" : "x";
		if (driveDirection === "x") {
			return ListUtil.linspace(n, y0, y1).map((y) => [new Vector(x0, y), new Vector(x1, y)]);
		} else {
			return ListUtil.linspace(n, x0, x1).map((x) => [new Vector(x, y0), new Vector(x, y1)]);
		}
	}

	public canContinue(): boolean {
		return true;
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments: Map<FriendlyRobot, Assignment> = new Map<FriendlyRobot, Assignment>();

		const posReached = this._robots.map((r, i) => {
			const positions = this._positions[i];
			const pos = positions[this._posIndices[i]];
			return r.pos.distanceToSq(pos) < Race._POS_TOLERANCE * Race._POS_TOLERANCE
				&& r.speed.lengthSq() < Race._SPEED_TOLERANCE * Race._SPEED_TOLERANCE;
		});

		const synchronized = posReached.every((x) => x) || !Race._SYNC;
		for (let i = 0; i < Math.min(this._robots.length, this._positions.length); i++) {
			const r = this._robots[i];
			const positions = this._positions[i];
			const pos = positions[this._posIndices[i]];

			vis.addPath("te/m/race: positions", [r.pos, pos], Race._COLORS[i]);
			for (const p of positions) {
				const radius = r.radius + (p === pos ? 0.05 : 0);
				vis.addCircle("te/m/race: positions", p, radius, Race._COLORS[i]);
			}

			if (posReached[i] && synchronized) {
				this._posIndices[i] += 1;
				this._posIndices[i] %= positions.length;
			}

			taskAssignments[r] = Assignment.create({
				class: MoveToPos,
				params: [{ pos: positions[this._posIndices[i]], ignoreDefaultObstacles: true, dir: 0 }],
				restart: posReached[i] && synchronized,
			});
		}

		return { assignments: taskAssignments };
	}
}
