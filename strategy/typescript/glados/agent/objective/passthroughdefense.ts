import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { parameterizeClass } from "base/types";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { DoubleTouchGuard } from "glados/agent/attacker/doubletouchguard";
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
import { Boundaries, getRandomPosition, Zone } from "glados/util/zone";

const G = World.Geometry;

export class PassThroughDefense extends Objective {
	constructor() {
		super({
			ma: PassThroughDefense.MA_RUNNER,
			freekick: PassThroughDefense.FREEKICK_RUNNER,
			support: PassThroughDefense.SUPPORT_RUNNER
		});
	}

	private static readonly MA_RUNNER = parameterizeClass(CheckableList, [
		PassTiming,
		parameterizeClass(Shoot, defaultRatePass),
	]);
	private static readonly FREEKICK_RUNNER = parameterizeClass(CheckableList, [
		parameterizeClass(FreeKick, defaultRatePass),
		DoubleTouchGuard,
		PassTiming,
		parameterizeClass(Shoot, defaultRatePass),
	]);
	private static readonly SUPPORT_RUNNER = parameterizeClass(CheckableList, [
		parameterizeClass(FeintPass, { isStriker: false, samplingCtor: StrikerSampling }),
		BreakPass,
		parameterizeClass(Support, { isStriker: false, samplingCtor: StrikerSampling }),
	]);

	static robotsInAreaAroundDefense() {
		const offset = 1.0;
		const corner1 = new Vector(G.DefenseWidthHalf + offset, G.FieldHeightHalf - G.DefenseHeight - offset);
		const corner2 = new Vector(-G.FieldWidthHalf - offset, G.FieldHeightHalf);
		return World.OpponentRobots
			.filter((robot) => geom.insideRect(corner1, corner2, robot.pos))
			.length;
	}

	static canStart(ball: BallLike) {
		const opponentDefendersCount = PassThroughDefense.robotsInAreaAroundDefense();
		return opponentDefendersCount > 6 && ball.pos.y > G.FieldHeightHalf - G.DefenseHeight * 5 / 3;
	}

	canContinue = (ball: BallLike) => {
		const opponentDefendersCount = PassThroughDefense.robotsInAreaAroundDefense();
		return opponentDefendersCount < 5 || ball.pos.y > G.FieldHeightHalf - G.DefenseHeight * 2;
	};

