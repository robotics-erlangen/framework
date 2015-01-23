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

if(TARGET core AND TARGET protobuf AND TARGET logfile)

include_directories(${CMAKE_CURRENT_BINARY_DIR})
include_directories(${PROTOBUF_INCLUDE_DIR})

set(SOURCES
    logplayer.cpp
    mainwindow.cpp
    mainwindow.h
    ../ra/debugmodel.cpp
    ../ra/debugmodel.h
    ../ra/debugtreewidget.cpp
    ../ra/debugtreewidget.h
    ../ra/fieldwidget.cpp
    ../ra/fieldwidget.h
    ../ra/logwidget.cpp
    ../ra/logwidget.h
    ../ra/refereestatuswidget.cpp
    ../ra/refereestatuswidget.h
    ../ra/timingwidget.cpp
    ../ra/timingwidget.h
    ../ra/visualizationwidget.cpp
    ../ra/visualizationwidget.h
)

set(UI_SOURCES
    mainwindow.ui
    ../ra/refereestatuswidget.ui
    ../ra/timingwidget.ui
    ../ra/visualizationwidget.ui
)

if(MINGW)
    set(SOURCES ${SOURCES} ${CMAKE_SOURCE_DIR}/data/pkg/logplayer.rc)
endif(MINGW)

# add logplayer icon
if(APPLE)
    set(LOGPLAYER_ICON ${CMAKE_SOURCE_DIR}/data/pkg/logplayer.icns)
    set_source_files_properties(${LOGPLAYER_ICON} PROPERTIES MACOSX_PACKAGE_LOCATION Resources)
    set(SOURCES ${SOURCES} ${LOGPLAYER_ICON})
endif(APPLE)

qt5_wrap_ui(UIC_SOURCES ${UI_SOURCES})
 
add_executable(logplayer WIN32 MACOSX_BUNDLE ${SOURCES} ${UIC_SOURCES})
target_link_libraries(logplayer core protobuf logfile plotter ${OPENGL_LIBRARIES})
qt5_use_modules(logplayer Widgets OpenGL)

# add plist file
if(APPLE)
    set_target_properties(logplayer PROPERTIES MACOSX_BUNDLE_INFO_PLIST ${CMAKE_SOURCE_DIR}/data/pkg/MacBundleInfo.plist.in)
    set_target_properties(logplayer PROPERTIES MACOSX_BUNDLE_ICON_FILE logplayer.icns)
    set_target_properties(logplayer PROPERTIES MACOSX_BUNDLE_GUI_IDENTIFIER com.er-force.LogPlayer)
    set_target_properties(logplayer PROPERTIES MACOSX_BUNDLE_BUNDLE_NAME "Ra Log Player")
endif(APPLE)

endif()
