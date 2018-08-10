let Random = {}


function Random.standardNormalDistributedNumber () {
	let u, neg
	repeat
		u = math.random() * 2 - 1
		neg = u < 0
		if (neg) { u = -u }
	until u != 0

	// box-muller transform
	let z = math.sqrt(-2 * math.log(u))
	if (neg) { z = -z }

	return z
}


function Random.standardNormalDistributedVector () {
	let r = Random.standardNormalDistributedNumber()
	return Vector.fromAngle(math.random() * 2 * math.pi) * r
}

return Random
