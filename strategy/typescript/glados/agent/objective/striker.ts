import { FriendlyRobot } from "base/robot";
import { parameterizeClass } from "base/types";
import { Position } from "base/vector";
import * as World from "base/world";

import { DoubleTouchGuard } from "glados/agent/attacker/doubletouchguard";
import { FeintGoalShot } from "glados/agent/attacker/feintgoalshot";
import { FeintPass } from "glados/agent/attacker/feintpass";
import { FreeKick } from "glados/agent/attacker/freekick";
import { PassTiming } from "glados/agent/attacker/passtiming";
import { Shoot } from "glados/agent/attacker/shoot";
import { Support } from "glados/agent/attacker/support";
import { CheckableList } from "glados/agent/base/behavior";
import { BallLike, Objective, SplitZone } from "glados/agent/base/objective";
import { BreakPass } from "glados/agent/shared/breakpass";
import { StrikerSampling } from "glados/task/ability/strikersampling";
import { defaultRatePass } from "glados/util/attack";
import { getRandomPosition, Zone } from "glados/util/zone";

const G = World.Geometry;

export class Striker extends Objective {
	public constructor() {
		super({
			ma: Striker.MA_RUNNER,
			freekick: Striker.FREEKICK_RUNNER,
			support: Striker.SUPPORT_RUNNER
		});
	}

	private static readonly MA_RUNNER = parameterizeClass(CheckableList, [
		BreakPass,
		PassTiming,
		FeintGoalShot,
		parameterizeClass(Shoot, defaultRatePass),
	]);
	private static readonly FREEKICK_RUNNER = parameterizeClass(CheckableList, [
		BreakPass,
		parameterizeClass(FreeKick, defaultRatePass),
		DoubleTouchGuard,
		PassTiming,
		FeintGoalShot,
		parameterizeClass(Shoot, defaultRatePass),
	]);
	private static readonly SUPPORT_RUNNER = parameterizeClass(CheckableList, [
		parameterizeClass(FeintPass, { isStriker: true, samplingCtor: StrikerSampling }),
		BreakPass,
		parameterizeClass(Support, { isStriker: true, samplingCtor: StrikerSampling })
	]);

	public static canStart(_ball: BallLike) {
		return true;
	}

	public canContinue(_ball: BallLike) {
		return true;
	}

	public getSupporterZones(participants: FriendlyRobot[], mainAttackerPos: Position | undefined): Zone[] {
		const TOTAL_LEFT = -G.FieldWidthHalf;
		const TOTAL_RIGHT = G.FieldWidthHalf;
		const TOTAL_TOP = G.FieldHeightHalf;
		const TOTAL_BOTTOM = -G.FieldHeightQuarter;
		const MIDFIELD_OFFENSIVE_SPLIT = G.FieldHeightHalf / 4;

		let remainingZones = participants.length + 1; // one zone will stay empty

		let zones: Zone[] = [];

		// should probably never undefined, but just in case it is fall back to trivially splitting the zones
		if (mainAttackerPos == undefined) {
			// create the regressive zone(s)
			const boundaries = { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: MIDFIELD_OFFENSIVE_SPLIT, bottom: TOTAL_BOTTOM };
			const defaultPos = getRandomPosition(boundaries);
			zones.push({ boundaries, defaultPos });

			--remainingZones;

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
			const useRegressiveZone = participants.length > 3;
			const offensiveSplitZone = { boundaries: { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: TOTAL_TOP, bottom: MIDFIELD_OFFENSIVE_SPLIT }, timesDivisible: 3 };
			// if the regressive zone is used splitZonesClosestToMainAttacker should use produce one zone less
			const remainingZonesOffensive = remainingZones - (useRegressiveZone ? 1 : 0);

			let newZones = this.splitZonesClosestToMainAttacker(mainAttackerPos, participants, remainingZonesOffensive, [offensiveSplitZone]);
			remainingZones -= newZones.length;

			if (useRegressiveZone) {
				const regressiveSplitZone = { boundaries: { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: MIDFIELD_OFFENSIVE_SPLIT, bottom: TOTAL_BOTTOM }, timesDivisible: 1 };
				const newRegressiveZones = this.splitZonesClosestToMainAttacker(mainAttackerPos, participants, remainingZones - 1, [regressiveSplitZone]);
				newZones = newZones.concat(newRegressiveZones);
			}

			zones = zones.concat(newZones);
		}

		return zones;
	}
}
