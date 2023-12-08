import * as Referee from "base/referee";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { PenaltyPassiveDefense } from "glados/agent/shared/penaltypassivedefense";

const G = World.Geometry;

export class PenaltyPassiveAttackerOffense extends PenaltyPassiveDefense {
	protected startX = G.FieldWidth * 2.0;
	protected startY = G.FieldHeight * 2.0;
	protected endX = G.FieldWidth * -2.0;
	protected endYOffset = -1.3;

	// min 1.0m behind ball, 1.5 just in case
	protected yOffset = -1.5;

	public check(): Behavior | undefined {
		return Referee.isFriendlyPenaltyState() ? this : undefined;
	}
}
