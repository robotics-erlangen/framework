import * as pb from "base/protobuf";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Defender } from "glados/agent/defender";
import { CenterBack as CenterbackBehavior } from "glados/agent/defender/centerback";
import { Messaging } from "glados/control/messaging";
import { CenterBack as CenterbackTask } from "glados/task/defender/centerback";
import { UnitTest } from "glados/test/unit/unittest";

interface CenterbackInfo {
	file: string;
	robotId: number;
	centerbackTarget: Position;
	shouldChip: boolean;
}

export class GladosCenterback extends UnitTest {

	constructor() {
		super();

		const s1 = {
			file: "glados/test/unit/glados/centerback-situations/do-not-shoot-into-own-goal",
			robotId: 8,
			centerbackTarget: new Vector(-0.11, -4.70),
			shouldChip: false
		};
		this.addSituationTest("no own goal chip", this.testCenterbackChip, [[s1.file, s1]]);
	}

	private testCenterbackChip(info: CenterbackInfo) {
		const robot = World.FriendlyRobotsById[info.robotId];
		const messaging = new Messaging();
		const agent = new Defender(robot, messaging);
		const behavior = new CenterbackBehavior(agent);
		let centerback = new CenterbackTask(behavior, {pos: info.centerbackTarget});
		centerback.run();
		if (info.shouldChip) {
			this.assert_equal((robot as any)._kickStyle, pb.robot.Command.KickStyle.Chip);
		} else {
			this.assert_undefined((robot as any)._kickStyle);
		}
	}
}
export let testClass = GladosCenterback;
