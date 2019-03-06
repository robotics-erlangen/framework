import * as debug from "base/debug";
import * as Referee from "base/referee";
import * as World from "base/world";
import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import * as Ball from "glados/observer/ball";
import * as Robot from "glados/observer/robot";
import { StopAttack } from "glados/task/attacker/stopattack";

// prevents freekicking robot from moving away after failed shot
let lastFreekickTime = 1;
export class DoubleTouchGuard extends Behavior {
	check(): boolean {
		if (Referee.isFriendlyFreeKickState()) {
			// subtract half a second to ensure that the freekick shot gets detected
			lastFreekickTime = World.Time - 0.5;
		}

		const wasShot = Ball.wasShot(World.Time - lastFreekickTime);
		const shooter = Robot.ownStandardShooter();
		debug.push("DoubleTouchConditions");
		debug.set("ownStandardShooter", shooter);
		debug.set("Last Freekick Time", lastFreekickTime);
		debug.set("wasShot Condition", !wasShot);
		debug.pop();

		if (World.RefereeState === "Game" && shooter === this._robot && !wasShot) {
			return true;
		}
		return false;
	}

	_updateTask(): TaskAssignment<typeof StopAttack> {
		return [StopAttack, [0.15]];
	}
}
