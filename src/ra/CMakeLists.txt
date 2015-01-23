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

add_subdirectory(input)
add_subdirectory(logfile)
add_subdirectory(plotter)

if(TARGET amun AND TARGET input AND TARGET logfile AND TARGET plotter)

include_directories(${CMAKE_CURRENT_BINARY_DIR})
include_directories(${PROTOBUF_INCLUDE_DIR})

set(SOURCES
    amunclient.cpp
    amunclient.h
    configdialog.cpp
    configdialog.h
    debugmodel.cpp
    debugmodel.h
    debugtreewidget.cpp
    debugtreewidget.h
    fieldwidget.cpp
    fieldwidget.h
    internalreferee.cpp
    internalreferee.h
    inputwidget.cpp
    inputwidget.h
    logwidget.cpp
    logwidget.h
    mainwindow.cpp
    mainwindow.h
    ra.cpp
    refereestatuswidget.cpp
    refereestatuswidget.h
    refereewidget.cpp
    refereewidget.h
    robotparametersdialog.cpp
    robotparametersdialog.h
    robotselectionwidget.cpp
    robotselectionwidget.h
    robotspecsdialog.cpp
    robotspecsdialog.h
    robotwidget.cpp
    robotwidget.h
    simulatorwidget.cpp
    simulatorwidget.h
    teamwidget.cpp
    teamwidget.h
    timingwidget.cpp
    timingwidget.h
    visualizationwidget.cpp
    visualizationwidget.h
)

set(UI_SOURCES
    configdialog.ui
    inputwidget.ui
    mainwindow.ui
    refereestatuswidget.ui
    refereewidget.ui
    robotparametersdialog.ui
    robotselectionwidget.ui
    robotspecsdialog.ui
    simulatorwidget.ui
    timingwidget.ui
    visualizationwidget.ui
)

if(MINGW)
    set(SOURCES ${SOURCES} ${CMAKE_SOURCE_DIR}/data/pkg/ra.rc)
endif(MINGW)

# add ra icon
if(APPLE)
    set(RA_ICON ${CMAKE_SOURCE_DIR}/data/pkg/ra.icns)
    set_source_files_properties(${RA_ICON} PROPERTIES MACOSX_PACKAGE_LOCATION Resources)
    set(SOURCES ${SOURCES} ${RA_ICON})
endif(APPLE)

qt5_wrap_ui(UIC_SOURCES ${UI_SOURCES})

add_executable(ra WIN32 MACOSX_BUNDLE ${SOURCES} ${UIC_SOURCES})
target_link_libraries(ra amun input logfile plotter protobuf ${OPENGL_LIBRARIES})
qt5_use_modules(ra Widgets OpenGL)

# add plist file
if(APPLE)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_INFO_PLIST ${CMAKE_SOURCE_DIR}/data/pkg/MacBundleInfo.plist.in)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_ICON_FILE ra.icns)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_GUI_IDENTIFIER com.er-force.Ra)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_BUNDLE_NAME Ra)

    # required by LuaJIT for 64bit
    set(EXTRA_LINK_FLAGS "-pagezero_size 10000 -image_base 100000000")
    get_target_property(RA_LINK_FLAGS ra LINK_FLAGS)
    if(NOT RA_LINK_FLAGS)
        set_target_properties(ra PROPERTIES LINK_FLAGS ${EXTRA_LINK_FLAGS})
    else()
        set_target_properties(ra PROPERTIES LINK_FLAGS "${RA_LINK_FLAGS} ${EXTRA_LINK_FLAGS}")
    endif()
endif(APPLE)

endif()
