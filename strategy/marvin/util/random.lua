local Random = {}

function Random.standardNormalDistributedNumber()
	local u, neg
	repeat
		u = math.random() * 2 - 1
		neg = u < 0
		if neg then	u = -u end
	until u ~= 0

	-- box-muller transform
	local z = math.sqrt(-2 * math.log(u))
	if neg then z = -z end

	return z
end


function Random.standardNormalDistributedVector()
	local u1 = Random.standardNormalDistributedNumber()
	local angle = math.random() * 2 * math.pi
	return Vector.create(u1 * cos(angle), u1 * sin(angle))
end

return Random