--[[
--- Extensions to lua math functions
module "math"
]]--

--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier  *
*       André Pscherer                                                    *
*   Robotics Erlangen e.V.                                                *
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
*************************************************************************]]

local max, min = math.max, math.min

--- Limits value to interval [min, max].
-- @name bound
-- @param min number - lower bound of interval
-- @param par number - value to limit to interval
-- @param max number - upper bound of interval
-- @return number - par limited to interval [min, max]
function math.bound(vmin, par, vmax)
	return min(max(vmin, par), vmax)
end

--- Calculates the value of a given polynomial at x
-- @param coefficients list - list of polynomial coefficients ordered after ascending power of x
-- @param x number - argument of the polynomial function
-- @return number - value of polynomial at x
function math.evaluatePolynomial(coefficients, x)
	local f = coefficients[1]
	for i = 2, #coefficients do
		f = f*x + coefficients[i]
	end
	return f
end

local eta = math.ldexp(1.0, -52)
local function QuadSD(NN, u, v, p, q)
	local b = p[1]
	q[1] = b
	local a = p[2] - b*u
	q[2] = a
	for i = 3, NN do
		q[i] = -(a*u + b*v) + p[i]
		b = a
		a = q[i]
	end
	return a, b
end

local function CalcSC(N, a, b, K, u, v, qk)
	local dumFlag = 3
	local c, d = QuadSD(N, u, v, K, qk)
	if math.abs(c) <= 100*eta*math.abs(K[N]) then
		if math.abs(d) <= 100*eta*math.abs(K[N-1]) then
			return dumFlag
		end
	end
	local h = v*b
	if math.abs(d) >= math.abs(c) then
		dumFlag = 2
		local e = a/d
		local f = c/d
		local g = u*b
		local a3 = e*(g + a) + h*b/d
		local a1 = f*b - a
		local a7 = h + (f + u)*a
		return dumFlag, a1, a3, a7, c, d, e, f, g, h
	else
		dumFlag = 1
		local e = a/c
		local f = d/c
		local g = e*u
		local a3 = e*a + (g + h/c)*b
		local a1 = b - a*d/c
		local a7 = g*d + h*f + a
		return dumFlag, a1, a3, a7, c, d, e, f, g, h
	end
end

local function nextK(N, tFlag, a, b, a1, a3, a7, K, qk, qp)
	if tFlag == 3 then
		K[1] = 0.0
		K[2] = 0.0
		for i = 3, N do
			K[i] = qk[i-2]
		end
		return a3, a7
	end
	local temp = (tFlag == 1) and b or a
	if math.abs(a1) > 10*eta*math.abs(temp) then
		a7 = a7/a1
		a3 = a3/a1
		K[1] = qp[1]
		K[2] = qp[2] - a7*qp[1]
		for i = 3, N do
			K[i] = qp[i] - a7*qp[i-1] + a3*qk[i-2]
		end
	else
		K[1] = 0.0
		K[2] = -a7*qp[1]
		for i = 3, N do
			K[i] = a3*qk[i-2] - a7*qp[i-1]
		end
	end
	return a3, a7
end

local function newest(tFlag, a, a1, a3, a7, b, c, d, f, g, h, u, v, K, N, p)
	--log("newest")
	local uu = 0.0
	local vv = 0.0
	if tFlag ~= 3 then
		local a4, a5
		if tFlag ~= 2 then
			a4 = a + u*b + h*f
			a5 = c + (u + v*f)*d
		else
			a4 = (a + g)*f + h
			a5 = (f + u)*c + v*d
		end
		local b1 = -K[N]/p[N+1]
		local b2 = -(K[N-1] + b1*p[N])/p[N+1]
		local c1 = v*b2*a1
		local c2 = b1*a7
		local c3 = b1*b1*a3
		local c4 = c1 - (c2 + c3)
		local temp = b1*a4 - c4 + a5
		if temp ~= 0.0 then
			uu = u - (u*(c3 + c2) + v*(b1*a1 + b2*a7))/temp
			vv = v*(1.0 + c4/temp)
		end
	end
	return uu, vv
end

