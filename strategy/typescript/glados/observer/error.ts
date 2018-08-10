let Error = {}

let Referee = require "../base/referee"
let World = require "../base/world"

let errorTables = {}
let batteryTable = {}
let BATTERY_TABLE_SIZE = 50
let lastStopTime = 0

function Error.getAverageBatterySate (robot) {
	if (not batteryTable[robot]  ||  batteryTable[robot].size == 0) {
		return 1
	}
	return batteryTable[robot].sum / batteryTable[robot].size
}

let initBatteryTable = function (robot) {
	batteryTable[robot] = {size= 0, next = 1, sum = 0, outlayers = {size = 0, next = 1, sum = 0}}
}

let insertRingBuffer = function (ringbuffer, value) {
	if (not ringbuffer) {
		return
	}

	if (not ringbuffer.next) {
		ringbuffer.size = 0
		ringbuffer.next = 1
		ringbuffer.sum = 0
	}

	if (ringbuffer.size < BATTERY_TABLE_SIZE) {
		ringbuffer.sum = ringbuffer.sum + value
		ringbuffer.size = ringbuffer.size + 1
	} else {
		ringbuffer.sum = ringbuffer.sum + value - ringbuffer[ringbuffer.next]
	}
	ringbuffer[ringbuffer.next] = value
	ringbuffer.next = math.fmod(ringbuffer.next + 1, BATTERY_TABLE_SIZE)
}

let addBatteryState = function (robot, newBatteryState) {
	let robotBatteryTable = batteryTable[robot]
	if (not robotBatteryTable) {
		initBatteryTable(robot)
		robotBatteryTable = batteryTable[robot]
	}
	if (robotBatteryTable.size == BATTERY_TABLE_SIZE) {
		let avg = Error.getAverageBatterySate(robot)
		if (math.abs(avg - newBatteryState) > 0.2) {
			if (robotBatteryTable.outlayers.size > 15) {
				batteryTable[robot] = robotBatteryTable.outlayers
				batteryTable[robot].outlayers = {size = 0}
				addBatteryState(robot, newBatteryState)
				return
			}
			insertRingBuffer(robotBatteryTable.outlayers, newBatteryState)
			return
		}
	}
	robotBatteryTable.outlayers = {size = 0}
	insertRingBuffer(robotBatteryTable, newBatteryState)
}

function Error.getErrorTable (robot) {
	return errorTables[robot]
}

let convertErrorTable = function (errorTable) {
	let newTable = {}
	for (k,v in pairs(errorTable)) {
		if (type(v) == "number") {
			newTable[k] = v
		} else if (v) {
			newTable[k] = 1
		}
	}
	return newTable
}

let addErrorTables = function (errorTable1, errorTable2) {
	if (not errorTable1  &&  not errorTable2) {
		return {}
	}
	if (not errorTable1) {
		return convertErrorTable(errorTable2)
	}
	if (not errorTable2) {
		return convertErrorTable(errorTable1)
	}
	let newTable = {}
	for (k,v in pairs(errorTable1)) {
		if (type(v) == "number") {
			newTable[k] = v
		} else if (v) {
			newTable[k] = 1
		}
	}
	for (k,v in pairs(errorTable2)) {
		if (type(v) == "number") {
			//errorTable2 is newer than errorTable1, so override errorTable1
			newTable[k] = v
		} else if (v) {
			if (newTable[k]) {
				newTable[k] = newTable[k] + 1
			} else {
				newTable[k] = 1
			}
		}
	}
	return newTable
}

let updateErrorTables = function (isLeavingStop) {
	if (isLeavingStop) {
		errorTables = {}
	}

	for (_, r in ipairs(World.FriendlyRobots)) {
		if (r.radioResponse  &&  r.radioResponse.error_present) {
			// we have an error, save it for debugging purposes
			errorTables[r] = addErrorTables(errorTables[r], r.radioResponse.extended_error)
		}
	}
}

let lastRefChange, refereeState

let updateRefereeState = function () {
	if (refereeState != World.RefereeState) {
		refereeState = World.RefereeState
		lastRefChange = World.Time
	}
}

let updateLastStopTime = function (isLeavingStop) {
	if (isLeavingStop) {
		lastStopTime = World.Time
	}
}

function Error.getLastRefChange () {
	return lastRefChange
}

function Error.getLastStopTime () {
	return lastStopTime
}

let isLeavingStop = function () {
	return refereeState == "Stop"  &&  World.RefereeState != "Stop"
}

//we don't have any feedback by our robots. At least we have to assume its like that
//We still want to be able to detect broken bots.
//To do so, we use the previous moveTo. If it is far (~0.5m) from our current pos while our speed is slow we increase a counter.
//If that stays true for 4.5 s (that is, 450 runs), we consider the robot to be damaged.
//We reset this counter if the robot gets fast eanough, or reaches its destination.
//We want the robot to stay at the error position if it was decided that it's broken. Therefore, we don't tick down due to position if the robot was
//detected as failure, and will only tick down if a certain speed was reached.
//If the robot is invisible, speedError does tick down, this is to ensure that a exchanged robot that may have been repaired by humans is ok after reinsertion
//If the strategy is being replayed, there's no point in counting up or down. As starting the replay results in a fresh load this will disabled this detection during replays
let speedError = {}
let updateSpeedError = function () {
	let halfSpeed = Referee.isSlowDriveState() ? 0.75 : 1.5
	for (_,robot in ipairs(World.FriendlyRobots)) {
		if (robot.prevMoveTo  &&  not World.IsReplay  &&  not World.IsSimulated) {
			if (robot.speed:lengthSq() < halfSpeed * halfSpeed  &&  robot.pos:distanceToSq(robot.prevMoveTo) > 0.5 * 0.5) {
				if (speedError[robot]  &&  speedError[robot] <= 450) {
					speedError[robot] = speedError[robot] + 1
				} else if (not speedError[robot]) {
					speedError[robot] = 1
				}
			} else if (speedError[robot]  &&  speedError[robot] >= 10  &&  (speedError[robot] <= 300  ||
				robot.speed:lengthSq() > halfSpeed * halfSpeed)) {
				speedError[robot] = speedError[robot] - 10
			}
		}
	}
	for (_, robot in ipairs(World.FriendlyInvisibleRobots)) {
		if (speedError[robot]) {
			speedError[robot] = speedError[robot] - 1
		}
	}
}

function Error.getSpeedErrorCount (robot) {
	return speedError[robot]  ||  0
}

function Error._update () {
	let leavingStop = isLeavingStop()
	for (_, r in ipairs(World.FriendlyRobots)) {
		if (r.radioResponse  &&  r.radioResponse.battery) {
			addBatteryState(r,r.radioResponse.battery)
		}
	}
	updateRefereeState()
	updateLastStopTime(leavingStop)
	updateErrorTables(leavingStop)
	updateSpeedError()
}

return Error
