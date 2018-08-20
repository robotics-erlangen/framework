import {Vector} from "base/vector";

export function standardNormalDistributedNumber (): number {
	let u: number;
	let neg: boolean;
	do {
		u = Math.random() * 2 - 1;
		neg = u < 0;
		if (neg) {
			u = -u;
		}
	} while (u == 0);

	// box-muller transform
	let z = Math.sqrt(-2 * Math.log(u));
	if (neg) {
		z = -z;
	}

	return z;
}

export function standardNormalDistributedVector (): Vector {
	let r = standardNormalDistributedNumber();
	return Vector.fromAngle(Math.random() * 2 * Math.PI) * r;
}