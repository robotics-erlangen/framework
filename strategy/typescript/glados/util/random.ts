local Random = {}


function Random.standardNormalDistributedNumber()
	local u, neg
	repeat
		u = math.random() * 2 - 1
		neg = u < 0
		if neg then u = -u end
	until u ~= 0

	// box-muller transform
	local z = math.sqrt(-2 * math.log(u))
	if neg then z = -z end

	return z
end


function Random.standardNormalDistributedVector()
	local r = Random.standardNormalDistributedNumber()
	return Vector.fromAngle(math.random() * 2 * math.pi) * r
end

return Random
