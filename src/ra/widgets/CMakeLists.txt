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

add_library(widgets STATIC
    include/widgets/debuggerconsole.h
    include/widgets/debugwidget.h
    include/widgets/fieldwidget.h
    include/widgets/logwidget.h
    include/widgets/logslider.h
    include/widgets/refereestatuswidget.h
    include/widgets/timingwidget.h
    include/widgets/visualizationproxymodel.h
    include/widgets/visualizationwidget.h
    include/widgets/teamwidget.h
    include/widgets/replayteamwidget.h

    debuggerconsole.cpp
    debugmodel.cpp
    debugmodel.h
    debugtreewidget.cpp
    debugtreewidget.h
    debugwidget.cpp
    fieldwidget.cpp
    goalselectionwidget.h
    goalselectionwidget.cpp
    logslider.cpp
    logwidget.cpp
    refereestatuswidget.cpp
    savesituation.cpp
    savesituationtypescript.cpp
    savesituation.h
    timingwidget.cpp
    virtualfieldsetupdialog.h
    virtualfieldsetupdialog.cpp
    visualizationproxymodel.cpp
    visualizationwidget.cpp
    teamwidget.cpp
    replayteamwidget.cpp
)

set(UI_SOURCES
    debugwidget.ui
    logslider.ui
    refereestatuswidget.ui
    timingwidget.ui
    virtualfieldsetupdialog.ui
    visualizationwidget.ui
    replayteamwidget.ui
)
qt5_wrap_ui(UIC_SOURCES ${UI_SOURCES})
target_sources(widgets PRIVATE ${UIC_SOURCES})

target_link_libraries(widgets
    PRIVATE shared::core
    PRIVATE shared::config
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

if (TARGET Qt5::Svg)
    target_compile_definitions(widgets PUBLIC QTSVG_FOUND)
    target_link_libraries(widgets
        PRIVATE Qt5::Svg
    )
endif()

if(${EASY_MODE})
	target_compile_definitions(widgets PRIVATE EASY_MODE)
endif()

add_library(ra::widgets ALIAS widgets)
