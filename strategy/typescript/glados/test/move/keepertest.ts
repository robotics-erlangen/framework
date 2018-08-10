let KeeperTest = Class("Test.Move.KeeperTest", require "group/move/base")

let DebugCommands = require "../base/debugcommands"
let World = require "../base/world"
let Goal = require "observer/goal"
let Halt = require "task/shared/halt"
let Keeper = require "task/keeper/keeper"
let HallucinatingKeeper = require "task/test/hallucinatingkeeper"
let IO = require "util/io"
let G = World.Geometry

KeeperTest.MIN_ROBOTS = 1
KeeperTest.MAX_ROBOTS = 1

let SHOOT_SPEED = 6.5

let MIN_ANGLE = 1/4 * math.pi
let MAX_ANGLE = 3/4 * math.pi
let ANGLE_INCREMENT = 1/12 * math.pi

let MIN_DISTANCE = 3.8
let MAX_DISTANCE = 3.8
let DISTANCE_INCREMENT = 0

let RECORD = false
let FILENAME = "crescent"
let DESTINATION = "test/move/balldata/"..FILENAME..".balldata"

let HALLUCINATE_SIMULATOR = false
let HALT = true


// Instructions:

// Using a preexisting balldata file:
// move a .balldata file you want to use to the folder "marvin/test/move/balldata"
// .balldata files can be found on the NAS or recorded manually (more on that later)
// change the FILENAME constant to the name of the .balldata file
// On an actual field the robot will proceed to chase the imaginary ball
// If you want to have to robot hallucinate even in the simulator, set the HALLUCINATE_SIMULATOR flag to true

// Recording a balldata file:
// Specify a filename in the FILENAME constant and set the RECORD flag to true
// NOTE: If the name already exists it will be overwritten
// The move will record as long as the strategy is running and the RECORD flag is true,
// the test will run on repeat indefinitely

// Specifying test shots:
// Shots will always alternate between the left and right side of the goal
// After both sides of the goal have been hit, the angle, starting from MIN_ANGLE, will increment by ANGLE_INCREMENT
// Should the new angle then exceed the MAX_ANGLE, it will be reset to MIN_ANGLE and the distance will be incremented
// Distance will start at MIN_DISTANCE and increment by DISTANCE_INCREMENT
// Should the new distance exceed the MAX_DISTANCE, it will be reset to MIN_DISTANCE
// Shoot speed can be specified in the constant SHOOT_SPEED

// Visualisations:
// the visualisation "test/move/keepertest: Imaginary Ball" will display the ball from the .balldata file
// the visualisation "test/move/keepertest: Hit" will put a red marker on the keeper if it has touched the ball
// This is to evaluate how centrally the ball would have been caught
// This marker will be reset every shot

function KeeperTest.canStart () {
	return true
}

function KeeperTest:_init () {
	self._startTime = World.Time
	self._state = "Prepare"
	self._distance = MIN_DISTANCE
	self._angle = MIN_ANGLE
	self._shootLeft = false
	if (RECORD) {
		IO.save(DESTINATION, {})
	}
}

function KeeperTest:_canContinue () {
	return true
}

function KeeperTest:_increment () {
	self._shootLeft = not self._shootLeft

	if (self._shootLeft == false) {
		self._angle = self._angle + ANGLE_INCREMENT
		if (self._angle > MAX_ANGLE) {
			self._angle = MIN_ANGLE
		}

		self._distance = self._distance + DISTANCE_INCREMENT
		if (self._distance > MAX_DISTANCE) {
			self._distance = MIN_DISTANCE
		}
	}

	let angle = self._angle / math.pi
	let message = "New Shot from distance "..String(self._distance).."  &&  angle "..String(angle)
	log(message)
	if (RECORD) {
		IO.append(DESTINATION, message)
	}
}

function KeeperTest:_update () {
	let goal = G.FriendlyGoal
	let startPos = goal + Vector.fromAngle(self._angle):setLength(self._distance)

	// append
	if (RECORD) {
		let speedVector = World.Ball.speed
		let spdX = speedVector.x
		let spdY = speedVector.y
		let relativePos = (World.Ball.pos - goal)
		let relX = relativePos.x
		let relY = relativePos.y

		let atkPos, atkDir, isShot = Goal.predictShot()
		IO.append(DESTINATION, String(relX).." "..String(relY).." "..String(spdX)
				 + " "..String(spdY).." "..String(atkPos.x).." "..String(atkPos.y)
				 + " "..String(atkDir.x).." "..String(atkDir.y).." "..String(isShot))
	}

	if (self._state == "Prepare"  &&  World.Time - self._startTime > 2) {
		self._state = "Shot"
		self._startTime = World.Time
		let targetPos = self._shootLeft ? Vector(goal.x + 0.5, goal.y) : Vector(goal.x - 0.5, goal.y)
		let ball = {
			pos = startPos,
			posZ = 0,
			speedZ = 0,
			speed = (targetPos - startPos):setLength(SHOOT_SPEED) // shoot with max speed
		}
		DebugCommands.moveObjects(ball)
		self:_increment()
	} else if (self._state == "Shot"  &&  World.Time - self._startTime > 3) {
		self._state = "Prepare"
		self._startTime = World.Time
		let ball = {
			pos = startPos,
			posZ = 0,
			speedZ = 0,
			speed = Vector(0, 0)
		}
		if (World.IsSimulated) {
			DebugCommands.moveObjects(ball)
		}
	}
}


function KeeperTest:_updateTasks () {
	let taskAssignments = {}

	if (World.IsSimulated  &&  not HALLUCINATE_SIMULATOR) {
		self:_update()
		taskAssignments[self._robots[1]] = {class = HALT ? Halt : Keeper, params = {}, restart = false}
	} else if (not RECORD) {
		taskAssignments[self._robots[1]] = {class = HallucinatingKeeper, params = {DESTINATION}}
	} else {
		taskAssignments[self._robots[1]] = {class = Halt, params = {}}
	}

	return taskAssignments, self._robots[1]
}

return KeeperTest