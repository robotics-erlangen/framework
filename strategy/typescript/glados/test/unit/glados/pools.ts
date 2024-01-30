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
		let mainTrainerAttackerDefenderDistribution = (mainTrainer as any)._attackRatio.attackerDefenderDistribution;
		(mainTrainer as any)._attackRatio.attackerDefenderDistribution = function() {
			return [1, 1];
		};
		let coordinator = new MainCoordinator(mainTrainer);
		coordinator.run();

		let attackerRobot = mainTrainer._messaging.receive(MessageType.attackerFlag).keys().next().value;
		let defenderRobot = mainTrainer._messaging.receive(MessageType.defenderFlag).keys().next().value;
		let pools = (coordinator as any)._pools;
		let attackerAgent = getAgentForRobot(pools.attack, attackerRobot, "Attack");
		let defenderAgent = getAgentForRobot(pools.defense, defenderRobot, "Defense");

		let [defenderBefore, attackerBefore] = [defenderRobot, attackerRobot];
		attackerAgent._messaging.sendToTrainer(MessageType.poolChangeRequest, "defender");
		coordinator.run();

		attackerRobot = mainTrainer._messaging.receive(MessageType.attackerFlag).keys().next().value;
		defenderRobot = mainTrainer._messaging.receive(MessageType.defenderFlag).keys().next().value;
		this.assert_eq(attackerRobot, defenderBefore);
		this.assert_eq(defenderRobot, attackerBefore);
		attackerAgent = getAgentForRobot(pools.attack, attackerRobot, "Attack");
		defenderAgent = getAgentForRobot(pools.defense, defenderRobot, "Defense");

		[defenderBefore, attackerBefore] = [defenderRobot, attackerRobot];
		defenderAgent._messaging.sendToTrainer(MessageType.poolChangeRequest, "attacker");
		coordinator.run();

		attackerRobot = mainTrainer._messaging.receive(MessageType.attackerFlag).keys().next().value;
		defenderRobot = mainTrainer._messaging.receive(MessageType.defenderFlag).keys().next().value;
		this.assert_eq(attackerRobot, defenderBefore);
		this.assert_eq(defenderRobot, attackerBefore);
		attackerAgent = getAgentForRobot(pools.attack, attackerRobot, "Attack");
		defenderAgent = getAgentForRobot(pools.defense, defenderRobot, "Defense");

		attackerAgent._messaging.sendToTrainer(MessageType.poolChangeRequest, "defender");
		defenderAgent._messaging.sendToTrainer(MessageType.poolChangeRequest, "attacker");
		[defenderBefore, attackerBefore] = [defenderRobot, attackerRobot];
		coordinator.run();

		attackerRobot = mainTrainer._messaging.receive(MessageType.attackerFlag).keys().next().value;
		defenderRobot = mainTrainer._messaging.receive(MessageType.defenderFlag).keys().next().value;
		this.assert_eq(attackerRobot, defenderBefore);
		this.assert_eq(defenderRobot, attackerBefore);
		attackerAgent = getAgentForRobot(pools.attack, attackerRobot, "Attack");
		defenderAgent = getAgentForRobot(pools.defense, defenderRobot, "Defense");

		(World as any).FriendlyRobotsAll = allFriendlyRobotsOrig;
		(World as any).RefereeState = refereeStateOrig;
		(mainTrainer as any)._attackRatio.attackerDefenderDistribution = mainTrainerAttackerDefenderDistribution;
	}
}
export let testClass = GladosPools;
