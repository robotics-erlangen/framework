# ***************************************************************************
# *   Copyright 2017 Michael Eischer                                        *
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

# support legacy windows build setups
if (NOT TARGET project_protobuf)
    find_program(Protobuf_LIBRARY_DLL
        NAMES libprotobuf-9.dll
        HINTS $ENV{PROTOBUF_DIR}
        PATH_SUFFIXES bin
        PATHS
            ~/Library/Frameworks
            /Library/Frameworks
            /usr/local
            /usr
            /sw
            /opt/local
            /opt/csw
            /opt
    )
    mark_as_advanced(Protobuf_LIBRARY_DLL)
    if(Protobuf_LIBRARY_DLL)
        set(Protobuf_DLL ${Protobuf_LIBRARY_DLL})
    else()
        set(Protobuf_DLL)
    endif()
endif()

if(MINGW64)
    set(LIB_GCC libgcc_s_seh-1.dll)
else()
    set(LIB_GCC libgcc_s_dw2-1.dll)
endif()

if(MINGW64)
    set(PACK_SUFFIX -x64)
else()
    set(PACK_SUFFIX)
endif()

if(CMAKE_CROSS_COMPILING AND MINGW)
    set(COPY_DIRECT_DLL_DEPENDENCIES ${CMAKE_COMMAND} -E copy_if_different
            $<TARGET_FILE:project_luajit_import>
            ${GAMECONTROLLER_FULL_PATH}
            ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})
