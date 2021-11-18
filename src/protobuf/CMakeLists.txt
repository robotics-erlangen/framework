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

add_library(protobuf STATIC
    include/protobuf/command.h
    include/protobuf/geometry.h
    include/protobuf/robot.h
    include/protobuf/robotcommand.h
    include/protobuf/ssl_referee.h
    include/protobuf/status.h
    include/protobuf/sslsim.h

    command.cpp
    geometry.cpp
    robot.cpp
    ssl_referee.cpp
)

set(PROTO_FILES
    command.proto
    debug.proto
    gamestate.proto
    logfile.proto
    robot.proto
    ssl_detection.proto
    ssl_game_controller_auto_ref.proto
    ssl_game_controller_common.proto
    ssl_game_controller_geometry.proto
    ssl_game_controller_team.proto
    ssl_game_event_2019.proto
    ssl_geometry.proto
    ssl_gc_api.proto
    ssl_gc_ci.proto
    ssl_gc_change.proto
    ssl_gc_engine_config.proto
    ssl_gc_engine.proto
    ssl_gc_state.proto
    ssl_mixed_team.proto
    ssl_referee.proto
    ssl_referee_game_event.proto
    ssl_vision_detection_tracked.proto
    ssl_vision_wrapper_tracked.proto
    ssl_simulation_robot_control.proto
    ssl_simulation_error.proto
    ssl_simulation_robot_feedback.proto
    ssl_simulation_control.proto
    ssl_simulation_config.proto
	ssl_simulation_custom_erforce_realism.proto
    ssl_wrapper.proto
    status.proto
    userinput.proto
    world.proto
    timeline.proto
    pathfinding.proto
    grsim_commands.proto
    grsim_packet.proto
    grsim_replacement.proto
    ssl_simulation_custom_erforce_robot_spec.proto
)
protobuf_generate_cpp(PROTO_SOURCES PROTO_HEADERS ${PROTO_FILES})
target_sources(protobuf PRIVATE ${PROTO_SOURCES} ${PROTO_HEADERS} ${PROTO_FILES})

# disable warnings for generated files
target_compile_options(protobuf PUBLIC -w)

target_link_libraries(protobuf
    PUBLIC ${PROTOBUF_LIBRARY}
    PUBLIC Threads::Threads
    PUBLIC Qt5::Core
)
target_include_directories(protobuf
    PUBLIC include
    PUBLIC ${CMAKE_CURRENT_BINARY_DIR}/..
    PRIVATE include/protobuf
)
target_include_directories(protobuf SYSTEM
    PUBLIC ${PROTOBUF_INCLUDE_DIR}
    PRIVATE ${PROTOBUF_INCLUDE_DIR}
)

if(MINGW)
    # silence unsigned vs. signed comparison warnings in protobuf headers
    set_property(TARGET protobuf APPEND PROPERTY COMPILE_FLAGS "-Wno-sign-compare")
endif(MINGW)
if(TARGET project_protobuf)
	add_dependencies(protobuf project_protobuf)
endif()

add_library(shared::protobuf ALIAS protobuf)
