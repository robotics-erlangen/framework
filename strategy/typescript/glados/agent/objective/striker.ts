import { parameterizeClass } from "base/types";

import { Default } from "glados/agent/attacker/default";
import { DoubleTouchGuard } from "glados/agent/attacker/doubletouchguard";
import { FreeKick } from "glados/agent/attacker/freekick";
import { PassTiming } from "glados/agent/attacker/passtiming";
import { Shoot } from "glados/agent/attacker/shoot";
import { Agent } from "glados/agent/base/agent";
import { CheckableList } from "glados/agent/base/behavior";
import { BallLike, Objective } from "glados/agent/base/objective";

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
		Shoot,
	]);
	private static FREEKICK_RUNNER = parameterizeClass(CheckableList, [
		FreeKick,
		DoubleTouchGuard,
		PassTiming,
		Shoot,
	]);
	private static SUPPORT_RUNNER = Default;

	static canStart(_ball: BallLike) {
		return true;
	}

	canContinue() {
		return true;
	}

}
