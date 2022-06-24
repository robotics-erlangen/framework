# ***************************************************************************
# *   Copyright 2021 Tobias Heineken                                        *
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

execute_process(COMMAND ${CMAKE_COMMAND} -E touch ${CMAKE_CURRENT_BINARY_DIR}/stamp)
if(MINGW)
    # MINGW relies on copying config into ${CMAKE_RUNTIME_OUTPUT_DIR}, where it will not be part of a git folder.
    # In order to be able to reconstruct the config that is present in a logfile, RA needs the config folder to be part of a git.
    # In the regular build, this is just the normal git-repository,
    # but in the MINGW build, we need to create this repository, and add its new hash as a basline to gitconfig.cpp.
    # This allows us to announce the config state during runtime as the config state during build.
    # combined with all the differences that can be discovered live.

    # However, we cannot handle the case where there are differences between the config used during compilation
    # and the config that was used in git. To solve this issue,
    # we make sure that only the unmodifed config folder will be copied into ${CMAKE_RUNTIME_OUTPUT_DIR}.

    # To get a fresh config, we can use the git tree-ish `HEAD^{tree}:config`.
    # This tree-ish only contains the content of the subfolder config.
    # We then use git archieve to pack an archive from that tree-ish

    # As we do not care about the working tree, but just the commit, we can just depend on gitconfig.cpp.
    # We don't need to depend on the files themselves - we don't really care if they changed
    # as long as there wasn't a new commit - a new commit would have changed gitconfig.cpp

    add_custom_command(
        OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/config.tar
        DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/gitconfig.cpp
        COMMAND git archive --format=tar --prefix=config/ --output=${CMAKE_CURRENT_BINARY_DIR}/config.tar HEAD^{tree}:config
        COMMENT "Pack config folder"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        VERBATIM
    )

    add_custom_command(
        OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/clear.stamp
        DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/config.tar
        COMMAND ${CMAKE_COMMAND} -E remove_directory ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/config
        COMMAND ${CMAKE_COMMAND} -E touch ${CMAKE_CURRENT_BINARY_DIR}/clear.stamp
        COMMENT "Clearing up old config folder"
    )

    add_custom_command(
        OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/extr.stamp
        DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/clear.stamp
        COMMAND ${CMAKE_COMMAND} -E tar x ${CMAKE_CURRENT_BINARY_DIR}/config.tar
        COMMAND ${CMAKE_COMMAND} -E touch ${CMAKE_CURRENT_BINARY_DIR}/extr.stamp
        COMMENT "Depack config folder"
        WORKING_DIRECTORY ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}
        VERBATIM
    )

    add_custom_command(
        OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/gitinit.stamp
        DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/extr.stamp
        COMMAND git init -q ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/config
        COMMAND ${CMAKE_COMMAND} -E touch ${CMAKE_CURRENT_BINARY_DIR}/gitinit.stamp
        COMMENT "Initialize config git"
    )

    add_custom_command(
        OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/add.stamp
        DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/gitinit.stamp
        COMMAND git add -A
        COMMAND ${CMAKE_COMMAND} -E touch ${CMAKE_CURRENT_BINARY_DIR}/add.stamp
        COMMENT "Add config git"
        WORKING_DIRECTORY ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/config
    )

    add_custom_command(
        OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/config.stamp
        DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/add.stamp
        COMMAND git config user.email "info@robotics-erlangen.de"
        COMMAND git config user.name "Robotics Erlangen e.V."
        COMMAND git commit -m "initial commit" -n --no-gpg-sign -q
        COMMAND ${CMAKE_COMMAND} -E touch ${CMAKE_CURRENT_BINARY_DIR}/config.stamp
        COMMENT "Commit config git"
        WORKING_DIRECTORY ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/config
    )
else()
    add_custom_command(
        OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/config.stamp
        COMMAND ${CMAKE_COMMAND} -E touch ${CMAKE_CURRENT_BINARY_DIR}/config.stamp
        COMMENT "Creating config git"
    )
endif()

add_custom_command(
    OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/gitconfig.cpp"
    MAIN_DEPENDENCY gitconfig.cpp.in
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/stamp
    DEPENDS ${CMAKE_SOURCE_DIR}/cmake/checkGit.cmake
    COMMAND ${CMAKE_COMMAND} -D TARGET=${CMAKE_CURRENT_BINARY_DIR}/gitconfig.cpp -D GIT_BASE_DIR=${CMAKE_SOURCE_DIR} -D SOURCE=${CMAKE_CURRENT_SOURCE_DIR}/gitconfig.cpp.in -D STAMP=${CMAKE_CURRENT_BINARY_DIR}/stamp -D ESCAPE=${MINGW} -P ${CMAKE_SOURCE_DIR}/cmake/checkGit.cmake
    COMMENT "Checking git"
)

add_library(gitconfig STATIC
    ${CMAKE_CURRENT_BINARY_DIR}/gitconfig.cpp
    include/git/gitconfig.h
    gitlive.cpp
    ${CMAKE_CURRENT_BINARY_DIR}/config.stamp
)

target_include_directories(gitconfig
    INTERFACE include
    PRIVATE include/git
)

target_link_libraries(gitconfig
    PRIVATE lib::git2
    PRIVATE Qt5::Core
)

add_library(shared::gitconfig ALIAS gitconfig)
