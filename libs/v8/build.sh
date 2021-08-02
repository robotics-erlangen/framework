#!/bin/bash
set -e

DEPOT_TOOLS_REVISION=41be80f6159c6c91914dbfc4dcd6b59d183f9f3b
V8_BASE_REVISION=6a41721a2889b84cb2f3b920fbdc40b96347597a
BUILD_REVISION=adaab113d20dbac883ef911e55995fb6c8da9947
ICU_REVISION=297a4dd02b9d36c92ab9b4f121e433c9c3bc14f8

# predictable working directory
cd "$(dirname "$0")"

IS_LINUX=0
IS_MAC=0
IS_MINGW=0
IS_MINGW32=0
IS_MINGW64=0
unamestr="$(uname)"
if [[ "$unamestr" == 'Darwin' ]]; then
    IS_MAC=1
elif [[ "$unamestr" == 'Linux' ]]; then
    IS_LINUX=1
elif [[ "$unamestr" =~ MINGW ]]; then
    IS_MINGW=1
    if [[ "$unamestr" =~ MINGW32 ]]; then
        IS_MINGW32=1
    elif [[ "$unamestr" =~ MINGW64 ]]; then
        IS_MINGW64=1
    else
        echo "16-bit systems are not supported ;-)"
        exit 1
    fi
else
    echo "Unsupported operating system"
    exit 1
fi

if [[ "$IS_MAC" == 1 ]]; then
    SEDI=( "-i" "" )
else
    SEDI=( "-i" )
fi

