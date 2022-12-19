import { FriendlyRobot } from "base/robot";
import { parameterizeClass } from "base/types";
import { Position } from "base/vector";
import * as World from "base/world";

import { DoubleTouchGuard } from "glados/agent/attacker/doubletouchguard";
import { FreeKick } from "glados/agent/attacker/freekick";
import { PassTiming } from "glados/agent/attacker/passtiming";
import { Shoot } from "glados/agent/attacker/shoot";
import { Support } from "glados/agent/attacker/support";
import { CheckableList } from "glados/agent/base/behavior";
import { BallLike, Objective, SplitZone } from "glados/agent/base/objective";
import { MidfieldSampling } from "glados/task/ability/midfieldsampling";
import { midfieldRatePass } from "glados/util/attack";
import { getRandomPosition, Zone } from "glados/util/zone";

const G = World.Geometry;

export class Midfield extends Objective {
	constructor() {
		super({
			ma: Midfield.MA_RUNNER,
			freekick: Midfield.FREEKICK_RUNNER,
			support: Midfield.SUPPORT_RUNNER
		});
	}

	private static readonly MA_RUNNER = parameterizeClass(CheckableList, [
		PassTiming,
		parameterizeClass(Shoot, midfieldRatePass),
	]);
	private static readonly FREEKICK_RUNNER = parameterizeClass(CheckableList, [
		parameterizeClass(FreeKick, midfieldRatePass),
		DoubleTouchGuard,
		PassTiming,
		parameterizeClass(Shoot, midfieldRatePass),
	]);
	private static readonly SUPPORT_RUNNER = parameterizeClass(Support, { isStriker: false, samplingCtor: MidfieldSampling });

	static canStart(ball: BallLike) {
		if (World.DIVISION === "B") {
			return false;
		}

		return ball.pos.y < -G.FieldHeightQuarter / 2;
	}

	canContinue = (ball: BallLike) => {
		return ball.pos.y < G.FieldHeightQuarter;
	};

	getSupporterZones = (participants: FriendlyRobot[], mainAttackerPos: Position | undefined): Zone[] => {
		const TOTAL_LEFT = -G.FieldWidthHalf;
		const TOTAL_RIGHT = G.FieldWidthHalf;
		const TOTAL_TOP = G.FieldHeightHalf;
		const TOTAL_BOTTOM = -G.FieldHeightQuarter;
		const MIDFIELD_OFFENSIVE_SPLIT = G.FieldHeightHalf / 3;

		let remainingZones = participants.length + 1; // one zone will stay empty
		let zones: Zone[] = [];

		if (mainAttackerPos == undefined) {
			// create one offensive zone
			{
				const boundaries = {
					left: TOTAL_LEFT,
					right: TOTAL_RIGHT,
					top: TOTAL_TOP,
					bottom: MIDFIELD_OFFENSIVE_SPLIT
				};
				const defaultPos = getRandomPosition(boundaries);
				zones.push({ boundaries, defaultPos });
				--remainingZones;
			}

			// create midfield zones
			const zoneWidth = (TOTAL_RIGHT - TOTAL_LEFT) / remainingZones;
			for (let i = 0; i < remainingZones; ++i) {
				const boundaries = {
					left: TOTAL_LEFT + i * zoneWidth,
					right: TOTAL_LEFT + (i + 1) * zoneWidth,
					top: MIDFIELD_OFFENSIVE_SPLIT,
					bottom: TOTAL_BOTTOM
				};
				const defaultPos = getRandomPosition(boundaries);
				zones.push({ boundaries, defaultPos });
			}
		} else {
			const startBoundaries: SplitZone[] = participants.length > 1
				? [
					{ boundaries: { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: TOTAL_TOP, bottom: MIDFIELD_OFFENSIVE_SPLIT }, timesDivisible: 1 },
					{ boundaries: { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: MIDFIELD_OFFENSIVE_SPLIT, bottom: TOTAL_BOTTOM }, timesDivisible: 3 },
				]
				: [{ boundaries: { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: TOTAL_TOP, bottom: TOTAL_BOTTOM }, timesDivisible: 1 }];
			const newZones = this.splitZonesClosestToMainAttacker(mainAttackerPos, remainingZones - startBoundaries.length + 1, startBoundaries);

			zones = zones.concat(newZones);
		}

		return zones;
	};
}
