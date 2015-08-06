# ***************************************************************************
# *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

if(TARGET protobuf AND QT_FOUND)

include_directories(${PROTOBUF_INCLUDE_DIR})

set(SOURCES
    leaffilterproxymodel.cpp
    leaffilterproxymodel.h
    ../guitimer.cpp
    ../guitimer.h
    plot.cpp
    plot.h
    plotter.cpp
    plotter.h
    plotterwidget.cpp
    plotterwidget.h
    texturecache.cpp
    texturecache.h
)

set(UI_SOURCES
    plotter.ui
)

qt5_wrap_ui(UIC_SOURCES ${UI_SOURCES})

add_library(plotter ${SOURCES} ${UIC_SOURCES})
target_link_libraries(plotter protobuf ${OPENGL_LIBRARIES})
qt5_use_modules(plotter Widgets OpenGL)

endif()
