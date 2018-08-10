let GoalTest = {}

let debug = require "../base/debug"
let vis = require "../base/vis"
let World = require "../base/world"
let Goal = require "observer/goal"


function GoalTest.testFreeSectors () {
	let freeSectors = Goal.freeSectors(World.Ball.pos, World.OpponentRobots, true)
	vis.setColor(vis.colors.orangeHalf, true)
	for (_, s in ipairs(freeSectors)) {
		//log(tostring(s[1]) .. " "..tostring(s[2]))
		let pointRight = World.Ball.pos + Vector.fromAngle(s[1])*10
		let pointLeft = World.Ball.pos + Vector.fromAngle(s[2])*10
		vis.addPolygon("test: Free Sectors", {World.Ball.pos, pointRight, pointLeft})
	}
}

function GoalTest.testCustomFreeSectors () {
	let freeSectors = Goal.allFreeSectors(World.Ball.pos, World.OpponentRobots)
	for (i,sector in ipairs(freeSectors)) {
		debug.set("sector["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	}
	vis.setColor(vis.colors.orangeHalf, true)
	for (_, s in ipairs(freeSectors)) {
		vis.addPizza("test: Custom Free Sectors", World.Ball.pos, 5, s[2], s[1])
	}
}

return GoalTest
