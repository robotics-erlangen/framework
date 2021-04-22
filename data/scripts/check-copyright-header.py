import os

# execute this script at the base of the project

filesWithoutCounter = 0

def checkFiles(folder):
	global filesWithoutCounter
	for d, _, files in os.walk(folder):
		if "firmware" in d: # the firmware is not published and might not have copyright headers
			continue
		for file in files:
			if "protobuf.ts" in file: # this file is generated and therefore does not have a copyright comment
				continue
			filepath = d + os.sep + file

			if filepath.endswith(".h") or filepath.endswith(".cpp") or filepath.endswith(".ts") or filepath.endswith(".lua") or filepath.endswith("CMakeLists.txt"):
				with open(filepath, encoding="utf-8") as file:
					data = file.read()
					if "Copyright" not in data and "GNU General Public License" not in data:
						print("File " + filepath + " does not contain a copyright header")
						filesWithoutCounter = filesWithoutCounter + 1


checkFiles("src")
checkFiles("strategy/typescript/base")

if filesWithoutCounter > 0:
	print("" + str(filesWithoutCounter) + " file(s) do(es) not contain a copyright header!")
	exit(1)
