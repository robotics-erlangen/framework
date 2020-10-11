import * as Referee from "base/referee";
import * as World from "base/world";

import { PenaltyPassive } from "glados/agent/shared/penaltypassive";

const G = World.Geometry;

export class PenaltyPassiveOffensive extends PenaltyPassive {
	start_x = G.FieldWidth * 2.0;
	start_y = G.FieldHeight * 2.0;
	end_x = G.FieldWidth * -2.0;
	end_y_offset = -1.3;

	// min 1.0m behind ball, 1.5 just in case
	y_offset = -1.5;

	check(): boolean {
		return Referee.isFriendlyPenaltyState();
	}
}
