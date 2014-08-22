-----------------------------------------------------------------------------
-- MIME support for the Lua language.
-- Author: Diego Nehab
-- Conforming to RFCs 2045-2049
-----------------------------------------------------------------------------

--[[
LuaSocket 3.0 license
Copyright © 2004-2013 Diego Nehab
Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
]]

--[[***********************************************************************
*   Copyright 2014 Michael Eischer                                        *
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

-----------------------------------------------------------------------------
-- Declare module and import dependencies
-----------------------------------------------------------------------------
local base = _G
local ltn12 = require("ltn12")
local mime = require("mime.core")
local io = require("io")
local string = require("string")
local _M = mime

-- encode, decode and wrap algorithm tables
local encodet, decodet, wrapt = {},{},{}

_M.encodet = encodet
_M.decodet = decodet
_M.wrapt   = wrapt  

-- creates a function that chooses a filter by name from a given table
local function choose(table)
    return function(name, opt1, opt2)
        if base.type(name) ~= "string" then
            name, opt1, opt2 = "default", name, opt1
        end
        local f = table[name or "nil"]
        if not f then 
            base.error("unknown key (" .. base.tostring(name) .. ")", 3)
        else return f(opt1, opt2) end
    end
end

-- define the encoding filters
encodet['base64'] = function()
    return ltn12.filter.cycle(_M.b64, "")
end

encodet['quoted-printable'] = function(mode)
    return ltn12.filter.cycle(_M.qp, "",
        (mode == "binary") and "=0D=0A" or "\r\n")
end

-- define the decoding filters
decodet['base64'] = function()
    return ltn12.filter.cycle(_M.unb64, "")
end

decodet['quoted-printable'] = function()
    return ltn12.filter.cycle(_M.unqp, "")
end

local function format(chunk)
    if chunk then
        if chunk == "" then return "''"
        else return string.len(chunk) end
    else return "nil" end
end

-- define the line-wrap filters
wrapt['text'] = function(length)
    length = length or 76
    return ltn12.filter.cycle(_M.wrp, length, length)
end
wrapt['base64'] = wrapt['text']
wrapt['default'] = wrapt['text']

wrapt['quoted-printable'] = function()
    return ltn12.filter.cycle(_M.qpwrp, 76, 76)
end

-- function that choose the encoding, decoding or wrap algorithm
_M.encode = choose(encodet)
_M.decode = choose(decodet)
_M.wrap = choose(wrapt)

-- define the end-of-line normalization filter
function _M.normalize(marker)
    return ltn12.filter.cycle(_M.eol, 0, marker)
end

-- high level stuffing filter
function _M.stuff()
    return ltn12.filter.cycle(_M.dot, 2)
end

return _M