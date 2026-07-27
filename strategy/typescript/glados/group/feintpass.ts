/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Group } from "glados/trainer/groups";
import { PassInfo } from "glados/util/attack";

export interface FeintPassTarget {
	passRobot: FriendlyRobot;
	passInfo: PassInfo;
	feintPos: Position;
}

export function feintPassTargetEquals(a: FeintPassTarget | undefined, b: FeintPassTarget | undefined) {
	if (a !== undefined && b !== undefined) {
		return (
			a.passRobot === b.passRobot &&
			a.passInfo.target === b.passInfo.target &&
			a.feintPos.distanceToSq(b.feintPos) < a.passRobot.radius * a.passRobot.radius
		);
	}

	if (a === undefined && b === undefined) {
		return true;
	}

	return false;
}

export class FeintPass implements Group {
	public readonly name = "feintpass";
	private _lastRobotFeintPosMap: Map<FriendlyRobot, FeintPassTarget> = new Map<FriendlyRobot, FeintPassTarget>();
	private _lastMainAttacker: FriendlyRobot | undefined;

	public run(messaging: MessageBox, messages: Map<FriendlyRobot, FeintPassTarget>) {
		let robots = Array.from(messages.keys());

		let robotFeintPosMap = new Map<FriendlyRobot, FeintPassTarget>();

		// If the MA changed, we don't want to keep assignments in all cases
		let mainAttacker = messaging.receiveTrainer(MessageType.mainAttacker);
		if (mainAttacker !== this._lastMainAttacker) {
			this._lastRobotFeintPosMap = new Map<FriendlyRobot, FeintPassTarget>();
		}

		// Keep robots who applied for the same FeintPosition with higher priority
		let occupiedFeintPassTargets: FeintPassTarget[] = new Array(robots.length);
		let index = 0;
		for (let robot of this._lastRobotFeintPosMap.keys()) {
			if (robots.includes(robot)) {
				let desiredFeintPos = messages.get(robot)!;
				if (feintPassTargetEquals(this._lastRobotFeintPosMap.get(robot), desiredFeintPos)) {
					robotFeintPosMap.set(robot, desiredFeintPos);
					occupiedFeintPassTargets[index] = desiredFeintPos;
				}
			}
			index = index + 1;
		}

		// Add robots which want to participate
		for (let robot of robots) {
			let desiredFeintPos = messages.get(robot)!;
			// Check if the desired position is already feinted last frame and the robot reapplied
			if (occupiedFeintPassTargets.find((element) => (feintPassTargetEquals(element, desiredFeintPos))) &&
				Array.from(robotFeintPosMap.keys()).find((element) => (feintPassTargetEquals(this._lastRobotFeintPosMap[element], desiredFeintPos)))
			) {
				continue;
			} else {
				// Check if a different robot already applied for this position this frame
				if (Array.from(robotFeintPosMap.values()).find((element) => (feintPassTargetEquals(element, desiredFeintPos)))) {
					let otherRobot = Array.from(robotFeintPosMap.keys()).find(
						(element) => feintPassTargetEquals(robotFeintPosMap.get(element), desiredFeintPos)
					)!;
					// Prefer Dummys for FeintPass
					if (otherRobot.canDribble && otherRobot.canShoot && (!robot.canDribble || !robot.canShoot)) {
						robotFeintPosMap.delete(otherRobot);
						robotFeintPosMap.set(robot, desiredFeintPos);
					}
				} else {
					robotFeintPosMap.set(robot, desiredFeintPos);
				}
			}
		}

		this._lastRobotFeintPosMap = robotFeintPosMap;
		this._lastMainAttacker = mainAttacker;

		for (let robot of robotFeintPosMap.keys()) {
			messaging.send(MessageType.feintPassTarget, robot, robotFeintPosMap.get(robot)!);
		}
	}
}
