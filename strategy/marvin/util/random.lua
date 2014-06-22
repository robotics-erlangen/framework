local Random = {}

function Random.standard_normal_distributed_number()
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

return Random