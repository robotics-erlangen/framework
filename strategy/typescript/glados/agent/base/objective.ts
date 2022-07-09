import * as geom from "base/geom";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Agent } from "glados/agent/base/agent";
import { Checkable, CheckableConstructor } from "glados/agent/base/behavior";
import { Boundaries, getRandomPosition, Zone } from "glados/util/zone";

/** Different checkables to be used by the main and support attackers */
export interface RunnerCtors {
	/** To be used by the main attacker during normal play */
	ma: CheckableConstructor;
	/** To be used by the main attacker leading up to and during freekicks */
	freekick: CheckableConstructor;
	/** To be used by support attackers */
	support: CheckableConstructor;
}

export interface SplitZone {
	boundaries: Boundaries;
	timesDivisible: number;
}

/**
 * The base class for objectives.
 *
 * An objective is specified by the main attacker and which objective is
 * chosen, depends on what the MA wants to do with the ball. For example, he
 * could aim to score are goal directly, or instead pass to a teammate who is
 * in better position to continue passing. Both of these objectives can be
 * implemented in a subclass of the Objective class.
 */
export abstract class Objective {
	private _maRunner?: Checkable;
	private readonly _runnerCtors: RunnerCtors;
	private readonly _supportRunner = new Map<Agent, Checkable>();

	/** Whether the objective was activated during a freekick */
	private readonly _freekick: boolean;

	constructor(runnerCtor: RunnerCtors) {
		this._runnerCtors = runnerCtor;
		this._freekick = Referee.isFriendlyFreeKickState()
			|| World.RefereeState === "BallPlacementOffensive" && Referee.isFriendlyFreeKickState(World.NextRefereeState);
	}

	/** Get the {@link Checkable} that can be checked by the main attacker */
	getMaRunner(maAgent: Agent): Checkable {
		if (!this._maRunner) {
			const ctor = this._freekick
				? this._runnerCtors.freekick
				: this._runnerCtors.ma;
			this._maRunner = new ctor(maAgent);
		}
		return this._maRunner;
	}

	/**
	 * Get a {@link Checkable} that can be checked by normal support attackers
	 * @param agent - The support agent to retrieve the Checkable for
	 */
	getSupportRunner(agent: Agent): Checkable {
		if (this._supportRunner[agent] === undefined) {
			this._supportRunner[agent] = new this._runnerCtors.support(agent);
		}
		return this._supportRunner[agent]!;
	}

	/**
	 * The zones in which supporting attackers should distribute. The zone at
	 * index 0 is the default empty zone, i.e the zone which is used as empty
	 * zone if the main attacker is in no other zone.
	 * @see glados/group/supporter
	 */
	abstract getSupporterZones(supporter: FriendlyRobot[], mainAttackerPos: Position | undefined): Zone[];

	/**
	 * Whether the objective is fit to continue execution.
	 * @param ball - The ball to use in e.g. ball position checks (the same as in canStart)
	 */
	abstract canContinue(ball: BallLike): boolean;

	_toString() {
		return `${this.constructor.name} (${this._freekick ? "Freekick" : "Normal"})`;
	}

	toString() {
		return this._toString();
	}