else()
    file(GLOB_RECURSE MINGW_LIB_SSL "$ENV{MINGW_PREFIX}/bin/libssl-*${PACK_SUFFIX}.dll")
    file(GLOB_RECURSE MINGW_LIB_CRYPTO "$ENV{MINGW_PREFIX}/bin/libcrypto-*${PACK_SUFFIX}.dll")
    file(GLOB_RECURSE MINGW_LIB_STDCXX "$ENV{MINGW_PREFIX}/bin/libstdc++-*.dll")
    file(GLOB_RECURSE MINGW_LIB_WINPTHREAD "$ENV{MINGW_PREFIX}/bin/libwinpthread-*.dll")
    file(GLOB_RECURSE MINGW_LIB_SSP "$ENV{MINGW_PREFIX}/bin/libssp-*.dll")
    file(GLOB_RECURSE MINGW_LIB_DOUBLE_CONVERSION "$ENV{MINGW_PREFIX}/bin/libdouble-conversion.dll")
    file(GLOB_RECURSE MINGW_LIB_ICUIN "$ENV{MINGW_PREFIX}/bin/libicuin*.dll")
    file(GLOB_RECURSE MINGW_LIB_ICUUC "$ENV{MINGW_PREFIX}/bin/libicuuc*.dll")
    file(GLOB_RECURSE MINGW_LIB_ICUDT "$ENV{MINGW_PREFIX}/bin/libicudt*.dll")
    file(GLOB_RECURSE MINGW_LIB_ZSTD "$ENV{MINGW_PREFIX}/bin/libzstd.dll")
    file(GLOB_RECURSE MINGW_LIB_MD4C "$ENV{MINGW_PREFIX}/bin/libmd4c.dll")
    file(GLOB_RECURSE MINGW_LIB_PNG "$ENV{MINGW_PREFIX}/bin/libpng16-*.dll")
    file(GLOB_RECURSE MINGW_LIB_PCRE2 "$ENV{MINGW_PREFIX}/bin/libpcre2-*.dll")
    file(GLOB_RECURSE MINGW_LIB_GLIB2 "$ENV{MINGW_PREFIX}/bin/libglib-2.*.dll")
    file(GLOB_RECURSE MINGW_LIB_GRAPHITE "$ENV{MINGW_PREFIX}/bin/libgraphite2.dll")
    file(GLOB_RECURSE MINGW_LIB_INTL "$ENV{MINGW_PREFIX}/bin/libintl-*.dll")
    file(GLOB_RECURSE MINGW_LIB_ICONV "$ENV{MINGW_PREFIX}/bin/libiconv-*.dll")
    # needed by Qt6
    file(GLOB_RECURSE MINGW_LIB_FREETYPE "$ENV{MINGW_PREFIX}/bin/libfreetype-*.dll")
    file(GLOB_RECURSE MINGW_LIB_BROTLI_DEC "$ENV{MINGW_PREFIX}/bin/libbrotlidec.dll")
    file(GLOB_RECURSE MINGW_LIB_BROTLI_COMMON "$ENV{MINGW_PREFIX}/bin/libbrotlicommon.dll")
    file(GLOB_RECURSE MINGW_LIB_HARFBUZZ "$ENV{MINGW_PREFIX}/bin/libharfbuzz-*.dll")
    file(GLOB_RECURSE MINGW_LIB_B2 "$ENV{MINGW_PREFIX}/bin/libb2-*.dll")
    file(GLOB_RECURSE MINGW_LIB_BZ2 "$ENV{MINGW_PREFIX}/bin/libbz2-*.dll")
    # needed by V8
    file(GLOB_RECURSE MINGW_LIB_ZLIB "$ENV{MINGW_PREFIX}/bin/zlib*.dll")

    set(COPY_GCC_DLL_COMMANDS ${CMAKE_COMMAND} -E copy_if_different
            $ENV{MINGW_PREFIX}/bin/${LIB_GCC}
            ${MINGW_LIB_STDCXX}
            ${MINGW_LIB_WINPTHREAD}
            ${MINGW_LIB_SSP}
            ${MINGW_LIB_SSL}
            ${MINGW_LIB_CRYPTO}
            ${MINGW_LIB_DOUBLE_CONVERSION}
            ${MINGW_LIB_ICUIN}
            ${MINGW_LIB_ICUUC}
            ${MINGW_LIB_ICUDT}
            ${MINGW_LIB_ZSTD}
            ${MINGW_LIB_MD4C}
            ${MINGW_LIB_PNG}
            ${MINGW_LIB_PCRE2}
            ${MINGW_LIB_GLIB2}
            ${MINGW_LIB_GRAPHITE}
            ${MINGW_LIB_INTL}
            ${MINGW_LIB_ICONV}
            ${MINGW_LIB_FREETYPE}
            ${MINGW_LIB_BROTLI_DEC}
            ${MINGW_LIB_BROTLI_COMMON}
            ${MINGW_LIB_HARFBUZZ}
            ${MINGW_LIB_B2}
            ${MINGW_LIB_BZ2}
            ${MINGW_LIB_ZLIB}
            ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})

    set(COPY_DIRECT_DLL_DEPENDENCIES ${CMAKE_COMMAND} -E copy_if_different
            $<TARGET_FILE:project_luajit_import>
            $<TARGET_FILE:lib::sdl2>
            $<$<BOOL:$<TARGET_NAME_IF_EXISTS:project_usb_import>>:$<TARGET_FILE:project_usb_import>>
            $<TARGET_FILE:Qt6::Core>
            $<TARGET_FILE:Qt6::Gui>
            $<TARGET_FILE:Qt6::Network>
            $<TARGET_FILE:Qt6::OpenGL>
            $<TARGET_FILE:Qt6::OpenGLWidgets>
            $<TARGET_FILE:Qt6::Widgets>
            $<$<BOOL:$<TARGET_NAME_IF_EXISTS:Qt6::Svg>>:$<TARGET_FILE:Qt6::Svg>>
            ${V8_DLL}
            ${GAMECONTROLLER_FULL_PATH}
            ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})

    set(CREATE_PLATFORM_DIR ${CMAKE_COMMAND} -E make_directory ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/platforms)
    set(COPY_QT_INTEGRATION ${CMAKE_COMMAND} -E copy_if_different
        $<TARGET_FILE:Qt6::QWindowsIntegrationPlugin>
            ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/platforms)
endif()

add_custom_target(assemble
    COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/data/icons ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/data/icons
    COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/data/udev ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/data/udev
    COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/libs/tsc ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/libs/tsc
    COMMAND ${COPY_DIRECT_DLL_DEPENDENCIES}
    COMMAND ${CREATE_PLATFORM_DIR}
    COMMAND ${COPY_QT_INTEGRATION}
    COMMAND ${COPY_GCC_DLL_COMMANDS}
)
add_dependencies(assemble project_luajit_import)


add_custom_target(pack
    COMMAND bash ${CMAKE_SOURCE_DIR}/data/pkg/pack-windows.sh ${CMAKE_COMMAND} ${CMAKE_SOURCE_DIR} ${PACK_SUFFIX} ${CMAKE_CROSSCOMPILING}
    WORKING_DIRECTORY ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}
    DEPENDS amun-cli logplayer ra visionanalyzer assemble
)

# trimmed down version of pack with less dependencies for a smaller zip archive
# primarily meant for usage in the ci job
add_custom_target(pack-ra
    COMMAND bash ${CMAKE_SOURCE_DIR}/data/pkg/pack-windows.sh ${CMAKE_COMMAND} ${CMAKE_SOURCE_DIR} ${PACK_SUFFIX} ${CMAKE_CROSSCOMPILING}
    WORKING_DIRECTORY ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}
    DEPENDS ra assemble
)