local function Quad(a, b1, c)
	local li = 0.0
	local lr = 0.0
	local si = 0.0
	local sr = 0.0
	if a == 0.0 then
		sr = (b1 ~= 0.0) and -c/b1 or sr
		return sr, si, lr, li
	end
	if c == 0.0 then
		lr = -b1/a
		return sr, si, lr, li
	end
	local b = b1/2.0
	local d, e
	if math.abs(b) < math.abs(c) then
		e = (c >= 0.0) and a or -a
		e = b*(b/math.abs(c)) - e
		d = math.sqrt(math.abs(e*c))
	else
		e = 1.0 - a*c/(b*b)
		d = math.sqrt(math.abs(e))*math.abs(b)
	end
	if e < 0 then
		-- complex conjugate zeros
		sr = -b/a
		lr = sr
		si = math.abs(d/a)
		li = -si
	else
		-- real zeros
		if b >= 0 then
			d = -d
		end
		lr = (d - b)/a
		if lr ~= 0 then
			sr = c/(lr*a)
		end
	end
	return sr, si, lr, li
end

local function RealIT(sss, N, p, NN, qp, K, qk)
	--log("RealIT")
	local j = 0
	local NZ = 0
	local iFlag = false
	local s = sss
	local szr, szi, t, mp, ms, omp
	-- for i = 1, NN do
		-- log("qp["..i.."] = "..qp[i])
	-- end
	while true do
		local pv = p[1]
		qp[1] = pv
		--log("qp[1] = "..qp[1])
		for i = 2, NN do
			pv = pv*s + p[i]
			qp[i] = pv
			--log("qp["..i.."] = "..qp[i])
		end
		mp = math.abs(pv)
		ms = math.abs(s)
		local ee = 0.5*math.abs(qp[1])
		for i = 2, NN do
			ee = ee*ms + math.abs(qp[i])
		end
		if mp <= 20.0*eta*(2.0*ee - mp) then
			NZ = 1
			szr = s
			szi = 0.0
			break
		end
		j = j + 1
		if j > 10 then
			log("RealIT 10 iterations")
			log("f(x) = "..math.polynomialToString(p))
			break
		end
		if j >= 2 then
			if (math.abs(t) <= 0.001*math.abs(s - t)) and (mp > omp) then
				iFlag = true
				sss = s
				break
			end
		end
		omp = mp
		local kv = K[1]
		qk[1] = kv
		for i = 2, N do
			kv = kv*s + K[i]
			qk[i] = kv
		end
		if math.abs(kv) > math.abs(K[N])*10.0*eta then
			t = -pv/kv
			K[1] = qp[1]
			for i = 2, N do
				K[i] = t*qk[i-1] + qp[i]
			end
		else
			K[1] = 0.0
			for i = 2, N do
				K[i] = qk[i-1]
			end
		end
		kv = math.evaluatePolynomial(K, s)
		-- kv = K[1]
		-- for i = 2, N do
			-- kv = kv*s + K[i]
		-- end
		t = (math.abs(kv) > math.abs(K[N])*10.0*eta) and -pv/kv or 0.0
		s = s + t
	end
	return iFlag, NZ, sss, szr, szi
end

local function QuadIT(N, uu, vv, qp, NN, p, qk, K)
	--log("QuadIT")
	local j = 0
	local triedFlag = false
	local NZ = 0
	local u = uu
	local v = vv
	local relstp, omp, tFlag, a1, a3, a7, a, b, c, d, e, f, g, h, ui, vi, szr, szi, lzr, lzi
	repeat
		--log("u = "..u.."	v = "..v)
		szr, szi, lzr, lzi = Quad(1.0, u, v)
		--log("sz = "..szr.." + "..szi.."i	lr = "..lzr.." + "..lzi.."i")
		if math.abs(math.abs(szr) - math.abs(lzr)) > 0.01*math.abs(lzr) then
			break
		end
		a, b = QuadSD(NN, u, v, p, qp)
		local mp = math.abs(a - szr*b) + math.abs(szi*b)
		local zm = math.sqrt(math.abs(v))
		local ee = 2.0*math.abs(qp[1])
		local t = -szr*b
		for i = 2, N do
			ee = ee*zm + math.abs(a + t)
		end
		ee = (9.0*ee + 2.0*math.abs(t) - 7.0*(math.abs(a + t) + zm*math.abs(b)))*eta
		if mp <= 20.0*ee then
			NZ = 2
			break
		end
		j = j + 1
		if j > 20 then
			--log("QuadIT 20 iterations")
			break
		end
		if j >=2 then
			if (relstp <= 0.01) and (mp >= omp) and (not triedFlag) then
				relstp = (relstp < eta) and math.sqrt(eta) or math.sqrt(relstp)
				u = u - u*relstp
				v = v + v*relstp
				a, b = QuadSD(NN, u, v, p ,qp)
				for i = 1, 5 do
					tFlag, a1, a3, a7, c, d, e, f, g, h = CalcSC(N, a, b, K, u, v, qk)
					a3, a7 = nextK(N, tFlag, a, b, a1, a3, a7, K, qk, qp)
				end
				triedFlag = true
				j = 0
			end
		end
		omp = mp
		tFlag, a1, a3, a7, c, d, e, f, g, h = CalcSC(N, a, b, K, u, v, qk)
		a3, a7 = nextK(N, tFlag, a, b, a1, a3, a7, K, qk, qp)
		tFlag, a1, a3, a7, c, d, e, f, g, h = CalcSC(N, a, b, K, u, v, qk)
		ui, vi = newest(tFlag, a, a1, a3, a7, b, c, d, f, g, h, u, v, K, N, p)
		if vi ~= 0 then
			relstp = math.abs((vi - v)/vi)
			u = ui
			v = vi
		end
	until vi == 0
	return NZ, szr, szi, lzr, lzi, a, b, a1, a3, a7, d, e, f, g, h
