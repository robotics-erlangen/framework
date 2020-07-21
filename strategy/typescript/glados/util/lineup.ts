import * as Constant from "base/constants";
import * as Entrypoints from "base/entrypoints";
import * as geom from "base/geom";
import { Robot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { MoveToPos } from "glados/task/shared/movetopos";


function generateLineup(lineStart: Position, lineupDir: number, space: boolean) {
	let lineEnd = lineStart + Vector.fromAngle(lineupDir); // not really the "end" of the line, more a direction
	let lineupDistance = 0.05; // keep 5 cm distance to make taking the robots more comfortable
	let mindist = lineupDistance + 0.18;
	let mindistSpace = Constant.maxRobotRadius + 2 * mindist;

	let viewDir = lineupDir + Math.PI / 2;

	let distances: Map<Robot, number> = new Map<Robot, number>();

	// filter and sort opponent robots
	function filter(r: Robot) {
		let [proj, orthDist] = r.pos.orthogonalProjection(lineStart, lineEnd);
		distances.set(r, proj.distanceTo(lineStart)); // just for calculating the value once, required in compare()
		return orthDist * orthDist < mindist * mindist; // 9 cm = max robot radius
	}
	function compare(a: Robot, b: Robot): number {
		return <number> distances.get(a) - <number> distances.get(b);
	}
	let sortedOpps = World.OpponentRobots.filter(filter);
	sortedOpps.sort(compare);


	// place friendly robots along the given line
	let distToStart = 0;
	let friendlyIndex = 0;
	let opponentIndex = 0;
	while (friendlyIndex < World.FriendlyRobots.length) {
		let mindistChoice = mindist;
		let oddFriendlyIndex = friendlyIndex % 2 === 1 ? true : false;
		if (space && oddFriendlyIndex) {
			mindistChoice = mindistSpace;
		}

		let r = World.FriendlyRobots[friendlyIndex];
		let opp = sortedOpps.length > 0 && sortedOpps[opponentIndex];
		let intendedPos = lineStart + (lineEnd - lineStart) * distToStart;

		if (opp && opp.pos.distanceTo(intendedPos) < mindistChoice) {
			// extra distance for numeric stability
			let [p1, p2] = geom.intersectLineCircle(lineStart, lineEnd - lineStart, opp.pos, mindistChoice + 0.0001);
			let d1 = lineStart.distanceTo(p1!);
			let d2 = p2 ? lineStart.distanceTo(p2) : Infinity;
			let further = d1 > d2 ? d1 : d2;
			distToStart = further;
			opponentIndex = opponentIndex + 1;
		} else {
			let pseudoagent = {robot: function() { return r; } }; // FIXME hack;
			let task = new MoveToPos(<any> pseudoagent, { pos: intendedPos, dir: viewDir });
			task.run();
			friendlyIndex = friendlyIndex + 1;
			distToStart = distToStart + mindistChoice;
		}
	}
}

let distToLine = 0.4;
let fleft = new Vector(-World.Geometry.FieldWidthHalf + distToLine, -World.Geometry.FieldHeightHalf + distToLine);
let fright = new Vector(World.Geometry.FieldWidthHalf - distToLine, -World.Geometry.FieldHeightHalf + distToLine);
let oleft = new Vector(-World.Geometry.FieldWidthHalf + distToLine, World.Geometry.FieldHeightHalf - distToLine);
let oright = new Vector(World.Geometry.FieldWidthHalf - distToLine, World.Geometry.FieldHeightHalf - distToLine);
let mleft = new Vector(-World.Geometry.FieldWidthHalf + distToLine, 0);
let mright = new Vector(World.Geometry.FieldWidthHalf - distToLine, 0);

Entrypoints.add("Lineup/Friendly Left", function() { generateLineup(fleft, Math.PI / 2, false); return true; });
Entrypoints.add("Lineup/Friendly Right", function() { generateLineup(fright, Math.PI / 2, false); return true; });
Entrypoints.add("Lineup/Opponent Left", function() { generateLineup(oleft, -Math.PI / 2, false); return true; });
Entrypoints.add("Lineup/Opponent Right", function() { generateLineup(oright, -Math.PI / 2, false); return true; });
Entrypoints.add("Lineup/Middle Left", function() { generateLineup(mleft, Math.PI / 2, false); return true; });
Entrypoints.add("Lineup/Middle Right", function() { generateLineup(mright, Math.PI / 2, false); return true; });

Entrypoints.add("Lineup_Space/Friendly Left", function() { generateLineup(fleft, Math.PI / 2, true); return true; });
Entrypoints.add("Lineup_Space/Friendly Right", function() { generateLineup(fright, Math.PI / 2, true); return true; });
Entrypoints.add("Lineup_Space/Opponent Left", function() { generateLineup(oleft, -Math.PI / 2, true); return true; });
Entrypoints.add("Lineup_Space/Opponent Right", function() { generateLineup(oright, -Math.PI / 2, true); return true; });
Entrypoints.add("Lineup_Space/Middle Left", function() { generateLineup(mleft, Math.PI / 2, true); return true; });
Entrypoints.add("Lineup_Space/Middle Right", function() { generateLineup(mright, Math.PI / 2, true); return true; });
