import * as ListUtil from "base/listutil";
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";

const G = World.Geometry;

// explananation of the suffixes: [FMO][LR] = { friendly, mid, opponent } { left, right }
// so CORNER_ML is the left end of the halfway line
const CORNER_ML = new Vector(-G.FieldWidthHalf, 0);
const CORNER_MR = new Vector(G.FieldWidthHalf, 0);
const CORNER_FL = new Vector(-G.FieldWidthHalf, -G.FieldHeightHalf);
const CORNER_FR = new Vector(G.FieldWidthHalf, -G.FieldHeightHalf);
const CORNER_OL = new Vector(-G.FieldWidthHalf, G.FieldHeightHalf);
const CORNER_OR = new Vector(G.FieldWidthHalf, G.FieldHeightHalf);

// we dont want to drive exactly on the lines
// so PADDING_FL is adds padding towards the friendly goal and towards the left
const PADDING = 0.5;
const PADDING_FL = new Vector(-PADDING, -PADDING);
const PADDING_FR = new Vector(PADDING, -PADDING);
const PADDING_OL = new Vector(-PADDING, PADDING);
const PADDING_OR = new Vector(PADDING, PADDING);

// presets
/* eslint-disable no-unused-vars */
const FRIENDLY_GOAL_EDGE: Vector[] = [CORNER_FR + PADDING_OL, CORNER_FL + PADDING_OR];
const OPPONENT_GOAL_EDGE: Vector[] = [CORNER_OR + PADDING_FL, CORNER_OL + PADDING_FR];

const FRIENDLY_RIGHT_EDGE: Vector[] = [CORNER_MR + PADDING_FL, CORNER_FR + PADDING_OL];
const OPPONENT_RIGHT_EDGE: Vector[] = [CORNER_MR + PADDING_OL, CORNER_OR + PADDING_FL];

const FRIENDLY_LEFT_EDGE: Vector[] = [CORNER_ML + PADDING_FR, CORNER_FL + PADDING_OR];
const OPPONENT_LEFT_EDGE: Vector[] = [CORNER_ML + PADDING_OR, CORNER_OL + PADDING_FR];

const FULL_RIGHT_EDGE: Vector[] = [CORNER_FR + PADDING_OL, CORNER_OR + PADDING_FL];
const FULL_LEFT_EDGE: Vector[] = [CORNER_FL + PADDING_OR, CORNER_OL + PADDING_FR];
/* eslint-enable no-unused-vars */

export class Race extends Move {
	/* for a single robot, just add the target positions in the lower list and it will cycle through them */
	// private static readonly POSITIONS: Vector[][] = [
	// 	[new Vector(-2, -2), new Vector(2, -2)],
	// ];

	/* for multiple robots, just enter the number below */
	// private static readonly POSITIONS: Vector[][] = nRobots(4, FRIENDLY_LEFT_EDGE[0], FRIENDLY_RIGHT_EDGE[1]);

	/* this should work most of the time */
	private static readonly POSITIONS: Vector[][] = nRobots(
		World.FriendlyRobotsAll.length,
		FRIENDLY_LEFT_EDGE[0],
		FRIENDLY_RIGHT_EDGE[1]
	);

	private static readonly POS_TOLERANCE: number = 0.2;
	private static readonly SPEED_TOLERANCE: number = 0.05;
	private static readonly SYNC: boolean = false;

	private static readonly N: number = Race.POSITIONS.length;
	private static readonly COLORS: vis.Color[] = [
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
	public static readonly MAX_ROBOTS = Race.N;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	private posIndices: number[] = Race.POSITIONS.map((_) => 0);

	static canStart() {
		return true;
	}

	static nRobots(n: number, topLeft: Vector, bottomRight: Vector, driveDirection?: "x" | "y"): [Vector, Vector][] {
		const x0 = topLeft.x;
		const y0 = topLeft.y;
		const x1 = bottomRight.x;
		const y1 = bottomRight.y;

		driveDirection ??= (Math.abs(x1 - x0) > Math.abs(y1 - y0)) ? "x" : "y";
		amun.log(driveDirection);
		if (driveDirection === "x") {
			return ListUtil.linspace(n, y0, y1).map((y) => [new Vector(x0, y), new Vector(x1, y)]);
		} else {
			return ListUtil.linspace(n, x0, x1).map((x) => [new Vector(x, y0), new Vector(x, y1)]);
		}
	}

	_canContinue() {
		return true;
	}

	_updateTasks(): MoveParameters {
		let taskAssignments: Map<FriendlyRobot, Assignment> = new Map<FriendlyRobot, Assignment>();

		const posReached = this._robots.map((r, i) => {
			const positions = Race.POSITIONS[i];
			const pos = positions[this.posIndices[i]];
			return r.pos.distanceToSq(pos) < Race.POS_TOLERANCE * Race.POS_TOLERANCE
				&& r.speed.lengthSq() < Race.SPEED_TOLERANCE * Race.SPEED_TOLERANCE;
		});

		const synchronized = posReached.every((x) => x) || !Race.SYNC;
		for (let i = 0; i < Math.min(this._robots.length, Race.POSITIONS.length); i++) {
			const r = this._robots[i];
			const positions = Race.POSITIONS[i];
			const pos = positions[this.posIndices[i]];

			vis.addPath("te/m/race: positions", [r.pos, pos], Race.COLORS[i]);
			for (const p of positions) {
				const radius = r.radius + (p === pos ? 0.05 : 0);
				vis.addCircle("te/m/race: positions", p, radius, Race.COLORS[i]);
			}

			if (posReached[i] && synchronized) {
				this.posIndices[i] += 1;
				this.posIndices[i] %= positions.length;
			}

			taskAssignments[r] = Assignment.create({
				class: MoveToPos,
				params: [{ pos: positions[this.posIndices[i]], ignoreDefaultObstacles: true, dir: 0 }],
				restart: posReached[i] && synchronized,
			});
		}

		return { assignments: taskAssignments };
	}
}
