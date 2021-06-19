import { throwInDebug } from "base/amun";
import * as debug from "base/debug";
import * as Referee from "base/referee";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Attacker } from "glados/agent/attacker";
import { Agent } from "glados/agent/base/agent";
import { Checkable } from "glados/agent/base/behavior";
import { ObjectiveConstructor } from "glados/agent/base/objective";
import { Midfield } from "glados/agent/objective/midfield";
import { Striker } from "glados/agent/objective/striker";
import { MessageType } from "glados/control/messaging";
import * as Attack from "glados/util/attack";

enum RestartMode {
	/**
	 * *In this frame*, we switched to a referee state that will lead to a
	 * friendly freekick.
	 */
	FORCE_RESTART = "FORCE_RESTART",
	/** A freekick is currently on going */
	FORCE_KEEPING = "FORCE_KEEPING",
	/** Every other case */
	DEFER = "DEFER",
}

/**
 * Since a different runner is used during freekicks, we want to restart the
 * objective when we are tasked to place the ball, since most of the time, this
 * is followed by a freekick. There are, however, some special cases...
 *
 * Also, we don't want to restart when the freekick is already running, since
 * objective and behavior state is time sensitive
 */
function determineFreekickRestartMode(oldRefereeState: World.RefereeStateType, oldNextRefereeState: World.RefereeStateType): RestartMode {
	/*
	 * Note that this edge also triggers if the main attacker changes during
	 * ball placement/freekick (the default value for oldRefereeState is "")
	 */
	const stateChanged = World.RefereeState !== oldRefereeState;

	/*
	 * The (hopefully) normal case for pending freekicks. The referee issues
	 * ball placement and the next referee state is set.
	 */
	if (stateChanged
			&& World.RefereeState === "BallPlacementOffensive"
			&& Referee.isFriendlyFreeKickState(World.NextRefereeState)) {
		return RestartMode.FORCE_RESTART;
	}

	// The freekick may be started directly without prior ball placement
	if (stateChanged
			&& oldRefereeState !== "BallPlacementOffensive"
			&& Referee.isFriendlyFreeKickState(World.RefereeState)) {
		return RestartMode.FORCE_RESTART;
	}

	/*
	 * Ball placement was issued but NextRefereeState was not directly set. I
	 * don't know if this actually happens, but let's just handle it here to be
	 * sure.
	 */
	if (oldRefereeState === "BallPlacementOffensive"
			&& !Referee.isFriendlyFreeKickState(oldNextRefereeState)
			&& Referee.isFriendlyFreeKickState(World.NextRefereeState)) {
		return RestartMode.FORCE_RESTART;
	}

	if (Referee.isFriendlyFreeKickState(World.RefereeState)) {
		return RestartMode.FORCE_KEEPING;
	}

	return RestartMode.DEFER;
}

export class SelectObjective implements Checkable {
	/** Use a simple priority list for now */
	static OBJECTIVES: ObjectiveConstructor[] = [
		Midfield,
		Striker,
	];

	private _agent: Attacker;
	private _cachedNextRefereeState: World.RefereeStateType = "";
	private _cachedRefereeState: World.RefereeStateType = "";

	constructor(agent: Agent) {
		if (!(agent instanceof Attacker)) {
			throw new Error("a/a/selectobjective may only be used on attackers");
		}
		this._agent = agent;
	}

	check = debug.wrap("select objective", () => {
		const messaging = this._agent.messaging();
		const robot = this._agent.robot();

		// this must be at the start before ANY return statements,
		// since lastIncomingPassInfo needs to be continously updated
		// to receive the information from every frame
		const lastIncomingPassInfo = Attack.lastIncomingPassInfo(
			robot, messaging.receiveSingleSender(MessageType.passInfo));

		const isMainAttacker = messaging.receiveTrainer(MessageType.mainAttacker) === robot;
		if (!isMainAttacker) {
			// This may be set if this agent used to be MA
			this._agent.objective = undefined;
			return undefined;
		}

		const freekickRestart = determineFreekickRestartMode(this._cachedRefereeState, this._cachedNextRefereeState);
		this._cachedRefereeState = World.RefereeState;
		this._cachedNextRefereeState = World.NextRefereeState;

		debug.set("freekick restart", freekickRestart);

		// Use the position where we plan to receive the pass if available
		const pos: Readonly<Vector> = World.RefereeState === "BallPlacementOffensive"
			? World.BallPlacementPos!
			: lastIncomingPassInfo
			? lastIncomingPassInfo.ballPos
			: World.Ball.pos;

		/*
		 * Take from messaging (and not as an instance variable here) to allow
		 * continued objective use after a MA defender-attacker switch
		 */
		const [, lastObjective] = messaging.receiveSingleSender(MessageType.selectedObjective, true);

		let reuse;
		switch (freekickRestart) {
			case RestartMode.FORCE_RESTART:
				reuse = false;
				break;
			case RestartMode.FORCE_KEEPING:
				reuse = true;
				break;
			case RestartMode.DEFER:
				reuse = lastObjective !== undefined
					&& lastObjective.getMaRunner().agent().robot() === robot
					&& lastObjective.canContinue({ pos });
				break;
		}
		debug.set("reuse", reuse);

		let nextObjective;
		if (!reuse) {
			const objectiveCtor = SelectObjective.OBJECTIVES.find((ctor) => ctor.canStart({ pos }));
			if (objectiveCtor) {
				nextObjective = new objectiveCtor(this._agent);
			}
		} else {
			if (!lastObjective) {
				throwInDebug("Trying to reuse the objective even if there was no objective previously. This is probably a bug");
			}
			nextObjective = lastObjective;
		}
		debug.set("objective", nextObjective?.toString());

		this._agent.objective = nextObjective;

		if (nextObjective) {
			messaging.sendBroadcast(MessageType.selectedObjective, nextObjective);
		}

		return undefined;
	});

	/*
	 * The other methods in this class don't really do anything since the
	 * purpose of this Checkable is to forward the objective
	 * a) to a MA behavior later in the chain by writing it on the agent
	 * b) to send it to support attackers through messaging
	 * In both cases, this Checkable does not return any runnable Behavior,
	 * thus it should provide no main attacker parameters
	 */
	mainAttackerParameters() {
		// this type assertion is necessary since the compiler infers the type
		// to be (undefined | boolean)[]
		return [undefined, false] as [undefined, false];
	}

	clearMainAttackerParameters() {}

	agent() {
		return this._agent;
	}

	setAgent(agent: Agent) {
		if (this._agent.robot() !== agent.robot()) {
			throw new Error("Can't reuse behavior with different robot");
		}
		if (!(agent instanceof Attacker)) {
			throw new Error("a/a/selectobjective may only be used on attackers");
		}
		agent.objective = this._agent.objective;
		this._agent.objective = undefined;
		this._agent = agent;
	}
}