end

--[[function math.QuadIT_DEBUG(N, uu, vv, qp, NN, p, qk, K)
	log("QuadIT_DEBUG")
	local j = 0
	local triedFlag = false
	local NZ = 0
	local u = uu
	local v = vv
	local relstp, omp, tFlag, a1, a3, a7, a, b, c, d, e, f, g, h, ui, vi, szr, szi, lzr, lzi
	repeat
		log("u = "..u.."	v = "..v)
		szr, szi, lzr, lzi = Quad(1.0, u, v)
		log("sz = "..szr.." + "..szi.."i	lr = "..lzr.." + "..lzi.."i")
		if math.abs(math.abs(szr) - math.abs(lzr)) > 0.01*math.abs(lzr) then
			break
		end
		a, b = QuadSD(NN, u, v, p, qp)
		log("a = "..a.."	b = "..b)
		local mp = math.abs(a - szr*b) + math.abs(szi*b)
		local zm = math.sqrt(math.abs(v))
		local ee = 2.0*math.abs(qp[1])
		local t = -szr*b
		for i = 2, N do
			ee = ee*zm + math.abs(a + t)
		end
		ee = (9.0*ee + 2.0*math.abs(t) - 7.0*(math.abs(a + t) + zm*math.abs(b)))*eta
		if mp <= 20.0*ee then
			NZ = 2
			break
		end
		j = j + 1
		if j > 20 then
			--log("QuadIT 20 iterations")
			break
		end
		if j >=2 then
			if (relstp <= 0.01) and (mp >= omp) and (not triedFlag) then
				relstp = (relstp < eta) and math.sqrt(eta) or math.sqrt(relstp)
				u = u - u*relstp
				v = v + v*relstp
				a, b = QuadSD(NN, u, v, p ,qp)
				for i = 1, 5 do
					tFlag, a1, a3, a7, c, d, e, f, g, h = CalcSC(N, a, b, K, u, v, qk)
					a3, a7 = nextK(N, tFlag, a, b, a1, a3, a7, K, qk, qp)
				end
				triedFlag = true
				j = 0
			end
		end
		omp = mp
		tFlag, a1, a3, a7, c, d, e, f, g, h = CalcSC(N, a, b, K, u, v, qk)
		a3, a7 = nextK(N, tFlag, a, b, a1, a3, a7, K, qk, qp)
		tFlag, a1, a3, a7, c, d, e, f, g, h = CalcSC(N, a, b, K, u, v, qk)
		ui, vi = newest(tFlag, a, a1, a3, a7, b, c, d, f, g, h, u, v, K, N, p)
		if vi ~= 0 then
			relstp = math.abs((vi - v)/vi)
			u = ui
			v = vi
		end
	until vi == 0
	log("return with "..NZ.." zeros")
	log("sz = "..szr.." + "..szi.."i")
	log("lz = "..lzr.." + "..lzi.."i")
	return NZ, szr, szi, lzr, lzi, a, b, a1, a3, a7, d, e, f, g, h
end]]--

