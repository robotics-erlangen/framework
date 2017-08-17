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

set(SOURCES
    include/widgets/debugtreewidget.h
    include/widgets/fieldwidget.h
    include/widgets/logwidget.h
    include/widgets/refereestatuswidget.h
    include/widgets/timingwidget.h
    include/widgets/visualizationproxymodel.h
    include/widgets/visualizationwidget.h
    include/widgets/teamwidget.h

    debugmodel.cpp
    debugmodel.h
    debugtreewidget.cpp
    fieldwidget.cpp
    logwidget.cpp
    refereestatuswidget.cpp
    savesituation.cpp
    savesituation.h
    timingwidget.cpp
    visualizationproxymodel.cpp
    visualizationwidget.cpp
    teamwidget.cpp
)

set(UI_SOURCES
    refereestatuswidget.ui
    timingwidget.ui
    visualizationwidget.ui
)

qt5_wrap_ui(UIC_SOURCES ${UI_SOURCES})

add_library(widgets ${SOURCES} ${UIC_SOURCES})
target_link_libraries(widgets
    PUBLIC shared::protobuf
    PRIVATE ra::guihelper
    PUBLIC Qt5::Widgets
    PRIVATE Qt5::OpenGL
)
target_include_directories(widgets
    INTERFACE include
    PRIVATE include/widgets
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)

add_library(ra::widgets ALIAS widgets)
