# ***************************************************************************
# *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

add_subdirectory(tracking)

if(TARGET tracking)

include_directories(${PROTOBUF_INCLUDE_DIR})

if(USB_FOUND)
    include_directories(${USB_INCLUDE_DIR})
endif()

set(SOURCES
    accelerator.cpp
    accelerator.h
    controller.cpp
    controller.h
    debughelper.cpp
    debughelper.h
    processor.cpp
    processor.h
    referee.cpp
    referee.h
    transceiver.cpp
    transceiver.h
)

if(USB_FOUND)
    set(SOURCES ${SOURCES} usbdevice.cpp usbdevice.h)
endif()

add_library(processor ${SOURCES})
target_link_libraries(processor tracking)
qt5_use_modules(processor Core)

if(USB_FOUND)
    target_link_libraries(processor ${USB_LIBRARIES})
endif()

endif()
