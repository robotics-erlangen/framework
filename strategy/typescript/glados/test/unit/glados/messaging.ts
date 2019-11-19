import * as pb from "base/protobuf";
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";

import { MessageType, Messaging } from "glados/control/messaging";
import { UnitTest } from "glados/test/unit/unittest";
import { LeveledRating } from "glados/util/rating";

function robotStub(id: number): FriendlyRobot {
	return new FriendlyRobot(<pb.robot.Specs> {id: id});
}

function agentStub(robotStub: FriendlyRobot) {
	let agent: {robot(): FriendlyRobot, isAgent(): boolean} = {
		robot: function() { return robotStub; },
		isAgent: function() { return true; }
	};
	return agent;
}

export class BaseMessaging extends UnitTest {
	constructor() {
		super();
		this.addTest("all", this.testAll);
	}

	private testAll() {
		let messaging = new Messaging();
		let dummyMsg = 2;
		let agent1 = agentStub(robotStub(1));
		let agent1Box = messaging.registerAgent(agent1);
		let agent2 = agentStub(robotStub(2));
		let agent2Box = messaging.registerAgent(agent2);
		let agent3 = agentStub(robotStub(3));
		let agent3Box = messaging.registerAgent(agent3);
		let trainerBox = messaging.registerTrainer();
		this.assert_error(function() { messaging.registerTrainer(); });

		agent1Box.sendBroadcast(MessageType.moveDest, new Vector(0, 0));
		messaging.deliverMessages();
		this.assert_undefined(agent1Box.receive(MessageType.moveDest).get(agent1.robot()));

		// agent1send(agent2.robot(), "moveDest", new Vector(0,0))
		agent3Box.sendBroadcast(MessageType.moveDest, new Vector(0, 0));
		messaging.deliverMessages();
		agent2 = agentStub(agent2.robot());
		let agent2inbox;
		agent2Box = messaging.registerAgent(agent2);
		this.assert_undefined(agent2Box.receive(MessageType.moveDest).get(agent1.robot()));
		this.assert_not_undefined(agent2Box.receive(MessageType.moveDest).get(agent3.robot()));

		let rating2 = new LeveledRating(MessageType.mainAttacker);
		rating2.setRating(0,1);
		let rating1 = new LeveledRating(MessageType.mainAttacker);
		rating1.setRating(0,0.5);
		agent2Box.sendToTrainerRepeated(MessageType.exclusiveRole, [MessageType.mainAttacker, rating2]);
		agent1Box.sendToTrainerRepeated(MessageType.exclusiveRole, [MessageType.mainAttacker, rating1]);

		// note that trainer can receive without calling deliverMessages() before
		let applications = trainerBox.receiveRepeated(MessageType.exclusiveRole);
		this.assert_equal(applications.get(agent1.robot())![0][1]._ratingArray[0], 0.5);

		trainerBox.sendBroadcast(MessageType.mainAttacker, agent2.robot());
		this.assert_equal(trainerBox.receiveTrainer(MessageType.mainAttacker), agent2.robot());
		messaging.deliverMessages();
		this.assert_equal(agent1Box.receiveTrainer(MessageType.mainAttacker), agent2.robot());

		agent1Box.sendToTrainerRepeated(MessageType.groupApplication, { name: "centerback", payload: ["payload_A"] });
		agent1Box.sendToTrainerRepeated(MessageType.groupApplication, { name: "moves", payload: ["payload_B"] });
		// let groupApplications = trainerInbox.groupApplication();
		let groupApplications = trainerBox.receiveRepeated(MessageType.groupApplication);
		this.assert_equal(groupApplications.get(agent1.robot())!.length, 2);
		this.assert_deep_equal(groupApplications.get(agent1.robot())![0].payload, ["payload_A"]);
		this.assert_deep_equal(groupApplications.get(agent1.robot())![1].payload, ["payload_B"]);
	}
}
export let testClass = BaseMessaging;
