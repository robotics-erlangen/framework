# ***************************************************************************
# *   Copyright 2022 Tobias Heineken, Yannik Lorenz                         *
# *   Robotics Erlangen e.V.                                                *
# *   http://www.robotics-erlangen.de/                                      *
# *   info@robotics-erlangen.de                                             *
# *                                                                         *
# *   This program is free software: you can redistribute it and/or modify  *
# *   it under the terms of the GNU General Public License as published by  *
# *   the Free Software Foundation, either version 3 of the License, or     *
# *   any later version.                                                    *
# *                                                                         *
# *   This program is distributed in the hope that it will be useful,       *
# *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
# *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
# *   GNU General Public License for more details.                          *
# *                                                                         *
# *   You should have received a copy of the GNU General Public License     *
# *   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
# ***************************************************************************

file(STRINGS "${V8_INCLUDE_DIR}/v8-version.h" V8_VERSION_MAJOR_LINE REGEX "^#define[ \t]+V8_MAJOR_VERSION[ \t]+([0-9]+)$")
file(STRINGS "${V8_INCLUDE_DIR}/v8-version.h" V8_VERSION_MINOR_LINE REGEX "^#define[ \t]+V8_MINOR_VERSION[ \t]+([0-9]+)$")
file(STRINGS "${V8_INCLUDE_DIR}/v8-version.h" V8_VERSION_PATCH_LINE REGEX "^#define[ \t]+V8_PATCH_LEVEL[ \t]+([0-9]+)$")
string(REGEX REPLACE "^#define[ \t]+V8_MAJOR_VERSION[ \t]+([0-9]+)$" "\\1" V8_VERSION_MAJOR "${V8_VERSION_MAJOR_LINE}")
string(REGEX REPLACE "^#define[ \t]+V8_MINOR_VERSION[ \t]+([0-9]+)$" "\\1" V8_VERSION_MINOR "${V8_VERSION_MINOR_LINE}")
string(REGEX REPLACE "^#define[ \t]+V8_PATCH_LEVEL[ \t]+([0-9]+)$" "\\1" V8_VERSION_PATCH "${V8_VERSION_PATCH_LINE}")
set(V8_VERSION ${V8_VERSION_MAJOR}.${V8_VERSION_MINOR}.${V8_VERSION_PATCH})
unset(V8_VERSION_MAJOR_LINE)
unset(V8_VERSION_MINOR_LINE)
unset(V8_VERSION_PATCH_LINE)
unset(V8_VERSION_MAJOR)
unset(V8_VERSION_MINOR)
unset(V8_VERSION_PATCH)

if (NOT ${REQUESTED_V8_VERSION} STREQUAL "")
    if (NOT ${V8_VERSION} STREQUAL ${REQUESTED_V8_VERSION})
        message(FATAL_ERROR "Expected V8 version was ${REQUESTED_V8_VERSION} but found ${V8_VERSION}")
    endif ()
endif ()
