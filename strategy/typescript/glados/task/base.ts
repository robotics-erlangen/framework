import {FriendlyRobot} from "base/robot";
import {Position} from "base/vector";
import {MessageBox} from "glados/control/messaging";

type MainAttackerParameters = [Position, number];

export interface Agent {
	isAgent: ()=> boolean;
	_messaging: MessageBox;
	robot:()=> FriendlyRobot;
};

export abstract class Task {
	_agent: {isAgent(): boolean};
	_robot: FriendlyRobot;
	_messaging: MessageBox;
	_mainAttackerParameters: MainAttackerParameters | undefined;


	constructor (agent: Agent) {
		this._agent = agent;
		this._robot = agent.robot();
		this._messaging = agent._messaging;
		this.clearMainAttackerParameters();
	}

	robot () {
		return this._robot
	}

	abstract run (): void;

	// use for type stubs, to avoid cyclic imports
	isTask(): boolean {
		return true;
	}

	clearMainAttackerParameters () {
		this._mainAttackerParameters = undefined;
	}

	setMainAttackerParameters (target: Position, endSpeedLength: number) {
		this._mainAttackerParameters = [ target, endSpeedLength ];
	}

	mainAttackerParameters (): MainAttackerParameters | undefined {
		return this._mainAttackerParameters;
	}
}