if [[ ! -d depot_tools ]]; then
    function depothook {
        rm -rf depot_tools
    }
    trap depothook EXIT

    ( mkdir depot_tools && cd depot_tools && git init && git remote add origin https://chromium.googlesource.com/chromium/tools/depot_tools.git && git fetch --depth 1 origin $DEPOT_TOOLS_REVISION && git checkout FETCH_HEAD )

    find depot_tools -maxdepth 1 -type f ! -iname '*.exe' ! -iname 'ninja-*' -exec  sed "${SEDI[@]}" -e "s/exec python /exec python2 /" '{}' \+
    sed "${SEDI[@]}" -e '/_PLATFORM_MAPPING = {/a\'$'\n'"  'msys': 'win'," depot_tools/gclient.py
    sed "${SEDI[@]}" -e '/ DEPS_OS_CHOICES = {/a\'$'\n'"    'msys': 'win'," depot_tools/gclient.py
    sed "${SEDI[@]}" -e '/PLATFORM_MAPPING = {/a\'$'\n'"    'msys': 'win'," depot_tools/download_from_google_storage.py
    sed "${SEDI[@]}" -e "s/  if sys.platform == 'cygwin':/  if sys.platform in ('cygwin', 'msys'):/" depot_tools/download_from_google_storage.py
    sed "${SEDI[@]}" -e "s/  if sys.platform.startswith(('cygwin', 'win')):/  if sys.platform.startswith(('cygwin', 'win', 'msys')):/" depot_tools/gclient_utils.py
    sed "${SEDI[@]}" -e "s/  if sys.platform.startswith(('cygwin', 'win')):/  if sys.platform.startswith(('cygwin', 'win', 'msys')):/" depot_tools/gclient_paths.py
    # prevent git update of depot_tools
    sed "${SEDI[@]}" -e "s/    update_git_repo/    #update_git_repo/" depot_tools/update_depot_tools
    sed "${SEDI[@]}" -e 's|  $COMSPEC /c `cygpath -w "$base_dir/bootstrap/win_tools.bat"`|  "$base_dir/bootstrap/win_tools.bat"|' depot_tools/update_depot_tools

    # initialize depot_tools checkout
    ( cd depot_tools && ./gclient > /dev/null )

    # permanently disable depot tools update
    # Note: the update must be able to run once to properly setup python and git!
    touch depot_tools/.disable_auto_update

    if [[ "$IS_MINGW" == 1 ]]; then
        # make sure to shadow the msys python2 binaries
        cp depot_tools/python.bat depot_tools/python2.bat
        cp depot_tools/python.bat depot_tools/python2.7.bat
    fi

    trap '-' EXIT
fi

# use depot_tools binaries if there are multiple options
export PATH=$PWD/depot_tools:$PATH

if [[ ! -d v8 ]]; then
    function v8hook {
        rm -rf v8 .gclient .gclient_entries
    }
    trap v8hook EXIT

    cat >.gclient <<"EOF"
solutions = [
  {
    "url": "https://chromium.googlesource.com/v8/v8.git",
    "managed": False,
    "name": "v8",
    "deps_file": "DEPS",
    "custom_deps": {},
  },
]
EOF

    ( mkdir v8 && cd v8 && git init && git remote add origin https://chromium.googlesource.com/v8/v8.git && git fetch --depth 1 origin $V8_BASE_REVISION && git checkout FETCH_HEAD )

    gclient sync --nohooks

    trap '-' EXIT
fi

cd v8

function fakeuser {
    git config user.name "patch"
    git config user.email "noreply@robotics-erlangen.de"
}
if [[ "$IS_MINGW" == 1 ]]; then
    if [[ ! -e .patched || "$(cat .patched)" != "$V8_BASE_REVISION" ]]; then
        function v8base {
            git checkout $V8_BASE_REVISION
        }
        trap v8base EXIT
        v8base
        fakeuser
        git am ../patches/0001-mingw-build.patch
        # only run gclient once on mingw as it's rather slow
        gclient sync
        trap '-' EXIT
    fi

    cd build
    if [[ ! -e .patched || "$(cat .patched)" != "$V8_BASE_REVISION" ]]; then
        function buildbase {
            git checkout $BUILD_REVISION
        }
        trap buildbase EXIT
        buildbase
        fakeuser
        git am ../../patches/0001-build-mingw-build.patch
        trap '-' EXIT
    fi

    cd ../third_party/icu
    if [[ ! -e .patched || "$(cat .patched)" != "$V8_BASE_REVISION" ]]; then
        function icubase {
            git checkout $ICU_REVISION
        }
        trap icubase EXIT
        icubase
        fakeuser
        git am ../../../patches/0001-icu-mingw-build.patch
        trap '-' EXIT
    fi
    cd ../..
else
    if [[ "$(git rev-parse --verify HEAD)" != "$V8_BASE_REVISION" ]]; then
        git checkout $V8_BASE_REVISION
    fi
    gclient sync

    cd build
    if [[ ! -e .patched || "$(cat .patched)" != "$V8_BASE_REVISION" ]]; then
        function buildbase {
            git checkout $BUILD_REVISION
        }
        trap buildbase EXIT
        buildbase
        fakeuser
        git am ../../patches/0001-macos-sdk-search.patch
        trap '-' EXIT
    fi
    cd ..
fi

if [[ "$IS_MINGW32" == 1 ]]; then
    mkdir -p out/x86.release
    gn gen out/x86.release --args="is_debug=false target_cpu=\"x86\" is_component_build=true v8_static_library=false use_custom_libcxx=false use_custom_libcxx_for_host=false custom_toolchain=\"//build/toolchain/win:gcc_x86\" is_clang=false treat_warnings_as_errors=false"
    ninja -C out/x86.release
elif [[ "$IS_MINGW64" == 1 ]]; then
    mkdir -p out/x64.release
    gn gen out/x64.release --args="is_debug=false target_cpu=\"x64\" is_component_build=true v8_static_library=false use_custom_libcxx=false use_custom_libcxx_for_host=false custom_toolchain=\"//build/toolchain/win:gcc_x64\" is_clang=false treat_warnings_as_errors=false"
    ninja -C out/x64.release
else
    mkdir -p out/x64.release
    gn gen out/x64.release --args="is_debug=false target_cpu=\"x64\" is_component_build=true v8_static_library=false use_custom_libcxx=false use_custom_libcxx_for_host=false"
    ../depot_tools/ninja -C out/x64.release
fi

# # Building V8 with clang on windows

# ## Get depot_tools
# Reference: http://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up

# ### Windows
# Download depot_tools from https://storage.googleapis.com/chrome-infra/depot_tools.zip
# Unpack to C:\V8\depot_tools
# Open a cmd-Terminal at C:\V8
# ```
# set PATH=C:\V8\depot_tools;%PATH%
# set DEPOT_TOOLS_WIN_TOOLCHAIN=0
# ```

# ## Pre-Install dependencies
# Reference: https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md

# Download Visual Studio Community 2017: https://visualstudio.microsoft.com/de/vs/community/
# ```
# vs_community.exe --add Microsoft.VisualStudio.Workload.NativeDesktop --add Microsoft.VisualStudio.Component.VC.ATLMFC --add Microsoft.VisualStudio.Component.Windows10SDK.17134 --includeRecommended
# "C:\ProgramData\Package Cache\{5f83ccda-0498-4b97-a298-16a642bf49f2}\winsdksetup.exe" /features OptionId.WindowsDesktopDebuggers /ceip off
# ```

# ## Get V8
# ```
# fetch v8
# cd v8
# git checkout ...
# gclient sync
# ```
# If the download process get stuck on asking for a username to _chrome-internal.googlesource.com_ make sure to set the DEPOT_TOOLS_WIN_TOOLCHAIN environment variable as described in _Get depot_tools_!

# ## Build V8
# mkdir out\\x86.release
# gn gen out/x86.release --args="is_debug=false target_cpu=\"x86\" is_component_build=false v8_static_library=true use_custom_libcxx=false use_custom_libcxx_for_host=false"
# ninja -C out/x86.release
