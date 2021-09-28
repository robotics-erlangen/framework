import * as debug from "base/debug";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, MoveParameters } from "glados/group/move/base";
import { HardwareChallengeBase } from "glados/group/move/hardwarechallenges/base";
import * as Scenarios from "glados/group/move/hardwarechallenges/scenarios";
import * as BallObserver from "glados/observer/ball";
import { DribbleToPos } from "glados/task/shared/dribbletopos";
import { Obstacle } from "glados/task/shared/movetopos";

export class DribbleChallenge extends HardwareChallengeBase {
	protected challengeNumber: 1 | 2 | 3 | 4 | undefined = 3;

	private static gates: [Position, Vector][] = [];
	private static currentGateIndex: number = 0;
	private static moveToMidwayPos: boolean = true;
	private static nextGateImminent: boolean = false;
	private static currentTargetPosition: Position = new Vector(0, 0);
	private customObstacles: Obstacle[];
	private static lastGate: number = -1;
	private left: boolean = false;

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging, Scenarios.challenge3);

		for (let i = this.opponentTransforms.length - 1; i > 0; --i) {
			const posA = this.opponentTransforms[i].pos;
			const posB = this.opponentTransforms[i - 1].pos;
			const relativePosition = posB - posA;
			DribbleChallenge.gates[this.opponentTransforms.length - i - 1] = [posA, relativePosition];
		}

		this.customObstacles = this.opponentTransforms.map((transform) => {
			let name: string = "dribbleObstacleY" + transform.pos.x;
			return {
				type: "circle",
				x: transform.pos.x,
				y: transform.pos.y,
				radius: this._robots[0].radius * 1.1,
				name: name
			};
		});

		DribbleChallenge.currentTargetPosition = DribbleChallenge.moveToMidwayPos ? this.getMidwayPosition() : this.getCurrentGatePosition();
	}

	private getCurrentGatePosition(): Position {
		const currentGate = DribbleChallenge.gates[DribbleChallenge.currentGateIndex];
		return currentGate[0] + 0.5 * currentGate[1];
	}

	private getNextGateIndex(): number {
		// if currentGate is the last gate return currentGate as the nextGate
		return Math.min(DribbleChallenge.gates.length - 1, DribbleChallenge.currentGateIndex + 1);
	}

	private getNextGatePosition(): Position {
		const nextGate = DribbleChallenge.gates[this.getNextGateIndex()];
		return nextGate[0] + 0.5 * nextGate[1];
	}

	private getMidwayPosition(): Position {
		const currentGate = DribbleChallenge.gates[DribbleChallenge.currentGateIndex];
		const yOffset = 0.5;
		if (this.left) {
			return currentGate[0] + new Vector(0, -yOffset);
		} else {
			return currentGate[0] + new Vector(0, yOffset);
		}
	}

	private getNextMidwayPosition(): Position {
		const currentGate = DribbleChallenge.gates[this.getNextGateIndex()];
		const yOffset = 0.5;
		if (this.left) {
			return currentGate[0] + new Vector(0, -yOffset);
		} else {
			return currentGate[0] + new Vector(0, yOffset);
		}
	}

	private getBallPosition(): Position {
		if (World.Ball.isPositionValid()) {
			return BallObserver.getRealisticBallPos();
		} else {
			return this._robots[0].pos + Vector.fromAngle(this._robots[0].dir) * (this._robots[0].radius - World.Ball.radius);
		}
	}

	private checkIfGatePassed(): boolean {
		const gatePosition = this.getCurrentGatePosition();
		let ballPosition: Position = this.getBallPosition();
		const currentGate = DribbleChallenge.gates[DribbleChallenge.currentGateIndex];
		const betweenObstacles = ballPosition.x > currentGate[0].x && ballPosition.x < (currentGate[0] + currentGate[1]).x;
		const crossingThreshold = World.Ball.radius + 0.05;
		let crossed = false;
		if (this.left) {
			crossed = ballPosition.y - gatePosition.y < -crossingThreshold;
		} else {
			crossed = ballPosition.y - gatePosition.y > crossingThreshold;
		}
		return betweenObstacles && crossed;
	}

	// returns true if position changed
	private updateTargetPosition(): boolean {
		if (DribbleChallenge.moveToMidwayPos) {
			if (this._robots[0].pos.x - DribbleChallenge.currentTargetPosition.x > -(0.01 + this._robots[0].radius)) {
				DribbleChallenge.moveToMidwayPos = false;
				DribbleChallenge.currentTargetPosition = this.getCurrentGatePosition();

				return true;
			}
		} else {
			if ((DribbleChallenge.currentTargetPosition - this._robots[0].pos).length() < 0.1) {
				DribbleChallenge.moveToMidwayPos = true;
				DribbleChallenge.currentTargetPosition = this.getNextMidwayPosition();

				return true;
			}
		}
		return false;
	}

	public challengeSpecificUpdateTask(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		let restart = false;

		if (this.checkIfGatePassed()) {
			DribbleChallenge.currentGateIndex = this.getNextGateIndex();
			restart = true;
		}

		if (this.left && this.getBallPosition().y - this.getCurrentGatePosition().y < -0.1) {
			this.left = false;
		} else if (!this.left && this.getBallPosition().y - this.getCurrentGatePosition().y > 0.1) {
			this.left = true;
		}

		amun.log("current gate", DribbleChallenge.currentGateIndex);

		restart = restart || this.updateTargetPosition();

		taskAssignments[this._robots[0]] = Assignment.create({
			class: DribbleToPos,
			params: [{pos: DribbleChallenge.currentTargetPosition, customObstacles: this.customObstacles, useCMA: true}],
			restart: restart
		});

		return {assignments: taskAssignments};
	}
}
