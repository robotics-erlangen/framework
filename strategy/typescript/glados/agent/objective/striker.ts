import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { parameterizeClass } from "base/types";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { DoubleTouchGuard } from "glados/agent/attacker/doubletouchguard";
import { FreeKick } from "glados/agent/attacker/freekick";
import { PassTiming } from "glados/agent/attacker/passtiming";
import { Shoot } from "glados/agent/attacker/shoot";
import { Support } from "glados/agent/attacker/support";
import { Agent } from "glados/agent/base/agent";
import { CheckableList } from "glados/agent/base/behavior";
import { BallLike, Objective } from "glados/agent/base/objective";
import { MessageType } from "glados/control/messaging";
import { StrikerSampling } from "glados/task/ability/strikersampling";
import { defaultRatePass } from "glados/util/attack";
import { Boundaries, getRandomPosition, Zone } from "glados/util/zone";

const G = World.Geometry;

interface SplitZone {
	boundaries: Boundaries;
	splitCount: number;
}

export class Striker extends Objective {
	constructor(maAgent: Agent) {
		super(maAgent, {
			ma: Striker.MA_RUNNER,
			freekick: Striker.FREEKICK_RUNNER,
			support: Striker.SUPPORT_RUNNER
		});
	}

	private static MA_RUNNER = parameterizeClass(CheckableList, [
		PassTiming,
		parameterizeClass(Shoot, defaultRatePass),
	]);
	private static FREEKICK_RUNNER = parameterizeClass(CheckableList, [
		parameterizeClass(FreeKick, defaultRatePass),
		DoubleTouchGuard,
		PassTiming,
		parameterizeClass(Shoot, defaultRatePass),
	]);
	private static SUPPORT_RUNNER = parameterizeClass(Support, { isStriker: true, samplingCtor: StrikerSampling });

	static canStart(_ball: BallLike) {
		return true;
	}

	canContinue(_ball: BallLike) {
		return true;
	}

