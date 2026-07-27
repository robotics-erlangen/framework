/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
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

import { log } from "base/amun";
import * as Referee from "base/referee";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import * as ErrorObserver from "glados/observer/error";
import * as ObserverReferee from "glados/observer/referee";
import { Error as ErrorTask } from "glados/task/shared/error";

const ERROR_TOLERANCE_PER_SEC = 3; // <- [0.5,1]
const EXCHANGE_ERROR_ROBOTS = false;
const EXCHANGE_LOW_BAT_ROBOTS = false;
const EXCHANGE_LOW_BAT_DURING_GAME = false;
const EXCHANGE_ERROR_ROBOTS_SPEED = false;

export class Error extends Behavior {
	public check(): Behavior | undefined {
		return undefined;
		/* let errorTable = ErrorObserver.getErrorTable(this._robot);
		if (this._active && World.RefereeState === "Stop") {
			return this;
		} else if (this._active && ErrorObserver.getSpeedErrorCount(this._robot) > 100) {
			return this;
		} else if (ErrorObserver.getSpeedErrorCount(this._robot) >= 300 && this._robot !== World.FriendlyKeeper) {
			return EXCHANGE_ERROR_ROBOTS_SPEED ? this : undefined;
		} else if (ErrorObserver.getAverageBatterySate(this._robot) < 0.11 && this._robot !== World.FriendlyKeeper) {
			return EXCHANGE_LOW_BAT_DURING_GAME ? this : undefined;
		} else if (ErrorObserver.getAverageBatterySate(this._robot) < 0.20
			&&  World.RefereeState === "Stop") {
			if (this._robot === World.FriendlyKeeper) {
				if (Referee.lastStateChangeTime() === World.Time) {
					log("keeper " +  this._errorMsg());
				}
				return undefined;
			}
			return EXCHANGE_LOW_BAT_ROBOTS ? this : undefined;
		} else if (errorTable == undefined) {
			return undefined;
		} else if (this._robot === World.FriendlyKeeper) {
			if (Referee.lastStateChangeTime() === World.Time) {
				log("keeper "  +  this._errorMsg());
			}
			return undefined;
		}
		let gameTimespan = World.Time - ObserverReferee.getLastTimeInState("Stop");

		for (let [k, v] of Object.entries(errorTable)) {
			if (gameTimespan > 2 && v > ERROR_TOLERANCE_PER_SEC * gameTimespan
					&&  k !== "temperature" && k !== "main_sensor_error") {
				if (World.RefereeState === "Stop") {
					// log(this._robot.id .. " ////////   " .. k ..  "  //////////////  " .. v)
					return EXCHANGE_ERROR_ROBOTS ? this : undefined;
				}
			}
		}
		return undefined; */
	}

	public start() {
		log(this._errorMsg());
		this._active = true;
	}

	protected _stop() {
		this._active = false;
	}

	private _errorMsg() {
		let out = `${this._robot.id}: `;
		let msgParts: string[] = [];
		let errorData = ErrorObserver.getErrorTable(this._robot);
		out = `${out}battery: ${ErrorObserver.getAverageBatterySate(this._robot)} `;
		if (errorData == undefined) {
			return out;
		}
		if (errorData.motor_1_error) {
			msgParts.push(`motor 1 error${errorData.motor_1_error}`);
		}
		if (errorData.motor_2_error) {
			msgParts.push(`motor 2 error${errorData.motor_2_error}`);
		}
		if (errorData.motor_3_error) {
			msgParts.push(`motor 3 error${errorData.motor_3_error}`);
		}
		if (errorData.motor_4_error) {
			msgParts.push(`motor 4 error${errorData.motor_4_error}`);
		}
		if (errorData.dribbler_error) {
			msgParts.push(`dribber error${errorData.dribbler_error}`);
		}
		if (errorData.kicker_error) {
			msgParts.push(`kicker error${errorData.kicker_error}`);
		}
		if (errorData.motorOverheatedError) {
			msgParts.push(`motor overheat${errorData.motorOverheatedError}`);
		}
		if (errorData.motor_encoder_error) {
			msgParts.push(`motor encoder${errorData.motor_encoder_error}`);
		}
		if (errorData.main_sensor_error) {
			msgParts.push(`main sensor${errorData.main_sensor_error}`);
		}
		if (errorData.kicker_beak_beam_error) {
			msgParts.push(`kicker beam error${errorData.kicker_beak_beam_error}`);
		}
		if (errorData.temperature) {
			msgParts.push(`temperature: ${errorData.temperature}`);
		}
		return out + msgParts.toString();
	}


	protected _updateTask(): TaskAssignment<typeof ErrorTask> {
		// local errorFound = next(ErrorObserver.getErrorTable(this._robot)) ~= nil
		// if errorFound and World.Time == ObserverReferee.getLastStateChange() then
		// 	log(this._errorMsg())
		// end
		return [ErrorTask];
	}
}
