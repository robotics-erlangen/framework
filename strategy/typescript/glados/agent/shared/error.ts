import * as World from "base/world";
import {log} from "base/globals";
import * as Referee from "base/referee";
import {Behavior} from "glados/agent/base/behavior";
import {Error as ErrorTask} from "glados/task/shared/error";
import * as ErrorObserver from "glados/observer/error";
import {Task} from "glados/task/base";

const ERROR_TOLERANCE_PER_SEC = 3; // <- [0.5,1]
const EXCHANGE_ERROR_ROBOTS = false;
const EXCHANGE_LOW_BAT_ROBOTS = false;
const EXCHANGE_LOW_BAT_DURING_GAME = false;
const EXCHANGE_ERROR_ROBOTS_SPEED = false;

export class Error extends Behavior {
	check (): boolean {
		let errorTable = ErrorObserver.getErrorTable(this._robot);
		if (this._active && World.RefereeState === "Stop") {
			return true;
		} else if (this._active && ErrorObserver.getSpeedErrorCount(this._robot) > 100) {
			return true;
		} else if (ErrorObserver.getSpeedErrorCount(this._robot) >= 300 && this._robot != World.FriendlyKeeper) {
			return EXCHANGE_ERROR_ROBOTS_SPEED;
		} else if (ErrorObserver.getAverageBatterySate(this._robot)< 0.11 && this._robot != World.FriendlyKeeper) {
			return EXCHANGE_LOW_BAT_DURING_GAME;
		} else if (ErrorObserver.getAverageBatterySate(this._robot)< 0.20
			 &&  World.RefereeState == "Stop") {
			if (this._robot == World.FriendlyKeeper) {
				if (Referee.lastStateChangeTime() == World.Time) {
					log("keeper " +  this.errorMsg());
				}
				return false;
			}
			return EXCHANGE_LOW_BAT_ROBOTS
		} else if (errorTable == undefined) {
			return false;
		} else if (this._robot == World.FriendlyKeeper) {
			if (Referee.lastStateChangeTime() == World.Time) {
				log("keeper "  +  this.errorMsg());
			}
			return false;
		}
		let gameTimespan = World.Time - ErrorObserver.getLastStopTime();

		for (let [k, v] of Object.entries(errorTable)) {
			if (gameTimespan > 2 && v > ERROR_TOLERANCE_PER_SEC * gameTimespan
					 &&  k != "temperature" && k!="main_sensor_error") {
				if (World.RefereeState == "Stop") {
					//log(this._robot.id .. " ////////   " .. k ..  "  //////////////  " .. v)
					return EXCHANGE_ERROR_ROBOTS;
				}
			}
		}
		return false;
	}

	start () {
		log(this.errorMsg());
		this._active = true;
	}

	_stop () {
		this._active = false;
	}

	errorMsg () {
		let out = String(this._robot.id)  +  ": ";
		let msgParts: string[] = [];
		let errorData = ErrorObserver.getErrorTable(this._robot);
		out = out  +  "battery: " + String(ErrorObserver.getAverageBatterySate(this._robot))  + " ";
		if (errorData == undefined) {
			return out
		}
		if (errorData.motor_1_error) {
			msgParts.push("motor 1 error" + String(errorData.motor_1_error))
		}
		if (errorData.motor_2_error) {
			msgParts.push("motor 2 error" + String(errorData.motor_2_error))
		}
		if (errorData.motor_3_error) {
			msgParts.push("motor 3 error" + String(errorData.motor_3_error))
		}
		if (errorData.motor_4_error) {
			msgParts.push("motor 4 error" + String(errorData.motor_4_error))
		}
		if (errorData.dribbler_error) {
			msgParts.push("dribber error" + String(errorData.dribbler_error))
		}
		if (errorData.kicker_error) {
			msgParts.push("kicker error" + String(errorData.kicker_error))
		}
		if (errorData.motorOverheatedError) {
			msgParts.push("motor overheat" + String(errorData.motorOverheatedError))
		}
		if (errorData.motor_encoder_error) {
			msgParts.push("motor encoder" + String(errorData.motor_encoder_error))
		}
		if (errorData.main_sensor_error) {
			msgParts.push("main sensor" + String(errorData.main_sensor_error))
		}
		if (errorData.kicker_beak_beam_error) {
			msgParts.push("kicker beam error" + String(errorData.kicker_beak_beam_error))
		}
		if (errorData.temperature) {
			msgParts.push("temperature: " + String(errorData.temperature))
		}
		return out + msgParts.toString();
	}


	_updateTask (): [typeof Task] {
		//local errorFound = next(ErrorObserver.getErrorTable(this._robot)) ~= nil
		//if errorFound and World.Time == ErrorObserver.getLastRefChange() then
		//	log(this.errorMsg())
		//end
		return [ErrorTask];
	}
}