import { _setIsBlue } from "base/coordinates";
import * as pb from "base/protobuf";
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { MainCoordinator } from "glados/control/maincoordinator";
import { MessageType } from "glados/control/messaging";
import { UnitTest } from "glados/test/unit/unittest";
import { MainTrainer } from "glados/trainer/maintrainer";


function robotStub(id: number) {
	let r = new FriendlyRobot(<pb.robot.Specs> {id: id});
	r.isVisible = true;
	r.pos = new Vector(0, 0);
	r.speed = new Vector(0, 0);
	r.maxSpeed = 3;
	return r;
}

export class BasePools extends UnitTest {
	constructor() {
		super();
		this.addTest("all", this.testAll);
	}

	private testAll() {
		// so that the Coordinates module works
		_setIsBlue(true);
		let allFriendlyRobotsOrig = World.FriendlyRobotsAll;
		let refereeStateOrig = World.RefereeState;
		(World as any).FriendlyRobotsAll = [ robotStub(1), robotStub(2) ];
		(World as any).RefereeState = "Halt";

		let mainTrainer = new MainTrainer(undefined);
		let mainTrainerAttackerDefenderDistribution = mainTrainer._attackRatio.attackerDefenderDistribution;
		mainTrainer._attackRatio.attackerDefenderDistribution = function() {
			return [1, 1];
		};
		let coordinator = new MainCoordinator(mainTrainer);
		coordinator.run();

		let attackerRobot = coordinator._trainer._messaging.receive(MessageType.attackerFlag).keys().next().value;
		let defenderRobot = coordinator._trainer._messaging.receive(MessageType.defenderFlag).keys().next().value;
		let attackerAgent = undefined;
		let defenderAgent = undefined;
		for (let agent of (coordinator._pools.attack as any)._agents) {
			if (agent.robot() === attackerRobot) {
				attackerAgent = agent;
			}
		}
		for (let agent of (coordinator._pools.defense as any)._agents) {
			if (agent.robot() === defenderRobot) {
				defenderAgent = agent;
			}
		}
		this.assert_not_undefined(attackerAgent);
		this.assert_not_undefined(defenderAgent);

		let [defenderBefore, attackerBefore] = [defenderRobot, attackerRobot];
		attackerAgent!._messaging.sendToTrainer(MessageType.poolChangeRequest, "defender");
		coordinator.run();

		attackerRobot = coordinator._trainer._messaging.receive(MessageType.attackerFlag).keys().next().value;
		defenderRobot = coordinator._trainer._messaging.receive(MessageType.defenderFlag).keys().next().value;
		this.assert_equal(attackerRobot, defenderBefore);
		this.assert_equal(defenderRobot, attackerBefore);

		[defenderBefore, attackerBefore] = [defenderRobot, attackerRobot];
		defenderAgent._messaging.sendToTrainer(MessageType.poolChangeRequest, "attacker");
		coordinator.run();

		attackerRobot = coordinator._trainer._messaging.receive(MessageType.attackerFlag).keys().next().value;
		defenderRobot = coordinator._trainer._messaging.receive(MessageType.defenderFlag).keys().next().value;
		this.assert_equal(attackerRobot, defenderBefore);
		this.assert_equal(defenderRobot, attackerBefore);

		(World as any).FriendlyRobotsAll = allFriendlyRobotsOrig;
		(World as any).RefereeState = refereeStateOrig;
		mainTrainer._attackRatio.attackerDefenderDistribution = mainTrainerAttackerDefenderDistribution;
	}
}
export let testClass = BasePools;
