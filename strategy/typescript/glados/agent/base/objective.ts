import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";
import * as World from "base/world";

import { Agent } from "glados/agent/base/agent";
import { Checkable, CheckableConstructor } from "glados/agent/base/behavior";
import { Zone } from "glados/util/zone";

/** Different checkables to be used by the main and support attackers */
export interface RunnerCtors {
	/** To be used by the main attacker during normal play */
	ma: CheckableConstructor;
	/** To be used by the main attacker leading up to and during freekicks */
	freekick: CheckableConstructor;
	/** To be used by support attackers */
	support: CheckableConstructor;
}

/**
 * The base class for objectives.
 *
 * An objective is specified by the main attacker and which objective is
 * chosen, depends on what the MA wants to do with the ball. For example, he
 * could aim to score are goal directly, or instead pass to a teammate who is
 * in better position to continue passing. Both of these objectives can be
 * implemented in a subclass of the Objective class.
 */
export abstract class Objective {
	private readonly _maRunner: Checkable;
	private readonly _supportRunnerCtor: CheckableConstructor;
	private readonly _supportRunner = new Map<Agent, Checkable>();
	/** Whether the objective was activated during a freekick */
	private readonly _freekick: boolean;

	constructor(maAgent: Agent, runnerCtor: RunnerCtors) {
		this._freekick = Referee.isFriendlyFreeKickState()
			|| World.RefereeState === "BallPlacementOffensive" && Referee.isFriendlyFreeKickState(World.NextRefereeState);
		const ctor = this._freekick
			? runnerCtor.freekick
			: runnerCtor.ma;
		this._maRunner = new ctor(maAgent);
		this._supportRunnerCtor = runnerCtor.support;
	}

	/** Get the {@link Checkable} that can be checked by the main attacker */
	getMaRunner(): Checkable {
		return this._maRunner;
	}

	/**
	 * Get a {@link Checkable} that can be checked by normal support attackers
	 * @param agent - The support agent to retrieve the Checkable for
	 */
	getSupportRunner(agent: Agent): Checkable {
		if (this._supportRunner[agent] === undefined) {
			this._supportRunner[agent] = new this._supportRunnerCtor(agent);
		}
		return this._supportRunner[agent]!;
	}

	/**
	 * The zones in which supporting attackers should distribute. The zone at
	 * index 0 is the default empty zone, i.e the zone which is used as empty
	 * zone if the main attacker is in no other zone.
	 * @see glados/group/supporter
	 */
	abstract getSupporterZones(supporter: FriendlyRobot[]): Zone[];

	/**
	 * Whether the objective is fit to continue execution.
	 * @param ball - The ball to use in e.g. ball position checks (the same as in canStart)
	 */
	abstract canContinue(ball: BallLike): boolean;

	_toString() {
		return `${this.constructor.name} (${this._freekick ? "Freekick" : "Normal"})`;
	}

	toString() {
		return this._toString();
	}
}

export interface BallLike {
	pos: Readonly<Position>;
}

/**
 * It is necessary to use an extra interface for the constructor since
 * Objective is abstract and cannot be instantiated directly (which is
 * necessary if you keep them in a list)
 */
export interface ObjectiveConstructor {
	/**
	 * Check whether the objective can start with the specified ball
	 *
	 * Note that is taken more as an advice than a requirement - the objective
	 * could still be instantiated even if canStart returned `false`
	 *
	 * @param ball - The ball to use in e.g. ball position checks
	 * @returns true iff the objective could start running under the current conditions
	 */
	canStart(ball: BallLike): boolean;
	new(maAgent: Agent): Objective;
}