local function Fxshfr(L2, sr, bnd, K, N, p, NN, qp)
	--log("Fxshfr")
	--log("sr = "..sr.."	bnd = "..bnd)
	local NZ = 0
	local betav = 0.25
	local betas = 0.25
	local u = -(2.0*sr)
	local oss = sr
	local ovv = bnd
	local v = bnd
	local a, b = QuadSD(NN, u, v, p, qp)
	--log("a = "..a.."	b = "..b)
	local qk = {}
	local tFlag, a1, a3, a7, c, d, e, f, g, h = CalcSC(N, a, b, K, u, v, qk)
	--log("tFlag = "..tFlag)
	local otv, ots, szr, szi, lzr, lzi
	for j = 1, L2 do
		a3, a7 = nextK(N, tFlag, a, b, a1, a3, a7, K, qk, qp)
		tFlag, a1, a3, a7, c, d, e, f, g, h = CalcSC(N, a, b, K, u, v, qk)
		local ui, vi = newest(tFlag, a, a1, a3, a7, b, c, d, f, g, h, u, v, K, N, p)
		--if j < 4 then
		--	log(j..":	ui = "..ui.."	vi = "..vi)
		--end
		local vv = vi
		local ss = (K[N] ~= 0.0) and -p[N+1]/K[N] or 0.0
		local tv = 1.0
		local ts = 1.0
		if (j ~= 1) and (tFlag ~= 3) then
			tv = (vv ~= 0.0) and math.abs((vv - ovv)/vv) or tv
			ts = (ss ~= 0.0) and math.abs((ss - oss)/ss) or ts
			local tvv = (tv < otv) and tv*otv or 1.0
			local tss = (ts < ots) and ts*ots or 1.0
			local vpass = (tvv < betav)
			local spass = (tss < betas)
			if vpass or spass then
				local svk = {}
				for i = 1, N do
					svk[i] = K[i]
				end
				local s = ss
				local vtry = false
				local stry = false
				local fflag = true
				repeat
					local iFlag = true
					if fflag and spass and ((not vpass) or (tss < tvv)) then
						fflag = false
					else
						fflag = false
						--if j < 4 then
						--	log("QuadIT")
						--end
						NZ, szr, szi, lzr, lzi, a, b, a1, a3, a7, d, e, f, g, h = QuadIT(N, ui, vi, qp, NN, p, qk, K)
						if NZ > 0 then
							--log("return with "..NZ.." zeros")
							return NZ, lzr, lzi, szr, szi
						end
						vtry = true
						betav = betav*0.25
						if stry or (not spass) then
							iFlag = false
						else
							for i = 1, N do
								K[i] = svk[i]
							end
						end
					end
					if iFlag then
						iFlag, NZ, s, szr, szi = RealIT(s, N, p, NN, qp, K, qk)
						--log("called from Fxshfr")
						if NZ > 0 then
							--log("return with "..NZ.." zeros, but at the other point")
							return NZ, lzr, lzi, szr, szi
						end
						stry = true
						betas = betas*0.25
						if iFlag then
							ui = -(s + s)
							vi = s*s
							--continue
						end
					end
					if (not iFlag) then
						for i = 1, N do
							K[i] = svk[i]
						end
					end
					--log("und noch ein Durchlauf")
				until (not vpass) or vtry
				a, b = QuadSD(NN, u, v, p, qp)
				tFlag, a1, a3, a7, c, d, e, f, g, h = CalcSC(N, a, b, K, u, v, qk)
			end
		end
		--log("tFlag = "..tFlag)
		ovv = vv
		oss = ss
		otv = tv
		ots = ts
	end
	--log("default return; with L2 = "..L2)
	return NZ, lzr, lzi, szr, szi
end

