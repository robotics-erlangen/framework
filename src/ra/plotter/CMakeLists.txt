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

add_library(plotter STATIC
    include/plotter/plot.h
    include/plotter/plotter.h

    leaffilterproxymodel.cpp
    leaffilterproxymodel.h
    plot.cpp
    plotter.cpp
    plotterwidget.cpp
    plotterwidget.h
)

set(UI_SOURCES
    plotter.ui
)
qt5_wrap_ui(UIC_SOURCES ${UI_SOURCES})
target_sources(plotter PRIVATE ${UIC_SOURCES})

target_link_libraries(plotter
    PRIVATE shared::core
    PUBLIC shared::protobuf
    PRIVATE ra::guihelper
    PRIVATE ${OPENGL_LIBRARIES}
    PUBLIC Qt5::Widgets
    PRIVATE Qt5::OpenGL
)
target_include_directories(plotter
    INTERFACE include
    PRIVATE include/plotter
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)

add_library(ra::plotter ALIAS plotter)
