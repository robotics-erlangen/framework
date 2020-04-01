import * as Referee from "base/referee";

import { Behavior } from "glados/agent/base/behavior";
import { Default } from "glados/agent/defender/default";

export class PenaltyPassiveDefenderOffense extends Default {
	check(): Behavior | undefined {
		return Referee.isFriendlyPenaltyState() ? this : undefined;
	}
}
