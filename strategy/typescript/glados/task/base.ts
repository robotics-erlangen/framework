/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";

import { Behavior } from "glados/agent/base/behavior";

export type MainAttackerParameters = [Position, number, number | undefined];

/**
 * A constructor that creates a task.
 *
 * Task always belong to a behavior, thus a behavior is mandatory as first
 * argument.
 */
export type TaskConstructor = new (behavior: Behavior, ...args: any[]) => Task;

/** The parameters needed to construct a task, excluding the mandatory behavior */
export type TaskParameters<T extends TaskConstructor> =
	// This conditional is always true since T extends TaskConstructor
	T extends new (behavior: Behavior, ...args: infer P) => Task
	? P
	: never;

export abstract class Task {
	private _behavior: Behavior;
	protected _robot: FriendlyRobot;
	private _mainAttackerParameters: MainAttackerParameters | undefined;

	protected get _messaging() {
		return this._behavior.agent().messaging();
	}

	public constructor(behavior: Behavior) {
		this._behavior = behavior;
		this._robot = behavior.agent().robot();
		this.clearMainAttackerParameters();
	}

	public behavior() {
		return this._behavior;
	}

	public abstract run(): void;

	public clearMainAttackerParameters() {
		this._mainAttackerParameters = undefined;
	}

	public setMainAttackerParameters(target: Position, endSpeedLength: number, overwriteRating?: number) {
		this._mainAttackerParameters = [target, endSpeedLength, overwriteRating];
	}

	public mainAttackerParameters(): MainAttackerParameters | undefined {
		return this._mainAttackerParameters;
	}
}
