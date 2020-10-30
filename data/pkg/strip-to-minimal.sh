#!/bin/bash
# CAUTION
# This will destroy the repo be removing .git

# make sure the current working directory is the location of the script
cd "$(dirname "$0")"
# goto repo root
cd ../..

rm -rf .git/ .gitignore autoref strategy/lua/

cd src

rm -rf loganalyzer logcuttercli replaycli trajectorycli visionanalyzer
sed -i '/add_subdirectory(replaycli)/d' CMakeLists.txt
sed -i '/add_subdirectory(visionanalyzer)/d' CMakeLists.txt
sed -i '/add_subdirectory(logcuttercli)/d' CMakeLists.txt
sed -i '/add_subdirectory(loganalyzer)/d' CMakeLists.txt
sed -i '/add_subdirectory(trajectorycli)/d' CMakeLists.txt

cd firmware
rm -rf 2012 2014 2015 2018
sed -i '/add_subdirectory(2012)/d' CMakeLists.txt
sed -i '/add_subdirectory(2014)/d' CMakeLists.txt
sed -i '/add_subdirectory(2015)/d' CMakeLists.txt
sed -i '/add_subdirectory(2018)/d' CMakeLists.txt

