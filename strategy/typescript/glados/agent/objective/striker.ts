import { FriendlyRobot } from "base/robot";
import { parameterizeClass } from "base/types";
import * as World from "base/world";

import { Default } from "glados/agent/attacker/default";
import { DoubleTouchGuard } from "glados/agent/attacker/doubletouchguard";
import { FreeKick } from "glados/agent/attacker/freekick";
import { PassTiming } from "glados/agent/attacker/passtiming";
import { Shoot } from "glados/agent/attacker/shoot";
import { Agent } from "glados/agent/base/agent";
import { CheckableList } from "glados/agent/base/behavior";
import { BallLike, Objective } from "glados/agent/base/objective";
import { StrikerSampling } from "glados/task/ability/strikersampling";
import { defaultRatePass } from "glados/util/attack";
import { getRandomPosition, Zone } from "glados/util/zone";

const G = World.Geometry;

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
		FreeKick,
		DoubleTouchGuard,
		PassTiming,
		parameterizeClass(Shoot, defaultRatePass),
	]);
	private static SUPPORT_RUNNER = parameterizeClass(Default, { isStriker: true, samplingCtor: StrikerSampling });

	static canStart(_ball: BallLike) {
		return true;
	}

	canContinue() {
		return true;
	}

	getSupporterZones(participants: FriendlyRobot[]): Zone[] {
		const TOTAL_LEFT = -G.FieldWidthHalf;
		const TOTAL_RIGHT = G.FieldWidthHalf;
		const TOTAL_TOP = G.FieldHeightHalf;
		const TOTAL_BOTTOM = -G.FieldHeightQuarter;
		const MIDFIELD_OFFENSIVE_SPLIT = G.FieldHeightHalf / 4;

		let remainingZones = participants.length + 1; // one zone will stay empty

		const zones: Zone[] = [];

		// create the regressive zone
		{
			const boundaries = { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: MIDFIELD_OFFENSIVE_SPLIT, bottom: TOTAL_BOTTOM };
			const defaultPos = getRandomPosition(boundaries);
			zones.push({ boundaries, defaultPos });
			--remainingZones;
		}

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

		return zones;
	}
}
