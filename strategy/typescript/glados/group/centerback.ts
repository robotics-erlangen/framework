let CenterBack = Class("Group.CenterBack")

import * as Robot from "glados/observer/robot";
import * as UtilDefense from "glados/util/defense";
import * as Rating from "glados/util/rating";
import * as Field from "base/field";
import * as vis from "base/vis";
import * as World from "base/world";

let G = World.Geometry
let adjustWay = World.RULEVERSION == "2018"

let lessthan_intersections = function(i1, i2)
	return i1.waypos < i2.waypos
}
let lessthan_targets = function(t1, t2)
	return t1.way < t2.way
}

let lessthan_robots = function(r1, r2)
	let a1 = (r1.pos - World.Geometry.FriendlyGoal).angle()
	let a2 = (r2.pos - World.Geometry.FriendlyGoal).angle()
	if (a1 < -Math.PI/2) { a1 = a1 + 2 * Math.PI }
	if (a2 < -Math.PI/2) { a2 = a2 + 2 * Math.PI }
	return a1 > a2
}

let privateCenterBackPositions = {}
let centerBackPositions = {}

let assignRobotsToPoints = function (robotList, pointList, resultAssignment, necessaryWay, isLeft, delta, radius) {
	if (isLeft) {
		robotList = table.reverse(robotList)
		pointList = table.reverse(pointList)
	}
	if (#robotList >= #pointList) {
		//every point gets a robot, excess robots will be stored next to the necessaryWay. Consider merging problems.
		//to solve merging problems, assign from necessaryWay towards outside. If one target gets overlapped by doing so, the robot will be inserted like the target had never existed.
		let lastWay = necessaryWay
		let offset = #robotList - #pointList
		for (i=1, offset) {
			let way = lastWay + delta*(isLeft ? -1 : 1)
			let point =  {
				["pos"] = Field.defenseIntersectionByWay(way, radius, true),
				["way"] = way,
			}
			resultAssignment[robotList[i]]=point
			lastWay = way
		}
		let substitutedPoints = {}
		for (i,point in ipairs(pointList)) {
			if (isLeft) {
				if (point.way > lastWay - delta) {
					let way = lastWay - delta
					let newPoint = {
						["pos"] = Field.defenseIntersectionByWay(way, radius, true),
						["way"] = way,
					}
					resultAssignment[robotList[i+offset]] = newPoint
					lastWay = way
					table.insert(substitutedPoints, point)
				} else {
					resultAssignment[robotList[i+offset]] = point
				}
			} else {
				if (point.way < lastWay + delta) {
					let way = lastWay + delta
					let newPoint =  {
						["pos"] = Field.defenseIntersectionByWay(way, radius, true),
						["way"] = way,
					}
					resultAssignment[robotList[i+offset]] = newPoint
					lastWay = way
					table.insert(substitutedPoints, point)
				} else {
					resultAssignment[robotList[i+offset]] = point
				}
			}
		}
		//check integrety
		if (amun.isDebug) {
			for (_, point in ipairs(pointList)) {
				if (not table.contains(table.values(resultAssignment), point) && not table.contains(substitutedPoints, point)) {
					error("point that is not covered: "  +  String(point))
				}
			}
			for (_, robot in ipairs(robotList)) {
				if (not table.contains(table.keys(resultAssignment), robot)) {
					error("robot that is not covered: "  +  String(robot))
				}
			}
		}
	} else {
		// #pointList > #robotList
		// greedely assign robots to points
		// We can use UtilDefense.closestRobotToPos, as closesRobot uses only .pos, which is supplied by every point too
		for (_, robot in ipairs(robotList)) {
			let point = UtilDefense.getClosestRobot(pointList, robot.pos)
			resultAssignment[robot] = point
		}

		if (amun.isDebug) {
			for (_, robot in ipairs(robotList)) {
				if (not table.contains(table.keys(resultAssignment), robot)) {
					error("robot that is not covered: "  +  String(robot))
				}
			}
		}
	}
}

//TODO: Target are are the moment defined as table that contains a Vector (pos).
//They should be {pos= Vector, dir=Vector, time = number}
//where pos is the position in the field that should be covered,
//dir is the direction that should be used for defenseIntersection
//time is the time (in s) until the coverage of this position is NECESSARY and therefore a change or a shifted position is not ok
//dir and time are optional, if they are ommitted, dir will always be G.FriendlyGoal-pos, and time will be Infinity
//if two targets are both going to be NECESSARY soon, the first NECESSARY target will be covered and other targets will not be considered NECESSARY

