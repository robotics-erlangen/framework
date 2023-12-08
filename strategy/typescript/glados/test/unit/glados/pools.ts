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
	let r = new FriendlyRobot(<pb.robot.Specs> { id: id });
	r.isVisible = true;
	r.pos = new Vector(0, 0);
	r.speed = new Vector(0, 0);
	r.maxSpeed = 3;
	return r;
}

function getAgentForRobot(pool: any, robot: FriendlyRobot, poolName: string): any {
	for (let agent of pool._agents) {
		if (agent.robot() === robot) {
			return agent;
		}
	}
	throw new Error(`Agent for '${robot}' is not found in '${poolName}'`);
}

export class GladosPools extends UnitTest {
	public constructor() {
		super();
		this.addTest("all", this.testAll);
	}


	private testAll() {
		// so that the Coordinates module works
		_setIsBlue(true);
		let allFriendlyRobotsOrig = World.FriendlyRobotsAll;
		let refereeStateOrig = World.RefereeState;
		(World as any).FriendlyRobotsAll = [robotStub(1), robotStub(2)];
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
		let attackerAgent = getAgentForRobot(coordinator._pools.attack, attackerRobot, "Attack");
		let defenderAgent = getAgentForRobot(coordinator._pools.defense, defenderRobot, "Defense");

		let [defenderBefore, attackerBefore] = [defenderRobot, attackerRobot];
		attackerAgent._messaging.sendToTrainer(MessageType.poolChangeRequest, "defender");
		coordinator.run();

		attackerRobot = coordinator._trainer._messaging.receive(MessageType.attackerFlag).keys().next().value;
		defenderRobot = coordinator._trainer._messaging.receive(MessageType.defenderFlag).keys().next().value;
		this.assert_eq(attackerRobot, defenderBefore);
		this.assert_eq(defenderRobot, attackerBefore);
		attackerAgent = getAgentForRobot(coordinator._pools.attack, attackerRobot, "Attack");
		defenderAgent = getAgentForRobot(coordinator._pools.defense, defenderRobot, "Defense");

		[defenderBefore, attackerBefore] = [defenderRobot, attackerRobot];
		defenderAgent._messaging.sendToTrainer(MessageType.poolChangeRequest, "attacker");
		coordinator.run();

		attackerRobot = coordinator._trainer._messaging.receive(MessageType.attackerFlag).keys().next().value;
		defenderRobot = coordinator._trainer._messaging.receive(MessageType.defenderFlag).keys().next().value;
		this.assert_eq(attackerRobot, defenderBefore);
		this.assert_eq(defenderRobot, attackerBefore);
		attackerAgent = getAgentForRobot(coordinator._pools.attack, attackerRobot, "Attack");
		defenderAgent = getAgentForRobot(coordinator._pools.defense, defenderRobot, "Defense");

		attackerAgent._messaging.sendToTrainer(MessageType.poolChangeRequest, "defender");
		defenderAgent._messaging.sendToTrainer(MessageType.poolChangeRequest, "attacker");
		[defenderBefore, attackerBefore] = [defenderRobot, attackerRobot];
		coordinator.run();

		attackerRobot = coordinator._trainer._messaging.receive(MessageType.attackerFlag).keys().next().value;
		defenderRobot = coordinator._trainer._messaging.receive(MessageType.defenderFlag).keys().next().value;
		this.assert_eq(attackerRobot, defenderBefore);
		this.assert_eq(defenderRobot, attackerBefore);
		attackerAgent = getAgentForRobot(coordinator._pools.attack, attackerRobot, "Attack");
		defenderAgent = getAgentForRobot(coordinator._pools.defense, defenderRobot, "Defense");

		(World as any).FriendlyRobotsAll = allFriendlyRobotsOrig;
		(World as any).RefereeState = refereeStateOrig;
		mainTrainer._attackRatio.attackerDefenderDistribution = mainTrainerAttackerDefenderDistribution;
	}
}
export let testClass = GladosPools;