	getSupporterZones(participants: FriendlyRobot[], mainAttackerPos: Position | undefined): Zone[] {
		const TOTAL_LEFT = -G.FieldWidthHalf;
		const TOTAL_RIGHT = G.FieldWidthHalf;
		const TOTAL_TOP = G.FieldHeightHalf;
		const TOTAL_BOTTOM = -G.FieldHeightQuarter;
		const MIDFIELD_OFFENSIVE_SPLIT = G.FieldHeightHalf / 4;

		let remainingZones = participants.length + 1; // one zone will stay empty

		let zones: Zone[] = [];

		// create the regressive zone(s)
		if (participants.length <= 8) {
			const boundaries = { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: MIDFIELD_OFFENSIVE_SPLIT, bottom: TOTAL_BOTTOM };
			const defaultPos = getRandomPosition(boundaries);
			zones.push({ boundaries, defaultPos });
			--remainingZones;
		} else {
			// technically always zero on a normal field, but maybe not on every geometry
			const midPoint = (TOTAL_LEFT - TOTAL_RIGHT) / 2 + TOTAL_RIGHT;
			const boundaries0 = { left: TOTAL_LEFT, right: midPoint, top: MIDFIELD_OFFENSIVE_SPLIT, bottom: TOTAL_BOTTOM };
			const defaultPos0 = getRandomPosition(boundaries0);
			zones.push({ boundaries: boundaries0, defaultPos: defaultPos0 });

			const boundaries1 = { left: midPoint, right: TOTAL_RIGHT, top: MIDFIELD_OFFENSIVE_SPLIT, bottom: TOTAL_BOTTOM };
			const defaultPos1 = getRandomPosition(boundaries1);
			zones.push({ boundaries: boundaries1, defaultPos: defaultPos1 });

			remainingZones -= 2;
		}

		// should probably never undefined, but just in case it is fall back to trivially splitting the zones
		if (mainAttackerPos == undefined) {
			// create offensive zones
			const zoneWidth = (TOTAL_RIGHT - TOTAL_LEFT) / remainingZones;
			for (let i = 0; i < remainingZones; ++i) {
				const boundaries = {
					left: TOTAL_LEFT + i * zoneWidth,
					right: TOTAL_LEFT + (i + 1) * zoneWidth,
					top: TOTAL_TOP,
					bottom: MIDFIELD_OFFENSIVE_SPLIT
				};
				const defaultPos = getRandomPosition(boundaries);
				zones.push({ boundaries, defaultPos });
			}
		} else {
			const DEFENSE_AREA_CUT_OFF_Y = G.FieldHeightHalf - G.DefenseHeight;
			const LOWER_DEFENSE_AREA_CUT_OFF_X = -G.DefenseWidthHalf;
			const UPPER_DEFENSE_AREA_CUT_OFF_X = G.DefenseWidthHalf;

			let boundaryList: SplitZone[] = [];
			if (remainingZones > 0) {
				let firstBoundary = { boundaries: { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: TOTAL_TOP, bottom: MIDFIELD_OFFENSIVE_SPLIT }, splitCount: 0};
				boundaryList.push(firstBoundary);
				/* The basic idea of the following is to split the zones repeatedly.
				 * The zones split next is the one closest to the main attacker, unless it already has been split MAX_SPLIT times,
				 * to keep the zones at a useful size.
				 * If the zone contains the defense area lines, split it along those lines, otherwise split it in the middle.
				 * In the case one of the resulting zones contains the defense area and can be split into two new zones a way that
				 * one zone lies completely inside the defense area and the other one completely outside the defense area do this
				 * and only keep the zone outside the defense area. */
				for (let i = 1; i < remainingZones; ++i) {
					const boundaryIndex = this.findClosestZoneToMainAttacker(mainAttackerPos, boundaryList);

					const currentSplitZone = boundaryList[boundaryIndex];
					const currentBoundary = currentSplitZone.boundaries;
					const splitCount = currentSplitZone.splitCount;
					const newSplitCount = splitCount + 1;
					const rightLeft = currentBoundary.right - currentBoundary.left;
					const topBottom = currentBoundary.top - currentBoundary.bottom;
					const rightLeftBigger = Math.abs(rightLeft) > Math.abs(topBottom);
					// choose splitting axis
					if (rightLeftBigger) {
						let newBoundaryMidRightLeft: number;
						if (currentBoundary.right > UPPER_DEFENSE_AREA_CUT_OFF_X && currentBoundary.left < UPPER_DEFENSE_AREA_CUT_OFF_X) {
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
						} else if (currentBoundary.right > LOWER_DEFENSE_AREA_CUT_OFF_X && currentBoundary.left < LOWER_DEFENSE_AREA_CUT_OFF_X) {
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
							top: newBoundary0Top, bottom: currentBoundary.bottom }, splitCount: newSplitCount };

						// check if the new boundary can be reduced to not contain the defense area
						const cutoutDefenseArea1 = boundaryContainsDefenseArea
													&& currentBoundary.right === UPPER_DEFENSE_AREA_CUT_OFF_X
													&& newBoundaryMidRightLeft === LOWER_DEFENSE_AREA_CUT_OFF_X;
						const newBoundary1Top = cutoutDefenseArea1 ? DEFENSE_AREA_CUT_OFF_Y : currentBoundary.top;
						const newBoundary1 = { boundaries: { left: newBoundaryMidRightLeft, right: currentBoundary.right,
							top: newBoundary1Top, bottom: currentBoundary.bottom }, splitCount: newSplitCount };
						boundaryList[boundaryIndex] = newBoundary0;
						boundaryList.push(newBoundary1);
					} else {
						const containsDefenseArea = currentBoundary.top > DEFENSE_AREA_CUT_OFF_Y
													&& currentBoundary.bottom < DEFENSE_AREA_CUT_OFF_Y;
						const newBoundaryTopBottom = containsDefenseArea ? DEFENSE_AREA_CUT_OFF_Y : topBottom / 2 + currentBoundary.bottom;
						const newBoundary0 = { boundaries: { left: currentBoundary.left, right: currentBoundary.right,
							top: newBoundaryTopBottom, bottom: currentBoundary.bottom }, splitCount: newSplitCount };

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
							top: currentBoundary.top, bottom: newBoundaryTopBottom }, splitCount: newSplitCount };
						boundaryList[boundaryIndex] = newBoundary0;
						boundaryList.push(newBoundary1);
					}
				}
			}

			const newZones = boundaryList.map((splitZone) => {
				const defaultPos = getRandomPosition(splitZone.boundaries);
				return { boundaries: splitZone.boundaries, defaultPos };
			});

			zones = zones.concat(newZones);
		}

		return zones;
	}

	private findClosestZoneToMainAttacker(mainAttackerPos: Position, boundaryList: SplitZone[]): number {
		const MAX_SPLIT = 3;
		let minDist = Infinity;
		let boundaryIndex: number = 0;
		for (let j = 0; j < boundaryList.length; ++j) {
			const splitZone = boundaryList[j];
			if (splitZone.splitCount >= MAX_SPLIT) {
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
