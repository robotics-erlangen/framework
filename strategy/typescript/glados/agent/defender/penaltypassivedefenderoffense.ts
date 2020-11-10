import * as Referee from "base/referee";

import { Default } from "glados/agent/defender/default";

export class PenaltyPassiveDefenderOffense extends Default {
	check(): boolean {
		return Referee.isFriendlyPenaltyState();
	}
}
