#!/bin/bash
set -e

DEPOT_TOOLS_REVISION=7b7eb8800be040d4405fe1d04f002ad1f3a5a38f
V8_BASE_REVISION=6a41721a2889b84cb2f3b920fbdc40b96347597a
BUILD_REVISION=adaab113d20dbac883ef911e55995fb6c8da9947
ICU_REVISION=297a4dd02b9d36c92ab9b4f121e433c9c3bc14f8

# predictable working directory
cd "$(dirname "$0")"

IS_LINUX=0
IS_MAC=0
IS_MINGW=0
unamestr="$(uname)"
if [[ "$unamestr" == 'Darwin' ]]; then
    IS_MAC=1
elif [[ "$unamestr" == 'Linux' ]]; then
    IS_LINUX=1
elif [[ "$unamestr" =~ MINGW ]]; then
    IS_MINGW=1
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

    git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
    ( cd depot_tools && git checkout $DEPOT_TOOLS_REVISION )

    find depot_tools -maxdepth 1 -type f ! -iname '*.exe' ! -iname 'ninja-*' -exec  sed "${SEDI[@]}" -e "s/exec python /exec python2 /" '{}' \+
    sed "${SEDI[@]}" -e '/_PLATFORM_MAPPING = {/a\'$'\n'"  'msys': 'win'," depot_tools/gclient.py
    sed "${SEDI[@]}" -e '/_PLATFORM_MAPPING = {/a\'$'\n'"  'msys': 'win'," depot_tools/gclient.py
    sed "${SEDI[@]}" -e '/ DEPS_OS_CHOICES = {/a\'$'\n'"    'msys': 'win'," depot_tools/gclient.py
    sed "${SEDI[@]}" -e '/PLATFORM_MAPPING = {/a\'$'\n'"    'msys': 'win'," depot_tools/download_from_google_storage.py
    sed "${SEDI[@]}" -e "s/  if sys.platform == 'cygwin':/  if sys.platform in ('cygwin', 'msys'):/" depot_tools/download_from_google_storage.py
    sed "${SEDI[@]}" -e "s/  if sys.platform.startswith(('cygwin', 'win')):/  if sys.platform.startswith(('cygwin', 'win', 'msys')):/" depot_tools/gclient_utils.py

    # initialize depot_tools checkout
    cd depot_tools
    ./gclient > /dev/null
    cd ..
    
    trap '-' EXIT
fi

export PATH=$PATH:$PWD/depot_tools

if [[ ! -d v8 ]]; then
    function v8hook {
        rm -rf v8 .gclient .gclient_entries
    }
    trap v8hook EXIT

    fetch --nohooks v8

    trap '-' EXIT
fi

cd v8

if [[ "$IS_MINGW" == 1 ]]; then
    function fakeuser {
        git config user.name "patch"
        git config user.email "noreply@robotics-erlangen.de"
    }
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
fi

if [[ "$IS_MINGW" == 1 ]]; then
    mkdir -p out/x86.release
    gn gen out/x86.release --args="is_debug=false target_cpu=\"x86\" is_component_build=false v8_static_library=true use_custom_libcxx=false use_custom_libcxx_for_host=false custom_toolchain=\"//build/toolchain/win:gcc_x86\" is_clang=false treat_warnings_as_errors=false"
    ninja -C out/x86.release
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