	protected splitZonesClosestToMainAttacker(mainAttackerPos: Position, remainingZones: number, startBoundaries: SplitZone[]): Zone[] {
		const DEFENSE_AREA_CUT_OFF_Y = World.Geometry.FieldHeightHalf - World.Geometry.DefenseHeight;
		const LOWER_DEFENSE_AREA_CUT_OFF_X = -World.Geometry.DefenseWidthHalf;
		const UPPER_DEFENSE_AREA_CUT_OFF_X = World.Geometry.DefenseWidthHalf;

		let boundaryList: SplitZone[] = startBoundaries;
		if (remainingZones > 0) {

			/* The basic idea of the following is to split the zones repeatedly.
			 * The zones split next is the one closest to the main attacker, unless it's timesDivisible counter is 0
			 * to keep the zones at a useful size.
			 * If the zone contains the defense area lines, split it along those lines, otherwise split it in the middle.
			 * In the case one of the resulting zones contains the defense area and can be split into two new zones a way that
			 * one zone lies completely inside the defense area and the other one completely outside the defense area do this
			 * and only keep the zone outside the defense area. */
			for (let i = 1; i < remainingZones; ++i) {
				const boundaryIndex = this.findClosestZoneToMainAttacker(mainAttackerPos, boundaryList);

				const currentSplitZone = boundaryList[boundaryIndex];
				const currentBoundary = currentSplitZone.boundaries;
				const timesDivisible = currentSplitZone.timesDivisible;
				const newTimesDivisible = timesDivisible - 1;
				const rightLeft = currentBoundary.right - currentBoundary.left;
				const topBottom = currentBoundary.top - currentBoundary.bottom;
				const rightLeftBigger = Math.abs(rightLeft) > Math.abs(topBottom);
				// choose splitting axis
				if (rightLeftBigger) {
					let newBoundaryMidRightLeft: number;
					if (currentBoundary.top > DEFENSE_AREA_CUT_OFF_Y
						&& currentBoundary.right > UPPER_DEFENSE_AREA_CUT_OFF_X
						&& currentBoundary.left < UPPER_DEFENSE_AREA_CUT_OFF_X) {

						// check if whole defense area is inside boundaries
						if (currentBoundary.left < LOWER_DEFENSE_AREA_CUT_OFF_X) {
							const mainAttackerPosToLowerDefenseArea = Math.abs(mainAttackerPos.x - LOWER_DEFENSE_AREA_CUT_OFF_X);
							const mainAttackerPosToUpperDefenseArea = Math.abs(mainAttackerPos.x - UPPER_DEFENSE_AREA_CUT_OFF_X);
							if (mainAttackerPosToLowerDefenseArea < mainAttackerPosToUpperDefenseArea) {
								newBoundaryMidRightLeft = LOWER_DEFENSE_AREA_CUT_OFF_X;
							} else {
								newBoundaryMidRightLeft = UPPER_DEFENSE_AREA_CUT_OFF_X;
							}
						} else {
							newBoundaryMidRightLeft = UPPER_DEFENSE_AREA_CUT_OFF_X;
						}
					} else if (currentBoundary.top > DEFENSE_AREA_CUT_OFF_Y
								&& currentBoundary.right > LOWER_DEFENSE_AREA_CUT_OFF_X
								&& currentBoundary.left < LOWER_DEFENSE_AREA_CUT_OFF_X) {
						newBoundaryMidRightLeft = LOWER_DEFENSE_AREA_CUT_OFF_X;
					} else {
						newBoundaryMidRightLeft = rightLeft / 2 + currentBoundary.left;
					}

					const boundaryContainsDefenseArea = currentBoundary.top > DEFENSE_AREA_CUT_OFF_Y
						&& currentBoundary.bottom < DEFENSE_AREA_CUT_OFF_Y;
					// check if the new boundary can be reduced to not contain the defense area
					const cutoutDefenseArea0 = boundaryContainsDefenseArea
						&& newBoundaryMidRightLeft === UPPER_DEFENSE_AREA_CUT_OFF_X
						&& currentBoundary.left === LOWER_DEFENSE_AREA_CUT_OFF_X;
					const newBoundary0Top = cutoutDefenseArea0 ? DEFENSE_AREA_CUT_OFF_Y : currentBoundary.top;

					const newBoundary0 = { boundaries: { left: currentBoundary.left, right: newBoundaryMidRightLeft,
						top: newBoundary0Top, bottom: currentBoundary.bottom }, timesDivisible: newTimesDivisible };

					// check if the new boundary can be reduced to not contain the defense area
					const cutoutDefenseArea1 = boundaryContainsDefenseArea
						&& currentBoundary.right === UPPER_DEFENSE_AREA_CUT_OFF_X
						&& newBoundaryMidRightLeft === LOWER_DEFENSE_AREA_CUT_OFF_X;
					const newBoundary1Top = cutoutDefenseArea1 ? DEFENSE_AREA_CUT_OFF_Y : currentBoundary.top;
					const newBoundary1 = { boundaries: { left: newBoundaryMidRightLeft, right: currentBoundary.right,
						top: newBoundary1Top, bottom: currentBoundary.bottom }, timesDivisible: newTimesDivisible };

					boundaryList[boundaryIndex] = newBoundary0;
					boundaryList.push(newBoundary1);
				} else {
					const containsDefenseArea = currentBoundary.top > DEFENSE_AREA_CUT_OFF_Y
						&& currentBoundary.bottom < DEFENSE_AREA_CUT_OFF_Y;
					const newBoundaryTopBottom = containsDefenseArea ? DEFENSE_AREA_CUT_OFF_Y : topBottom / 2 + currentBoundary.bottom;
					const newBoundary0 = { boundaries: { left: currentBoundary.left, right: currentBoundary.right,
						top: newBoundaryTopBottom, bottom: currentBoundary.bottom }, timesDivisible: newTimesDivisible };

					// check if the new boundary can be reduced to not contain the defense area
					const newBoundary1ContainsDefenseAreaUpper = currentBoundary.left > UPPER_DEFENSE_AREA_CUT_OFF_X
						&& currentBoundary.right < UPPER_DEFENSE_AREA_CUT_OFF_X;
					const newBoundary1ContainsDefenseAreaLower = currentBoundary.left > LOWER_DEFENSE_AREA_CUT_OFF_X
						&& currentBoundary.right < LOWER_DEFENSE_AREA_CUT_OFF_X;
					const newBoundary1Left: number = newBoundary1ContainsDefenseAreaUpper
						? UPPER_DEFENSE_AREA_CUT_OFF_X
						: currentBoundary.left;
					const newBoundary1Right: number = newBoundary1ContainsDefenseAreaLower
						? LOWER_DEFENSE_AREA_CUT_OFF_X
						: currentBoundary.right;
					const newBoundary1 = { boundaries: { left: newBoundary1Left, right: newBoundary1Right,
						top: currentBoundary.top, bottom: newBoundaryTopBottom }, timesDivisible: newTimesDivisible };

					boundaryList[boundaryIndex] = newBoundary0;
					boundaryList.push(newBoundary1);
				}
			}
		}

		const newZones = boundaryList.map((splitZone) => {
			const defaultPos = getRandomPosition(splitZone.boundaries);
			return { boundaries: splitZone.boundaries, defaultPos };
		});

		return newZones;
	}

