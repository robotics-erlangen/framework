import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";

import { MessageBox } from "glados/control/messaging";
import { Assignment, MoveParameters } from "glados/group/move/base";
import { HardwareChallengeBase } from "glados/group/move/hardwarechallenges/base";
import * as Scenarios from "glados/group/move/hardwarechallenges/scenarios";
import { MoveToPos } from "glados/task/shared/movetopos";

export class DribbleChallenge extends HardwareChallengeBase {

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging, Scenarios.challenge3);
	}

	public challengeSpecificUpdateTask(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		taskAssignments[this._robots[0]] = Assignment.create({
			class: MoveToPos,
			params: [{pos: new Vector(5, 4)}],
			restart: true
		});

		return {assignments: taskAssignments};
	}
}
