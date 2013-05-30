local Complex = {}
Complex.MT = {__index = Complex}

function Complex.create(re, im)
	local self = {re = re, im = im}
	setmetatable(self, Complex.MT)
	return self
end


function Complex.MT.__add(a, b)
	if type(b) == "number" then
		return Complex.create(a.re + b, a.im)
	end
	return Complex.create(a.re + b.re, a.im + b.im)
end

function Complex.MT.__sub(a, b)
	if type(b) == "number" then
		return Complex.create(a.re - b, a.im)
	end
	return Complex.create(a.re - b.re, a.im - b.im)
end

function Complex.MT.__unm(a)
	return Complex.create(-a.re, -a.im)
end

function Complex.MT.__mul(a, b)
	if type(b) == "number" then
		return Complex.create(a.re*b, a.im*b)
	end
	return Complex.create(a.re*b.re - a.im*b.im, a.im*b.re + a.re*b.im)
end

function Complex.MT.__div(a, b)
	if type(b) == "number" then
		return Complex.create(a.re/b, a.im/b)
	end
	if b.re == 0 and b.im == 0 then
		error("complex division by 0")
	end
	local denom = b.re*b.re + b.im*b.im
	return Complex.create((a.re*b.re + a.im*b.im)/denom, (a.im*b.re - a.re*b.im)/denom)
end

function Complex:square()
	return self * self
end

function Complex:abs()
	return math.sqrt(self.re*self.re + self.im*self.im)
end

function Complex:sqrt()
	local abs = self:abs()
	local gamma = math.sqrt((self.re + abs)/2)
	local sgn_b = self.im < 0 and -1 or 1
	local delta = sgn_b * math.sqrt((-self.re + abs)/2)
	return Complex.create(gamma, delta), Complex.create(gamma, -delta)
end


function Complex.MT.__tostring(self)
	return "("..self.re.." + "..self.im.."i)"
end

return Complex