	protected findClosestZoneToMainAttacker(mainAttackerPos: Position, boundaryList: SplitZone[]): number {
		let minDist = Infinity;
		let boundaryIndex: number = 0;
		for (let j = 0; j < boundaryList.length; ++j) {
			const splitZone = boundaryList[j];
			if (splitZone.timesDivisible <= 0) {
				continue;
			}
			const corner1 = new Vector(splitZone.boundaries.left, splitZone.boundaries.bottom);
			const corner2 = new Vector(splitZone.boundaries.right, splitZone.boundaries.top);
			// if zone contains mainAttackerPos it's obviously always the closest
			if (geom.insideRect(corner1, corner2, mainAttackerPos)) {
				boundaryIndex = j;
				break;
			}

			const distX = Math.min(Math.abs(mainAttackerPos.x - splitZone.boundaries.right),
									Math.abs(mainAttackerPos.x - splitZone.boundaries.left));
			const distY = Math.min(Math.abs(mainAttackerPos.y - splitZone.boundaries.top),
									Math.abs(mainAttackerPos.y - splitZone.boundaries.bottom));
			const dist = Math.min(distX, distY);
			if (dist < minDist) {
				minDist = dist;
				boundaryIndex = j;
			}
		}
		return boundaryIndex;
	}
}

export interface BallLike {
	pos: Readonly<Position>;
}

/**
 * It is necessary to use an extra interface for the constructor since
 * Objective is abstract and cannot be instantiated directly (which is
 * necessary if you keep them in a list)
 */
export interface ObjectiveConstructor {
	/**
	 * Check whether the objective can start with the specified ball
	 *
	 * Note that is taken more as an advice than a requirement - the objective
	 * could still be instantiated even if canStart returned `false`
	 *
	 * @param ball - The ball to use in e.g. ball position checks
	 * @returns true iff the objective could start running under the current conditions
	 */
	canStart(ball: BallLike): boolean;
	new(): Objective;
}
