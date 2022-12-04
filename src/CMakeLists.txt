# ***************************************************************************
# *   Copyright 2015 Michael Bleier, Philipp Nordhus                        *
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

# firmware
add_subdirectory(firmware)

# libs
add_subdirectory(config)
add_subdirectory(git)
add_subdirectory(core)
add_subdirectory(protobuf)
add_subdirectory(amun)
add_subdirectory(visionlog)
add_subdirectory(timeline)

# apps
add_subdirectory(ra)
add_subdirectory(logplayer)
add_subdirectory(amuncli)
add_subdirectory(replaycli)
add_subdirectory(visionanalyzer)
add_subdirectory(logcuttercli)
add_subdirectory(loganalyzer)
add_subdirectory(trajectorycli)
add_subdirectory(tests)
add_subdirectory(simulator)

#info
configure_file(defs.txt.in defs.txt)
