import { AttackRatio } from "glados/trainer/attackratio";
import { Defense } from "glados/trainer/defense";
import { Trainer } from "glados/trainer/trainer";


export class MainTrainer extends Trainer {
	_defense: Defense;
	_attackRatio: AttackRatio;
	_mode: "passive" | "aggressive" | undefined;

	constructor(mode: "passive" | "aggressive" | undefined) {
		super();
		this._mode = mode;

		this._defense = new Defense(this._messaging);
		this._attackRatio = new AttackRatio(this._messaging);
		this.fixAttackRatio();
	}

	fixAttackRatio() {
		if (this._mode === "passive") {
			this._attackRatio.attackRatio = () => 0;
		} else if (this._mode === "aggressive") {
			this._attackRatio.attackRatio = () => 11;
		}
	}

	run() {
		super.run();
		this._defense._assignDefenders();
	}
}
