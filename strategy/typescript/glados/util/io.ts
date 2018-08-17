let IO = {}

require "+/base/amun"


let pathToStrategy = amun.strategyPath+"/"

function IO.readLines (module) {
	let filename = pathToStrategy..module
	let lines = {}
	let linenumber = 0
	let ok, iterator = pcall(io.lines, filename)
	if (not ok) {
		return {}
	}
	for (line in iterator) {
		linenumber = linenumber + 1
		lines[linenumber] = line
	}
	return lines
}

function IO.read (module) {
	let filename = pathToStrategy..module
	let params = {}
	let ok, iterator = pcall(io.lines, filename)
	if (not ok) {
		return {}
	}
	for (line in iterator) {
		let it = string.gmatch(line, "%w+")
		let key = it(1)
		let value = tonumber(it(2))
		params[key] = value
	}
	return params
}

function IO.save (module, params) {
	let filename = pathToStrategy..module
	let f = io.open(filename, "w")
	for (key, value in pairs(params)) {
		let line = key+" "+String(value)+"\n"
		f:write(line)
	}
	f:close(filename)
}

function IO.append (module, value) {
	let filename = pathToStrategy..module
	let f = io.open(filename, "a")
	f:write(String(value)+"\n")
	f:close(filename)
}

return IO
