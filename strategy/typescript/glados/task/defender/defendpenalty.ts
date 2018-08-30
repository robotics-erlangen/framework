import * as geom from "base/geom";
import * as vis from "base/vis";
import {Vector, Position} from "base/vector";
import * as World from "base/world";
import {MessageType} from "glados/control/messaging";
import * as PathHelper from "glados/trajectory/pathhelper";
import {ToTarget} from "glados/trajectory/totarget";
import * as Interval from "glados/util/interval";
import {Task} from "glados/task/base";


let PENALTY_LINE_DISTANCE = 0.35 // prevent robots from crossing the penalty line

let obstacleTable: PathHelper.PathHelperParameters = {
	ignoreBall: false,
	ignorePass: true
}

export class DefendPenalty extends Task {
	run () {
		let rr = this._robot.radius; //assume all robots have the same radius
		let penaltyLine = World.Geometry.OwnPenaltyLine + PENALTY_LINE_DISTANCE;
		vis.addPath("t/defendpenalty: penaltyDistance", [new Vector(-2,penaltyLine), new Vector(2,penaltyLine)], vis.colors.whiteHalf);
		// NOTE: All spots are on the penaltyline, so only x-values are processed

		let occupiedSpotsFriendly: number[] = [];
		for (let [robot, pos] of this._messaging.receive(MessageType.moveDest)) {
			if (Math.abs(pos.y - penaltyLine) < 2*rr && robot.id > this._robot.id) {
				occupiedSpotsFriendly.push(pos.x);
			}
		}

		let occupiedSpotsOpp: number[] = []; // positions of opponents on the line
		for (let robot of World.OpponentRobots) {
			if (Math.abs(robot.pos.y - penaltyLine) < rr) {
				occupiedSpotsOpp.push(robot.pos.x);
			}
		}
		let preferredSpots: number[] = [];
		for (let robot of World.OpponentRobots) {
			if (robot != World.OpponentKeeper && (robot.pos.y+rr) > penaltyLine) {
				// prefer spot between own keeper and opponent to catch rebound
				let ownKeeperPos = World.FriendlyKeeper ? World.FriendlyKeeper.pos : World.Geometry.FriendlyGoal
				let keeperOppDir = robot.pos - ownKeeperPos
				let prefSpot = geom.intersectLineLine(ownKeeperPos, keeperOppDir, new Vector(0, penaltyLine), Vector.fromAngle(Math.PI))[0];
				if (prefSpot) {
					preferredSpots.push(prefSpot.x);
				}
			}
		}

		let targetPos: number | undefined;
		// preference one: next to an opponent on the penaltyLine
		occupiedSpotsOpp.sort();
		for (let i = 0;i<occupiedSpotsOpp.length;i++) {
			// ignore if other defender is there
			let alreadyMarked = false;
			for (let defX of occupiedSpotsFriendly) {
				if (Math.abs(occupiedSpotsOpp[i] - defX) < 2.5* rr) {
					alreadyMarked = true;
				}
			}
			if (!alreadyMarked) {
				// check dist to next occupied spot
				let left = i > 0 && Math.abs(occupiedSpotsOpp[i-1] - occupiedSpotsOpp[i]) < 2.5* rr;
				let right = i < occupiedSpotsOpp.length-1 && Math.abs(occupiedSpotsOpp[i+1] - occupiedSpotsOpp[i]) < 2.5* rr;
				let leftPos = occupiedSpotsOpp[i] - 2*rr;
				let rightPos = occupiedSpotsOpp[i] + 2*rr;
				// prefer side to the middle
				if (occupiedSpotsOpp[i] > 0) { // opponent is on the right side
					if (!left) {
						targetPos = leftPos;
						break;
					} else if (!right) {
						targetPos = rightPos;
						break;
					}
				} else {// opponent is on the left side
					if (!right) {
						targetPos = rightPos;
						break;
					} else if (!left) {
						targetPos = leftPos;
						break;
					}
				}
			}
		}

		let occupiedSpotsAll = occupiedSpotsOpp.concat(occupiedSpotsFriendly);
		if (targetPos == undefined) { // preference two: intersection of penaltyLine and line from opponent to friendlyKeeper
			for (let prefX of preferredSpots) {
				let noOneNear = true;
				for (let occX of occupiedSpotsAll) {
					if (Math.abs(prefX - occX) < 2*rr) {
						noOneNear = false;
						break;
					}
				}
				if (noOneNear) {
					targetPos = prefX;
				}
			}
		}
		if (targetPos == undefined) { // fallback: search free point on penaltyLine, which is closest to the middle
			let occupiedSectors = occupiedSpotsAll.map(function(x: number): [number, number] { return [x-rr,x+rr]; })
			Interval.sort(occupiedSectors);
			Interval.merge(occupiedSectors);
			let widthLimit = World.Geometry.FieldWidthHalf - 2 * this._robot.radius;
			let freeSectors = Interval.negate(occupiedSectors, -widthLimit, widthLimit);
			targetPos = Interval.getClosestPoint(freeSectors, 0, rr);
		}

		let resultPos: Position;
		if (targetPos == undefined) { //should only occur when all the whole penalty line is full with robots (i.e never)
			resultPos = new Vector(0, 0);
		} else {
			resultPos = new Vector(targetPos, penaltyLine);
		}

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
		this._robot.trajectory.update(ToTarget, resultPos, (World.Ball.pos - this._robot.pos).angle())

		this._messaging.sendBroadcast(MessageType.moveDest, resultPos);
	}
}