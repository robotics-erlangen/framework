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
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import { RobotLike } from "glados/observer/physics";
import { Group } from "glados/trainer/groups";
import { assignRobotsToZones, Boundaries, getRandomPosition, Zone, zoneToPolygon } from "glados/util/zone";

export class Dummy implements Group {
	public readonly name = "dummy";
	private _lastNumberOfParticipants: number = 0;
	private _lastRobotZoneMap: Map<Zone, FriendlyRobot> | undefined = undefined;
	private _lastRefereeStateWasPenalty = false;

	public run(messaging: MessageBox, messages: Map<FriendlyRobot, undefined>) {
		let robots = Array.from(messages.keys());
		let numberOfParticipants = robots.length;

		if (numberOfParticipants !== this._lastNumberOfParticipants || !this._lastRobotZoneMap ||
            World.RefereeState.includes("Penalty") !== this._lastRefereeStateWasPenalty) {

			if (robots.length === 0) {
				return;
			}

			let zones = this.getDummyZones(robots);

			let robotPosMap = new Map<FriendlyRobot, RobotLike>();
			for (let robot of robots) {
				robotPosMap[robot] = robot;
			}
			this._lastRobotZoneMap = assignRobotsToZones(robotPosMap, zones);
			this._lastNumberOfParticipants = numberOfParticipants;
		}

		for (let [zone, robot] of this._lastRobotZoneMap.entries()) {
			const color = World.TeamIsBlue ? vis.colors.skyBlue : vis.colors.gold;
			vis.addPolygon("g/Dummy zones", zoneToPolygon(zone), color);
			messaging.send(MessageType.dummyZone, robot, zone);
		}

		if (World.RefereeState.includes("Penalty") !== this._lastRefereeStateWasPenalty) {
			this._lastRefereeStateWasPenalty = World.RefereeState.includes("Penalty");
		}
	}


	public getDummyZones(participants: FriendlyRobot[]): Zone[] {
	    let numberOfParticipants = participants.length;
	    let zones: Zone[] = [];

	    const upperleft = -World.Geometry.FieldWidthHalf;
	    const upperright = -World.Geometry.DefenseWidthHalf;
	    const lowerleft = World.Geometry.DefenseWidthHalf;
	    const lowerright = World.Geometry.FieldWidthHalf;

	    const subdivisions = Math.floor(numberOfParticipants / 2);

	    let start = World.RefereeState.includes("Penalty") ? World.Geometry.PenaltyLine : 0;

	    if (numberOfParticipants === 1) {
	        const bounds: Boundaries = {
	            left: lowerleft,
	            right: lowerright,
	            top: World.Geometry.FieldHeightHalf,
	            bottom: start
	        };
	        zones.push({ boundaries: bounds, defaultPos: getRandomPosition(bounds) });

		} else if (numberOfParticipants % 2 === 0) {
		    for (let i = 1; i <= subdivisions; i++) {
	            const lowerbounds: Boundaries = {
	                left: lowerleft,
	                right: lowerright,
	                top: start + ((World.Geometry.FieldHeightHalf - start) / subdivisions) * i,
	                bottom: start + ((World.Geometry.FieldHeightHalf - start) / subdivisions) * (i - 1)
	            };
	            zones.push({ boundaries: lowerbounds, defaultPos: getRandomPosition(lowerbounds) });

	            const upperbounds: Boundaries = {
	                left: upperleft,
	                right: upperright,
	                top: start + ((World.Geometry.FieldHeightHalf - start) / subdivisions) * i,
	                bottom: start + ((World.Geometry.FieldHeightHalf - start) / subdivisions) * (i - 1)
	            };
	            zones.push({ boundaries: upperbounds, defaultPos: getRandomPosition(upperbounds) });
	        }
	    } else {
	        for (let i = 1; i <= subdivisions; i++) {
	            const lowerbounds: Boundaries = {
	                left: lowerleft,
	                right: lowerright,
	                top: start + ((World.Geometry.FieldHeightHalf - start) / subdivisions) * i,
	                bottom: start + ((World.Geometry.FieldHeightHalf - start) / subdivisions) * (i - 1)
	            };
	            zones.push({ boundaries: lowerbounds, defaultPos: getRandomPosition(lowerbounds) });
	        }

	        for (let i = 1; i <= subdivisions + 1; i++) {
	            const upperbounds: Boundaries = {
	                left: upperleft,
	                right: upperright,
	                top: start + ((World.Geometry.FieldHeightHalf - start) / (subdivisions + 1)) * i,
	                bottom: start + ((World.Geometry.FieldHeightHalf - start) / (subdivisions + 1)) * (i - 1)
	            };
	            zones.push({ boundaries: upperbounds, defaultPos: getRandomPosition(upperbounds) });
	        }
	    }

	    return zones;
	}
}
