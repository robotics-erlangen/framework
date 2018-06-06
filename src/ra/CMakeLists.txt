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

add_subdirectory(guihelper)
add_subdirectory(input)
add_subdirectory(logfile)
add_subdirectory(plotter)
add_subdirectory(widgets)

add_executable(ra WIN32 MACOSX_BUNDLE
    configdialog.cpp
    configdialog.h
    internalreferee.cpp
    internalreferee.h
    inputwidget.cpp
    inputwidget.h
    mainwindow.cpp
    mainwindow.h
    ra.cpp
    refereewidget.cpp
    refereewidget.h
    resettableitemdelegate.cpp
    resettableitemdelegate.h
    robotselectionwidget.cpp
    robotselectionwidget.h
    robotspecsdialog.cpp
    robotspecsdialog.h
    robotwidget.cpp
    robotwidget.h
    optionswidget.cpp
    optionswidget.h
    simulatorwidget.cpp
    simulatorwidget.h
)

add_custom_command(
    OUTPUT ${CMAKE_BINARY_DIR}/startRa.sh
    COMMAND cp ${CMAKE_SOURCE_DIR}/cmake/startRa.sh ${CMAKE_BINARY_DIR}/startRa.sh
    DEPENDS ${CMAKE_SOURCE_DIR}/cmake/startRa.sh
)

add_custom_target(generateStartRa DEPENDS ${CMAKE_BINARY_DIR}/startRa.sh)
add_dependencies(ra generateStartRa)

set(UI_SOURCES
    configdialog.ui
    inputwidget.ui
    mainwindow.ui
    refereewidget.ui
    robotselectionwidget.ui
    robotspecsdialog.ui
    optionswidget.ui
    simulatorwidget.ui
)
qt5_wrap_ui(UIC_SOURCES ${UI_SOURCES})
target_sources(ra PRIVATE ${UIC_SOURCES})

if(MINGW)
    target_sources(ra PRIVATE ${CMAKE_SOURCE_DIR}/data/pkg/ra.rc)
endif(MINGW)

# add ra icon
if(APPLE)
    set(RA_ICON ${CMAKE_SOURCE_DIR}/data/pkg/ra.icns)
    set_source_files_properties(${RA_ICON} PROPERTIES MACOSX_PACKAGE_LOCATION Resources)
    target_sources(ra PRIVATE ${RA_ICON})
endif(APPLE)

target_link_libraries(ra
    amun::amun
    shared::core
    shared::config
    shared::protobuf
    ra::guihelper
    ra::input
    ra::logfile
    ra::plotter
    ra::widgets
    ${OPENGL_LIBRARIES}
    ${CMAKE_THREAD_LIBS_INIT}
    Qt5::Widgets
    Qt5::OpenGL
)
target_include_directories(ra
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)
if (TARGET lib::jemalloc)
    target_link_libraries(ra lib::jemalloc)
endif()

# add plist file
if(APPLE)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_INFO_PLIST ${CMAKE_SOURCE_DIR}/data/pkg/MacBundleInfo.plist.in)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_ICON_FILE ra.icns)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_GUI_IDENTIFIER de.robotics-erlangen.Ra)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_BUNDLE_NAME Ra)
endif(APPLE)
