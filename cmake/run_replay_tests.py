#!/usr/bin/python3

import sys
import os
import subprocess

if len(sys.argv) != 3:
	print("Usage: python3 run_replay_tests.py <tests directory> <strategy to replay>")
	exit(1)

possibleStrategyEntryFileName = ["init.lua", "init.js"]

exitCode = 0
numFailingTests = 0
for (dirPath, dirNames, fileNames) in os.walk(sys.argv[1]):
	containsStrategy = False
	fullStrategyEntryFile = ""
	for entryFileName in possibleStrategyEntryFileName:
		if entryFileName in fileNames:
			containsStrategy = True
			fullStrategyEntryFile = os.path.join(dirPath, entryFileName)
	for file in fileNames:
		if file.endswith(".log"):
			if not containsStrategy:
				print("Directory: \"" + dirPath + "\" does not contain a replay test strategy")
				numFailingTests += 1
				break
			fullName = os.path.join(dirPath, file)
			result = subprocess.run(["./bin/replay-cli", "-t", fullStrategyEntryFile, fullName, sys.argv[2]], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
			if result.returncode != 0:
				print(str(result.stdout, "utf8"))
				print(str(result.stderr, "utf8"))
				print("Test \"" + dirPath + "/" + file + "\" failed with exit code " + str(result.returncode))
				numFailingTests += 1
if numFailingTests == 0:
	print("All tests successfull!")
else:
	print(str(numFailingTests) + " testcase(s) failed!")
	exit(1)
