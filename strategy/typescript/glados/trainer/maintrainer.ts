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

import { AttackRatio, AttackRatioKind, AttackRatioResult, ValidAttackRatio } from "glados/trainer/attackratio";
import { Defense } from "glados/trainer/defense";
import { Trainer } from "glados/trainer/trainer";


export class MainTrainer extends Trainer {
	private _defense: Defense;
	private _attackRatio: AttackRatio;
	private _mode: "passive" | "aggressive" | AttackRatioResult | undefined;

	public constructor(mode: "passive" | "aggressive" | AttackRatioResult | undefined) {
		super();
		this._mode = mode;

		this._defense = new Defense(this.messaging);
		this._attackRatio = new AttackRatio(this.messaging);
		this._fixAttackRatio();
	}

	public get attackRatio(): AttackRatio {
		return this._attackRatio;
	}

	private _fixAttackRatio() {
		if (this._mode === "passive") {
			this._attackRatio.attackRatio = () => {
				return {
					kind: AttackRatioKind.ConstantAttackers,
					numberOfAttackers: 0,
				};
			};
		} else if (this._mode === "aggressive") {
			this._attackRatio.attackRatio = () => {
				return {
					kind: AttackRatioKind.ConstantDefenders,
					numberOfDefenders: 0,
				};
			};
		} else if (this._mode != undefined && this._mode.kind != undefined) {
			this._attackRatio.attackRatio = () => {
				return <AttackRatioResult> this._mode;
			};
		}
	}

	public run() {
		super.run();
		this._defense.assignDefenders();
	}
}
