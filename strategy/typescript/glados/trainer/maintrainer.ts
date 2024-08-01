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
		this.fixAttackRatio();
	}

	public get attackRatio(): AttackRatio {
		return this._attackRatio;
	}

	private fixAttackRatio() {
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
		this._defense._assignDefenders();
	}
}
