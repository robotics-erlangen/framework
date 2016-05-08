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

set(SOURCES
    amunclient.cpp
    amunclient.h
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
    robotparametersdialog.cpp
    robotparametersdialog.h
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
    teamwidget.cpp
    teamwidget.h
)

set(UI_SOURCES
    configdialog.ui
    inputwidget.ui
    mainwindow.ui
    refereewidget.ui
    robotparametersdialog.ui
    robotselectionwidget.ui
    robotspecsdialog.ui
    optionswidget.ui
    simulatorwidget.ui
)

if(MINGW)
    list(APPEND SOURCES ${CMAKE_SOURCE_DIR}/data/pkg/ra.rc)
endif(MINGW)

# add ra icon
if(APPLE)
    set(RA_ICON ${CMAKE_SOURCE_DIR}/data/pkg/ra.icns)
    set_source_files_properties(${RA_ICON} PROPERTIES MACOSX_PACKAGE_LOCATION Resources)
    list(APPEND SOURCES ${RA_ICON})
endif(APPLE)

qt5_wrap_ui(UIC_SOURCES ${UI_SOURCES})

add_executable(ra WIN32 MACOSX_BUNDLE ${SOURCES} ${UIC_SOURCES})
target_link_libraries(ra
    amun::amun
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

# add plist file
if(APPLE)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_INFO_PLIST ${CMAKE_SOURCE_DIR}/data/pkg/MacBundleInfo.plist.in)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_ICON_FILE ra.icns)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_GUI_IDENTIFIER de.robotics-erlangen.Ra)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_BUNDLE_NAME Ra)

    # required by LuaJIT for 64bit
    set_property(TARGET ra APPEND PROPERTY LINK_FLAGS "-pagezero_size 10000 -image_base 100000000")
endif(APPLE)
