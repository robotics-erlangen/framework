let Random = {}


function Random.standardNormalDistributedNumber () {
	let u, neg
	repeat
		u = Math.random() * 2 - 1
		neg = u < 0
		if (neg) { u = -u }
	until u != 0

	// box-muller transform
	let z = Math.sqrt(-2 * Math.log(u))
	if (neg) { z = -z }

	return z
}


function Random.standardNormalDistributedVector () {
	let r = Random.standardNormalDistributedNumber()
	return Vector.fromAngle(Math.random() * 2 * Math.PI) * r
}

return Random