--- Finds all real roots of a given polynomial
-- after Jenkins-Traub algorithm: http://www.akiti.ca/rpoly_ak1_cpp.html or http://www.crbond.com/download/misc/rpoly.cpp
-- @param coefficients list - list of polynomial coefficients ordered after ascending power of x
-- @return list - list of all real roots of the polynomial; an empty list if all roots are complex. Multiple zeros are listed as often as their multiplicities
local FLT_MAX = math.ldexp(1.0, 128)
local FLT_MIN = math.ldexp(1.0, -126)
local lo = FLT_MIN/eta
local lb2 = math.log(2.0)
function math.realRootsOfPolynomial(coefficients)
	local xx = math.sqrt(0.5)
	local yy = -xx
	local rot = 94.0*math.pi/180.0
	local sinr = math.sin(rot)
	local cosr = math.cos(rot)
	--log("complex rotation = "..cosr.." + i"..sinr)
	if coefficients[1] == 0.0 then
		table.remove(coefficients, 1)
		--log("Removing leading zeros")
		return math.realRootsOfPolynomial(coefficients)
	end
	local NN = #coefficients
	local N = NN - 1	-- degree of polynomial
	if coefficients[NN] == 0.0 then
		--log("eine Nullstelle ist schon mal 0")
		--log("coefficients["..NN.."] = "..coefficients[NN])
		table.remove(coefficients)
		local ret = math.realRootsOfPolynomial(coefficients)
		table.insert(ret, 0.0)
		return ret
	end
	if N == 1 then
		return {-coefficients[2]/coefficients[1]}
	elseif N == 2 then
		--log("nur noch 2 Nullstellen")
		local zero1, zero2 = math.solveSq(coefficients[1], coefficients[2], coefficients[3])
		if zero1 then
			if zero2 then
				return {zero1, zero2}
			else
				return {zero1, zero1}
			end
		else
			return {}
		end
	end
	
	-- put these coefficients out of the function once the debugging phase is over
	
	local moduli_max = 0.0
	local moduli_min = FLT_MAX
	for i = 1, NN do
		local x = math.abs(coefficients[i])
		if x > moduli_max then
			moduli_max = x
		end
		if (x ~= 0) and (x < moduli_min) then
			moduli_min = x
		end
	end
	--log("moduli_min = "..moduli_min)
	local sc = lo/moduli_min
	if ((sc <= 1.0) and (moduli_max >= 10)) or ((sc > 1.0) and (FLT_MAX/sc >= moduli_max)) then
		--log("lo = "..lo)
		--log("sc = "..sc)
		if sc < FLT_MIN then
			sc = FLT_MIN
		end
		local l = math.floor(math.log(sc)/lb2 + 0.5)
		local factor = math.ldexp(1.0, l)
		--log("Scaling by factor of "..factor)
		if factor ~= 1.0 then
			for i = 1, NN do
				coefficients[i] = coefficients[i]*factor
			end
		end
	end
	
	local pt = {}
	for i = 1, NN do
		pt[i] = math.abs(coefficients[i])
	end
	pt[NN] = -pt[NN]
	--local NM1 = N - 1
	local x = math.exp((math.log(-pt[NN]) - math.log(pt[1]))/N)
	if pt[N] ~= 0.0 then
		local xm = -pt[NN]/pt[N]
		x = math.min(xm, x)
	end
	local xm = x
	while true do
		xm = x*0.1
		local ff = math.evaluatePolynomial(pt, xm)
		-- local ff = pt[1]
		-- for i = 2, NN do
			-- ff = ff*xm + pt[i]
		-- end
		if ff <= 0.0 then
			break
		end
		x = xm
	end
	local dx = x
	--log("x = "..x)
	while math.abs(dx/x) > 0.005 do
		local ff = pt[1]
		local df = ff
		for i = 2, N do
			ff = ff*x + pt[i]
			df = df*x + ff
		end
		ff = ff*x + pt[NN]
		dx = ff/df
		x = x - dx
		--log("x = "..x)
	end
	local bnd = x
	
	local K = {}
	K[1] = coefficients[1]
	for i = 2, N do
		K[i] = (NN - i)*coefficients[i]/N
	end
	local aa = coefficients[NN]
	local bb = coefficients[N]
	local zerok = (K[N] == 0.0)
	for jj = 1, 5 do	-- magic constant
		local cc = K[N]
		if zerok then
			for j = N, 2, -1 do
				K[j] = K[j-1]
			end
			K[1] = 0.0
			zerok = (K[N] == 0.0)
		else
			local t = -aa/cc
			for j = N, 2, -1 do
				K[j] = K[j-1]*t + coefficients[j]
			end
			K[1] = coefficients[1]
			zerok = (math.abs(K[N]) <= math.abs(bb)*eta*10.0)
		end
	end
	local temp = {}
	for i = 1, N do
		temp[i] = K[i]
	end
	for jj = 1, 20 do
		local xxx = cosr*xx - sinr*yy
		--log("xxx = "..xxx)
		yy = cosr*xx + sinr*yy
		xx = xxx
		local sr = bnd*xx
		local qp = {}	-- passed per reference to Fxshfr as well as K and coefficients
		local NZ, lzr, lzi, szr, szi = Fxshfr(20*jj, sr, bnd, K, N, coefficients, NN, qp)	-- Here also complex-valued zeros are returned: z1 = lzr + lzi*i, z2 = szr + szi*i where lzi = -szi
		--log("lz: "..(lzr or 0).." + "..(lzi or 0).."i	sz: "..(szr or 0).." + "..(szi or 0).."i")
		--log(NZ.." zeros found")
		-- for key, value in pairs(qp) do
			-- log("qp["..key.."] = "..value)
		-- end
		if NZ == 0 then
			for i = 1, N do
				K[i] = temp[i]
			end
		else
			table.remove(qp)
			if NZ == 2 then
				table.remove(qp)
				return math.realRootsOfPolynomial(qp)
			else
				local ret = math.realRootsOfPolynomial(qp)
				table.insert(ret, szr)
				return ret
			end
		end
		-- check convergence after 20 iterations
	end
	log("Didn't find a solution after 20 iterations, call a doctor")
	log("f(x) = "..math.polynomialToString(coefficients))
	return {}