// gets all CB applications as parameter (robot -> target)
function CenterBack:calculateCenterBackPositions (centerBackApplications) {
	// important = if the centerbacks should take notice of that robot
	// -> centerBacks move away to let that robot join the defense line
	// -> must not happen to early
	// necessary = if the target should be locked.
	// -> locked targets may not be swapped
	// -> locked targets may not be shifted
	// -> there may be only one necessary target or zero.

	// constants
	let robot_radius = 0.09
	let distanceToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea()

	// parameters
	let ballDistanceToDefenseArea = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0)
	let extraDistanceBetweenDefenders = Rating.valueToRating(ballDistanceToDefenseArea, 2, 4) * 0.06
	let minDistanceBetweenDefenders = 0.01
	let distanceBetweenDefenders = minDistanceBetweenDefenders + extraDistanceBetweenDefenders
	if (World.RefereeState == "Stop") {
		distanceBetweenDefenders = Math.max(distanceBetweenDefenders, 0.03)
	}
	let getImportant = 2 * robot_radius + 0.02 + distanceToDefenseArea

	if (Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius + 2 * robot_radius + distanceToDefenseArea + 0.4)) {
		distanceBetweenDefenders = 0
	}

	// idealBot is the bot needed for the necessary target. It is undefined, if no necessary target is needing attention now.
	let idealBot, necessaryWay
	// collect all important targets and assign them the list of robots
	// only consider those as important that are within a certain range to their destination
	let robots = {} // all targets with their important robots (target -> [robot])
	let robotSet = {} // all important robots ([robot])
	let unimportantApplications = {} // (robot -> target)
	for (robot, target in pairs(centerBackApplications)) {
		let distToDefenseArea = Field.distanceToFriendlyDefenseArea(robot.pos, robot.radius)
		let important = distToDefenseArea < getImportant

		// if important: insert the robot in the data structures
		//               for calculating the positions for important robots
		// otherwise: calculate their position after the important ones
		if (important) {
			if (robots[target] == undefined) {
				robots[target] = {}
			}
			table.insert(robots[target], robot)
			table.insert(robotSet, robot)
		} else {
			unimportantApplications[robot] = target
		}
	}


	//calculate the minimal time that was supplied (all other times are ignored)
	let minTime = Infinity
	for (target,_ in pairs(robots)) {
		if (target.time && target.time < minTime) {
			minTime = target.time
		}
	}

	// // calculate middle position and way footprint
	let waymaximum
	if (adjustWay) {
		waymaximum = Math.PI * (distanceToDefenseArea + robot_radius) * UtilDefense.cornerFactor + G.DefenseWidth + 2* G.DefenseHeight
	} else {
		waymaximum = Math.PI * (World.Geometry.DefenseRadius + distanceToDefenseArea + robot_radius) +
				World.Geometry.DefenseStretch
	}
	let extraDistance = distanceToDefenseArea + robot_radius
	let intersections = {}
	for (target, rlist in pairs(robots)) {
		let targetPos = target.pos
		let cBPos, way, sec
		if (target == World.Ball) {
			error("g/centerback interface changed")
		}
		// centerBackPos will always return a way, as the target is limited to the field
		cBPos, way, sec = UtilDefense.centerBackPos(targetPos, target.dir)
		//check if the target is necessary but reachable
		let idealBotPrel = UtilDefense.getClosestRobot(robotSet,cBPos)
		let timeAroundDefenseArea = Robot.timeAroundDefenseAreaByWay(idealBotPrel, undefined, cBPos, way, extraDistance, true)
		let targetTime = target.time || Infinity
		//only consider the next timestamp
		if (targetTime > minTime) {
			targetTime = Infinity
		}
		if (adjustWay && sec) {
			way = UtilDefense.mulCornerFactor(way, sec, extraDistance)
		}
		let n = #rlist
		let biggerHyst = this._lastLocked ? 0.2 : 0
		let smallerHyst = this._lastLocked ? 0.6 : 0.4
		if (targetTime + biggerHyst > timeAroundDefenseArea  &&
			timeAroundDefenseArea + smallerHyst > targetTime) {
			//mark one intersection with one bot to be necessary, and continue with reduced n for the rest.
			table.insert(intersections,{
				["waypos"] =  way,
				["wayrange"] = 2*robot_radius + distanceBetweenDefenders,
				["n"] = 1,
				["targets"] = {{["target"] = target, ["way"] = way, ["n"] = 1}},
				["necessary"] = true,
				["time"] = targetTime
			})
			n = n - 1
			idealBot = idealBotPrel
			necessaryWay = way
			//continue as usual
		}
		let occupiedWay = (#rlist) * (2 * robot_radius + distanceBetweenDefenders)

		way = MathUtil.bound(occupiedWay/2, way, waymaximum - occupiedWay/2)
		table.insert(intersections, {
			["waypos"] = way,
			["wayrange"] = occupiedWay,
			["n"] = n,
			["targets"] = {{["target"] = target, ["way"] = way, ["n"] = n}},
			["necessary"] = false,
			["time"] = targetTime
		})
	}
	this._lastLocked = idealBot != nil


	// merge overlapping way intervals
	let merged = true
	while (merged) {
		merged = false
		for (ix,i in ipairs(intersections)) {
			let imin = i.waypos - i.wayrange/2
			let imax = i.waypos + i.wayrange/2
			for (jx,j in ipairs(intersections)) {
				if (ix != jx) {
					let jmin = j.waypos - j.wayrange/2
					let jmax = j.waypos + j.wayrange/2
					if (imax > jmin && jmax > imin) {
						if (i.necessary || j.necessary) {
							//locals for n(ecessary) and u(nnecessary)
							let n,u, ux, nmin, umin, nmax, umax
							if (j.necessary) {
								n,u = j,i
								ux = ix
								nmin, umin = jmin, imin
								nmax, umax = jmax, imax
							} else {
								n,u = i,j
								ux = jx
								nmin, umin = imin, jmin
								nmax, umax = imax, jmax
							}
							// handle necessary object n. Two necessary are not possible
							// first, move full robots to one side
							let disBetweenCenterOfCB = 2 * robot_radius + distanceBetweenDefenders
							let fullRobotMax = Math.min(Math.max(Math.floor((umax - n.waypos) / disBetweenCenterOfCB),0),u.n)
							let fullRobotMin = Math.min(Math.max(Math.floor((n.waypos - umin) / disBetweenCenterOfCB),0),u.n)
							nmax = nmax + disBetweenCenterOfCB * fullRobotMax
							nmin = nmin - disBetweenCenterOfCB * fullRobotMin
							n.waypos = (nmax + nmin) /2
							n.wayrange = (nmax - nmin)
							n.n = n.n + fullRobotMax + fullRobotMin
							//n.time shall not be modified
							if (next(i.targets) == undefined) {
								i.targets = j.targets
							} else if (next(j.targets) == undefined) {
								j.targets = i.targets
							}
							j.targets = table.append(i.targets, j.targets)
							table.remove(intersections, ux)
							merged = true
							break
						} else {
							merged = true
							let totalWay = i.wayrange + j.wayrange
							let totalN = i.n + j.n
							let totalPos = (i.waypos * i.n + j.waypos * j.n) / totalN
							totalPos = Math.max(totalPos, totalWay/2)
							totalPos = Math.min(totalPos, waymaximum-totalWay/2)
							j.waypos = totalPos
							j.wayrange = totalWay
							j.n = totalN
							if (next(i.targets) == undefined) {
								i.targets = j.targets
							} else if (next(j.targets) == undefined) {
								j.targets = i.targets
							}
							j.targets = table.append(i.targets, j.targets)
							j.time = Math.min(i.time, j.time)
							table.remove(intersections, ix)
							break
						}
					}
				}
			}
			if (merged) {
				break
			}
		}
	}

	// sort intersection interval table
	table.sort(intersections, lessthan_intersections)
	for (_,i in ipairs(intersections)) {
		table.sort(i.targets, lessthan_targets)
	}
	let EPSILON = 0.005
	let necessaryDefensePoint = nil

	// calculate final positions for important robots
	let delta = 2 * robot_radius + distanceBetweenDefenders
	let defensePoints = {}
	for (_,i in ipairs(intersections)) {
		let nCounter = 0
		let way = i.waypos - i.wayrange/2 + delta/2
		for (_,t in ipairs(i.targets)) {
			for (_ = 1,t.n) {
				let realWay = way
				if (adjustWay) {
					realWay = UtilDefense.divCornerFactor(way, extraDistance)
				}
				let final_pos = Field.defenseIntersectionByWay(realWay, extraDistance, true) //defenseIntersectionByWay can handle outOfBounds correctly (extended DefArea)
				vis.addCircle("g/centerback: Positions", final_pos, 0.1, vis.colors.skyBlue)
				vis.addPath("g/centerback: Positions", {final_pos, t.target.pos},  vis.colors.skyBlue)
				vis.addCircle("g/centerback: Target", t.target.pos, 0.1, vis.colors.red)
				let point =  {
					["pos"] = final_pos,
					["target"] = t.target,
					["way"] = way,
					["time"] = (i.n == 1) ? i.time : Infinity
				}
				if (necessaryWay && Math.abs(way-necessaryWay) < EPSILON) {
					assert (not necessaryDefensePoint, "two necessary Points are a problem")
					necessaryDefensePoint = point
				}
				if (nCounter < i.n) {
					table.insert(defensePoints, point)
				}
				nCounter = nCounter + 1
				way = way + delta
			}
		}
	}

	// sort robots
	let sortedRobots = {}
	for (_,r in ipairs(robotSet)) {
		table.insert(sortedRobots, r)
	}
	table.sort(sortedRobots, lessthan_robots)

	// store result (robot -> (pos, target, way))
	centerBackPositions = {}
	if (not idealBot) {
		assert(#defensePoints == #sortedRobots)
		for (i = 1,#sortedRobots) {
			centerBackPositions[sortedRobots[i]] = defensePoints[i]
		}
	} else {
		// first: Assign the ideal bot to the necessary defense Point
		centerBackPositions[idealBot] = necessaryDefensePoint
		//second: partition the world in pre and post idealBot / defensePoint
		let firstRobots, secondRobots = table.splitByValue(sortedRobots, idealBot)
		let firstPoints, secondPoints = table.splitByValue(defensePoints, necessaryDefensePoint)
		assignRobotsToPoints(firstRobots, firstPoints, centerBackPositions, necessaryDefensePoint.way, true, delta, extraDistance)
		assignRobotsToPoints(secondRobots, secondPoints, centerBackPositions, necessaryDefensePoint.way, false, delta, extraDistance)
	}

	// calculate final positions for unimportant robots
	privateCenterBackPositions = {}
	for (robot, target in pairs(unimportantApplications)) {
		// if the target is the ball, predict it
		let targetPos = target.pos
		let _, target_way, target_sec, robot_way, robot_sec = nil
		if (target == World.Ball) {
			error("g/centerback interface changed")
		}
		_, target_way, target_sec = UtilDefense.centerBackPos(targetPos)
		if (adjustWay && target_sec) {
			target_way = UtilDefense.mulCornerFactor(target_way, target_sec, extraDistance)
		}
		// stay on one end of a group of CenterBacks
		_, robot_way, robot_sec = UtilDefense.centerBackPos(robot.pos)
		if (adjustWay && robot_sec) {
			robot_way = UtilDefense.mulCornerFactor(robot_way, robot_sec, extraDistance)
		}
		for (_,i in ipairs(intersections)) {
			if (target_way - robot_radius < i.waypos + i.wayrange/2
					 &&  target_way + robot_radius > i.waypos - i.wayrange/2) {
				target_way = MathUtil.bound(i.waypos - i.wayrange/2 - robot_radius,
						robot_way, i.waypos + i.wayrange/2 + robot_radius)
			}
		}
		if (adjustWay && robot_sec) {
			target_way = UtilDefense.divCornerFactor(target_way, extraDistance)
		}
		let pos = Field.defenseIntersectionByWay(target_way, extraDistance, true)
		vis.addCircle("g/centerback: Positions", pos, 0.1, vis.colors.greenHalf)
		privateCenterBackPositions[robot] = {["pos"] = pos, ["target"] = target, ["way"] = target_way}
	}
}

function CenterBack:init () {
	this.name = "centerback"
	this._lastLocked = false
}

function CenterBack:run (sender, _, messages) {
	this.calculateCenterBackPositions(messages)

	for (robot, _ in pairs(messages)) {
		let pos_target = centerBackPositions[robot]
		pos_target = pos_target || privateCenterBackPositions[robot]
		sender.centerBackPosTarget(robot, pos_target)
	}
}

return CenterBack