	getSupporterZones = (participants: FriendlyRobot[], mainAttackerPos: Position | undefined): Zone[] => {
		const TOTAL_LEFT = -G.FieldWidthHalf;
		const TOTAL_RIGHT = G.FieldWidthHalf;
		const TOTAL_TOP = G.FieldHeightHalf;
		const TOTAL_BOTTOM = -G.FieldHeightQuarter;
		const DEFENSE_AREA_Y = G.FieldHeightHalf - G.DefenseHeight;
		const DEFENSE_AREA_Y_HALF = DEFENSE_AREA_Y + G.DefenseHeight / 2;
		const DEFENSE_AREA_Y_ZONE_END = DEFENSE_AREA_Y - G.FieldHeightHalf / 3;
		const DEFENSE_AREA_X = G.DefenseWidthHalf;
		const DEFENSE_AREA_X_ZONE_END = DEFENSE_AREA_X + (TOTAL_RIGHT - DEFENSE_AREA_X) * 2 / 3;
		const TOP_ZONE_X = DEFENSE_AREA_X + (TOTAL_RIGHT - DEFENSE_AREA_X) * 1 / 3;

		let remainingZones = participants.length + 1; // one zone will stay empty
		let zones: Zone[] = [];

		enum RelativeMAPos {
			LEFT,
			RIGHT,
			TOP,
		}

		let mainAttackerRelativePos = RelativeMAPos.TOP;
		if (mainAttackerPos != undefined && mainAttackerPos.y > DEFENSE_AREA_Y) {
			if (mainAttackerPos.x > 0) {
				mainAttackerRelativePos = RelativeMAPos.RIGHT;
			} else {
				mainAttackerRelativePos = RelativeMAPos.LEFT;
			}
		}

		let left: Boundaries[] = [];
		if (remainingZones > 4 || (remainingZones === 4 && mainAttackerRelativePos === RelativeMAPos.LEFT)) {
			left = [
				{ top: TOTAL_TOP, bottom: DEFENSE_AREA_Y_HALF, left: -DEFENSE_AREA_X_ZONE_END, right: -DEFENSE_AREA_X },
				{ top: DEFENSE_AREA_Y_HALF, bottom: DEFENSE_AREA_Y, left: -DEFENSE_AREA_X_ZONE_END, right: -DEFENSE_AREA_X }
			];
			remainingZones -= 2;
		} else if (remainingZones > 1 || (remainingZones > 0 && mainAttackerRelativePos === RelativeMAPos.LEFT)) {
			left = [{ top: TOTAL_TOP, bottom: DEFENSE_AREA_Y, left: -DEFENSE_AREA_X_ZONE_END, right: -DEFENSE_AREA_X }];
			remainingZones -= 1;
		}

		let right: Boundaries[] = [];
		if (remainingZones > 4 || (remainingZones === 3 && mainAttackerRelativePos === RelativeMAPos.RIGHT)) {
			right = [
				{ top: TOTAL_TOP, bottom: DEFENSE_AREA_Y_HALF, left: DEFENSE_AREA_X, right: DEFENSE_AREA_X_ZONE_END },
				{ top: DEFENSE_AREA_Y_HALF, bottom: DEFENSE_AREA_Y, left: DEFENSE_AREA_X, right: DEFENSE_AREA_X_ZONE_END }
			];
			remainingZones -= 2;
		} else if (remainingZones > 1 || (remainingZones > 0 && mainAttackerRelativePos === RelativeMAPos.RIGHT)) {
			right = [{ top: TOTAL_TOP, bottom: DEFENSE_AREA_Y, left: DEFENSE_AREA_X, right: DEFENSE_AREA_X_ZONE_END }];
			remainingZones -= 1;
		}

		let top: Boundaries[] = [];
		if (remainingZones > 2) {
			const THIRD = TOP_ZONE_X * 1 / 3;
			top = [
				{ top: DEFENSE_AREA_Y, bottom: DEFENSE_AREA_Y_ZONE_END, left: THIRD, right: TOP_ZONE_X },
				{ top: DEFENSE_AREA_Y, bottom: DEFENSE_AREA_Y_ZONE_END, left: -THIRD, right: THIRD },
				{ top: DEFENSE_AREA_Y, bottom: DEFENSE_AREA_Y_ZONE_END, left: -TOP_ZONE_X, right: -THIRD }
			];
			remainingZones -= 3;
		} else if (remainingZones > 1) {
			top = [
				{ top: DEFENSE_AREA_Y, bottom: DEFENSE_AREA_Y_ZONE_END, left: 0, right: TOP_ZONE_X },
				{ top: DEFENSE_AREA_Y, bottom: DEFENSE_AREA_Y_ZONE_END, left: -TOP_ZONE_X, right: 0 }
			];
			remainingZones -= 2;
		} else if (remainingZones > 0) {
			top = [{ top: DEFENSE_AREA_Y, bottom: DEFENSE_AREA_Y_ZONE_END, left: -TOP_ZONE_X, right: TOP_ZONE_X }];
			remainingZones -= 1;
		}

		const combinedBoundaries = top.concat(left).concat(right);
		for (let boundaries of combinedBoundaries) {
			const defaultPos = getRandomPosition(boundaries);
			zones.push({ boundaries, defaultPos });
		}

		// create regressive zones
		if (mainAttackerPos == undefined) {
			const zoneWidth = (TOTAL_RIGHT - TOTAL_LEFT) / remainingZones;
			for (let i = 0; i < remainingZones; ++i) {
				const boundaries = {
					left: TOTAL_LEFT + i * zoneWidth,
					right: TOTAL_LEFT + (i + 1) * zoneWidth,
					top: DEFENSE_AREA_Y_ZONE_END,
					bottom: TOTAL_BOTTOM,
				};
				const defaultPos = getRandomPosition(boundaries);
				zones.push({ boundaries, defaultPos });
			}
		} else if (remainingZones > 0) {
			const startBoundaries: SplitZone[] = [{ boundaries: { left: TOTAL_LEFT, right: TOTAL_RIGHT, top: DEFENSE_AREA_Y_ZONE_END, bottom: TOTAL_BOTTOM }, timesDivisible: 4 }];

			const newZones = this.splitZonesClosestToMainAttacker(mainAttackerPos, remainingZones - startBoundaries.length + 1, startBoundaries);
			zones = zones.concat(newZones);
		}

		return zones;
	};
}
