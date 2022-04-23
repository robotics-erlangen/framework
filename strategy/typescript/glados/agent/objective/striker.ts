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

		// create the regressive zone
		{
			const boundaries = { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: MIDFIELD_OFFENSIVE_SPLIT, bottom: TOTAL_BOTTOM };
			const defaultPos = getRandomPosition(boundaries);
			zones.push({ boundaries, defaultPos });
			--remainingZones;
		}

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
			let boundaryList: SplitZone[] = [];
			// TODO handle main aggressive
			const MAX_SPLIT = 3;
			if (remainingZones > 0) {
				let firstBoundary = { boundaries: { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: TOTAL_TOP, bottom: MIDFIELD_OFFENSIVE_SPLIT }, splitCount: 0};
				boundaryList.push(firstBoundary);
				for (let i = 1; i < remainingZones; ++i) {
					let minDist = Infinity;
					let boundaryIndex: number = 0;
					for (let j = 0; j < boundaryList.length; ++j) {
						const splitZone = boundaryList[j];
						if (splitZone.splitCount >= MAX_SPLIT) {
							continue;
						}
						const corner1 = new Vector(splitZone.boundaries.left, splitZone.boundaries.bottom);
						const corner2 = new Vector(splitZone.boundaries.right, splitZone.boundaries.top);
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
					const divideSplitZone = boundaryList[boundaryIndex];
					const divideBoundary = divideSplitZone.boundaries;
					const splitCount = divideSplitZone.splitCount;
					const newSplitCount = splitCount + 1;
					const rightLeft = divideBoundary.right - divideBoundary.left;
					const topBottom = divideBoundary.top - divideBoundary.bottom;
					const rightLeftBigger = Math.abs(rightLeft) > Math.abs(topBottom);
					if (rightLeftBigger) {
						const newBoundaryMidRightLeft = rightLeft / 2 + divideBoundary.left;
						const newBoundary0 = { boundaries: { left: divideBoundary.left, right: newBoundaryMidRightLeft,
							top: divideBoundary.top, bottom: divideBoundary.bottom }, splitCount: newSplitCount};
						const newBoundary1 = { boundaries: { left: newBoundaryMidRightLeft, right: divideBoundary.right,
							top: divideBoundary.top, bottom: divideBoundary.bottom }, splitCount: newSplitCount};
						boundaryList[boundaryIndex] = newBoundary0;
						boundaryList.push(newBoundary1);
					} else {
						const newBoundaryTopBottom = topBottom / 2 + divideBoundary.bottom;
						const newBoundary0 = { boundaries: { left: divideBoundary.left, right: divideBoundary.right,
							top: newBoundaryTopBottom, bottom: divideBoundary.bottom }, splitCount: newSplitCount};
						const newBoundary1 = { boundaries: { left: divideBoundary.left, right: divideBoundary.right,
							top: divideBoundary.top, bottom: newBoundaryTopBottom }, splitCount: newSplitCount};
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
}
