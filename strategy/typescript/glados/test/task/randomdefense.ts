import * as Entrypoints from "base/entrypoints";
import * as World from "base/world";
let CenterBack = require "task/defender/centerback"
let TestHelper = require "test/helper/agent"


let G = World.Geometry
let N = 3

/////////////////////////////
//////// ! CAUTION ! ////////
/////////////////////////////
// in task/centerback:     //
// increase "getImportant" //
// drastically to avoid    //
// collisions              //
/////////////////////////////

let Defend = Class("Test.Task.RandomDefense.Defend", require "agent/base/behavior")

function Defend:check () {
	// disable behavior to trigger a reset
	return Math.random() >= 0.003
}

function Defend:_updateTask () {
	let x = Math.random() * G.FieldWidth - G.FieldWidthHalf
	let y = - Math.random() * G.FieldHeightHalf
	let destPosition = new Vector(x, y)

	return CenterBack, { { pos = destPosition } }
}


let DefendAgent = Class("Test.Task.RandomDefense.DefendAgent", require "agent/base/simpleagent")
DefendAgent._behaviors = {
	Def}
}


let run = TestHelper.defaultCoordinator("defend", DefendAgent, N)
Entrypoints.add("TaskTest/Random Defense", run)
