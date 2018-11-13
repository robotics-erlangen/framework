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

add_executable(logplayer WIN32 MACOSX_BUNDLE
    logplayer.cpp
)

qt5_wrap_ui(UIC_SOURCES ${UI_SOURCES})
target_sources(logplayer PRIVATE ${UIC_SOURCES})

if(MINGW)
    list(APPEND SOURCES ${CMAKE_SOURCE_DIR}/data/pkg/logplayer.rc)
endif(MINGW)

# add logplayer icon
if(APPLE)
    set(LOGPLAYER_ICON ${CMAKE_SOURCE_DIR}/data/pkg/logplayer.icns)
    set_source_files_properties(${LOGPLAYER_ICON} PROPERTIES MACOSX_PACKAGE_LOCATION Resources)
    target_sources(logplayer PRIVATE ${LOGPLAYER_ICON})
endif(APPLE)

target_link_libraries(logplayer
    shared::config
    Qt5::Widgets
    ra::ra-horus
)
v8_copy_deps(logplayer)
target_include_directories(logplayer
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)
if (TARGET lib::jemalloc)
    target_link_libraries(logplayer lib::jemalloc)
endif()

# add plist file
if(APPLE)
    set_target_properties(logplayer PROPERTIES MACOSX_BUNDLE_INFO_PLIST ${CMAKE_SOURCE_DIR}/data/pkg/MacBundleInfo.plist.in)
    set_target_properties(logplayer PROPERTIES MACOSX_BUNDLE_ICON_FILE logplayer.icns)
    set_target_properties(logplayer PROPERTIES MACOSX_BUNDLE_GUI_IDENTIFIER de.robotics-erlangen.LogPlayer)
    set_target_properties(logplayer PROPERTIES MACOSX_BUNDLE_BUNDLE_NAME "Ra Log Player")
endif(APPLE)
