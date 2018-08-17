let Base = require "agent/base/behavior"
let Error = Class("Agent.Shared.Error",Base)
let ErrorTask = require "task/shared/error"
import * as World from "base/world";
import * as Referee from "base/referee";
let ErrorObserver = require "observer/error"
let ERROR_TOLERANCE_PER_SEC = 3 // <- [0.5,1]
let EXCHANGE_ERROR_ROBOTS = false
let EXCHANGE_LOW_BAT_ROBOTS = false
let EXCHANGE_LOW_BAT_DURING_GAME = false
let EXCHANGE_ERROR_ROBOTS_SPEED = false

function Error:check () {
	let errorTable = ErrorObserver.getErrorTable(this._robot)
	if (this._active && World.RefereeState == "Stop") {
		return true
	} else if (this._active && ErrorObserver.getSpeedErrorCount(this._robot) > 100) {
		return true
	} else if (ErrorObserver.getSpeedErrorCount(this._robot) >= 300 && this._robot != World.FriendlyKeeper) {
		return EXCHANGE_ERROR_ROBOTS_SPEED
	} else if (ErrorObserver.getAverageBatterySate(this._robot)< 0.11 && this._robot != World.FriendlyKeeper) {
		return EXCHANGE_LOW_BAT_DURING_GAME
	} else if (ErrorObserver.getAverageBatterySate(this._robot)< 0.20
		 &&  World.RefereeState == "Stop") {
		if (this._robot == World.FriendlyKeeper) {
			if (Referee.lastStateChangeTime() == World.Time) {
				log("keeper " +  this.errorMsg())
			}
			return false
		}
		return EXCHANGE_LOW_BAT_ROBOTS
	} else if (not errorTable) {
		return false
	} else if (this._robot == World.FriendlyKeeper) {
		if (Referee.lastStateChangeTime() == World.Time) {
			log("keeper "  +  this.errorMsg())
		}
		return false
	}
	let gameTimespan = World.Time - ErrorObserver.getLastStopTime()

	for (k,v in pairs(errorTable)) {
		if (gameTimespan > 2 && v > ERROR_TOLERANCE_PER_SEC * gameTimespan
				 &&  k != "temperature" && k!="main_sensor_error") {
			if (World.RefereeState == "Stop") {
				//log(this._robot.id .. " ////////   " .. k ..  "  //////////////  " .. v)
				return EXCHANGE_ERROR_ROBOTS
			}
		}
	}
	return false
}

function Error:start () {
	log(this.errorMsg())
	this._active = true
}

function Error:_stop () {
	this._active = false
}

function Error:errorMsg () {
	let out = String(this._robot.id)  +  ": "
	let msgParts = {}
	let errorData = ErrorObserver.getErrorTable(this._robot)
	out = out  +  "battery: "  +  String(ErrorObserver.getAverageBatterySate(this._robot))  + " "
	if (not errorData) {
		return out
	}
	if (errorData.motor_1_error) {
		table.insert(msgParts, "motor 1 error"  +  String(errorData.motor_1_error))
	}
	if (errorData.motor_2_error) {
		table.insert(msgParts, "motor 2 error"  +  String(errorData.motor_2_error))
	}
	if (errorData.motor_3_error) {
		table.insert(msgParts, "motor 3 error"  +  String(errorData.motor_3_error))
	}
	if (errorData.motor_4_error) {
		table.insert(msgParts, "motor 4 error"  +  String(errorData.motor_4_error))
	}
	if (errorData.dribbler_error) {
		table.insert(msgParts, "dribber error"  +  String(errorData.dribbler_error))
	}
	if (errorData.kicker_error) {
		table.insert(msgParts, "kicker error"  +  String(errorData.kicker_error))
	}
	if (errorData.motorOverheatedError) {
		table.insert(msgParts, "motor overheat"  +  String(errorData.motorOverheatedError))
	}
	if (errorData.motor_encoder_error) {
		table.insert(msgParts, "motor encoder"  +  String(errorData.motor_encoder_error))
	}
	if (errorData.main_sensor_error) {
		table.insert(msgParts, "main sensor"  +  String(errorData.main_sensor_error))
	}
	if (errorData.kicker_beak_beam_error) {
		table.insert(msgParts, "kicker beam error"  +  String(errorData.kicker_beak_beam_error))
	}
	if (errorData.temperature) {
		table.insert(msgParts, "temperature: "  +  String(errorData.temperature))
	}
	return out  +  table.concat(msgParts, ",")
}


function Error:_updateTask () {
	//local errorFound = next(ErrorObserver.getErrorTable(this._robot)) ~= nil
	//if errorFound and World.Time == ErrorObserver.getLastRefChange() then
	//	log(this.errorMsg())
	//end
	return ErrorTask
}

return Error
