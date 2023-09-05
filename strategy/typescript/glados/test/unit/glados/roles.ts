import { _setIsBlue } from "base/coordinates";
import * as pb from "base/protobuf";
import { FriendlyRobot } from "base/robot";

import { MessageType, Messaging } from "glados/control/messaging";
import { UnitTest } from "glados/test/unit/unittest";
import { Roles } from "glados/trainer/roles";
import { LeveledRating } from "glados/util/rating";

function robotStub(id: number): FriendlyRobot {
	return new FriendlyRobot(<pb.robot.Specs> { id: id });
}

function agentStub(robotStub: FriendlyRobot) {
	let agent: { robot(): FriendlyRobot; isAgent(): boolean } = {
		robot: function() { return robotStub; },
		isAgent: function() { return true; }
	};
	return agent;
}

export class GladosRoles extends UnitTest {
	constructor() {
		super();
		this.addTest("hysteresis", this.testHysteresis);
	}

	private testHysteresis() {
		// so that the Coordinates module works
		_setIsBlue(true);

		let messaging = new Messaging();
		let dummyMsg = 2;
		let agent1 = agentStub(robotStub(1));
		let agent1Box = messaging.registerAgent(agent1);
		let agent2 = agentStub(robotStub(2));
		let agent2Box = messaging.registerAgent(agent2);

		let trainerBox = messaging.registerTrainer();

		let roles = new Roles(trainerBox);

		const agent1Value = 0.5;
		const agent2Values = [0.4, 0.51, 0.49, 0.5, 0.51, 0.51, 0.51, 0.51, 0.51];

		for (let agent2Value of agent2Values) {

			let rating1 = new LeveledRating(MessageType.mainAttacker);
			rating1.setRating(0, agent1Value);
			agent1Box.sendToTrainerRepeated(MessageType.exclusiveRole, [MessageType.mainAttacker, rating1]);

			let rating2 = new LeveledRating(MessageType.mainAttacker);
			rating2.setRating(0, agent2Value);
			agent2Box.sendToTrainerRepeated(MessageType.exclusiveRole, [MessageType.mainAttacker, rating2]);

			roles._chooseExclusiveRoles();

			messaging.deliverMessages();

			this.assert_eq(agent1Box.receiveTrainer(MessageType.mainAttacker), agent1.robot());
		}
	}
}
export let testClass = GladosRoles;