end

function math.polynomialToString(coefficients)
	local str = coefficients[1].."x^"..(#coefficients-1)
	for i = 2, #coefficients-2 do
		str = str.." + "..coefficients[i].."x^"..(#coefficients-i)
	end
	str = str.." + "..coefficients[#coefficients-1].."x + "..coefficients[#coefficients]
	return str
end

--- Rounds value towards dest.
-- The function provides a helper to implement hysteresis for certain functions.
-- If the value is in the interval [dest-0.5-spacing/2, dest+0.5+spacing/2] then dest is returned.
-- Otherwise it behaves like math.round.
-- @name roundTowards
-- @param val number - value to round
-- @param dest number - value to round towards, must be an integer
-- @param spacing number - spacing between to numbers where we round towards dest
function math.roundTowards(val, dest, spacing)
	if val > dest + 0.5 + spacing/2 or val < dest - 0.5 - spacing/2 then
		return math.round(val)
	else
		return dest
	end
end

--- Rounds value upwards.
-- The function provides a helper to implement hysteresis for certain functions.
-- Rounds the suffixes in [0.5 - spacing, 1] upwards
-- @name roundUpwards
-- @param val number - value to round
-- @param spacing number - tolerance for rounding up
function math.roundUpwards(val, spacing)
	if val + spacing + 0.5 >= math.ceil(val) then
		return math.ceil(val)
	else
		return math.floor(val)
	end
end

--- Round value to idp digits
-- @usage round(1.23, 1) -- 1.2
-- @name round
-- @param val number
-- @param digits number - digits to keep after decimal dot
-- @return number - rounded value
function math.round(val, digits)
	local fac = 10^(digits or 0)
	return math.floor(val * fac + 0.5) / fac
end


--- Solves a*t + b for t
--@name solveLin
--@param a number
--@param b number
--@return [number]
function math.solveLin(a, b)
	if a == 0 then
		return
	end
	return -b/a
end


local function sgn(number)
	if number >= 0 then
		return 1
	else
		return -1
	end
end

--- Solves a*t^2 + b*t + c for t
-- @name solveSq
-- @param a number
-- @param b number
-- @param c number
-- @return [number - smallest positive solution or largest
-- @return [number]]
function math.solveSq(a, b, c)
	if a == 0 then
		-- return math.solveLin(b, c)
		if b == 0 then
			return
		else
			return -c/b
		end
	end

	local det = b*b - 4*a*c
	if det < 0 then
		return
	elseif det == 0 then
		return -b/(2*a)
	end
	det = math.sqrt(det)
	local t2 = (-b-sgn(b)*det)/(2*a)
	local t1 = c/(a*t2)
	local min = math.min(t1, t2)

	-- if both are >= 0 return smallest
	-- if only one is >= 0 the it's the larger value of both
	-- and the smallest positive solution
	if (min >= 0 and t1 < t2) or (min < 0 and t1 >= t2) then
		return t1, t2
	else
		return t2, t1
	end
end

--- "Calculates" the signum of a number
-- @name sign
-- @param number number
-- @return number - 1 for postive number, -1 for negative number, 0 for 0
function math.sign(number)
	if number > 0 then
		return 1
	elseif number < 0 then
		return -1
	else
		return 0
	end
end

function math.average(array, indexStart, indexEnd)
	local sum = 0
	local n
	if indexStart then
		indexEnd = indexEnd or #array
		for i = indexStart, indexEnd do
			sum = sum + array[i]
		end
		n = indexEnd - indexStart + 1
	else
		for _, v in ipairs(array) do
			sum = sum + v
		end
		n = #array
	end
	return sum/n
end

function math.variance(array, average, indexStart, indexEnd)
	indexStart = indexStart or 1
	indexEnd = indexEnd or #array
	average = average or math.average(array, indexStart, indexEnd)
	local variance = 0
	for i = indexStart, indexEnd do
		local diff = array[i] - average
		variance = variance + diff*diff
	end
	local n = indexEnd - indexStart + 1
	return variance/n
end

return math
