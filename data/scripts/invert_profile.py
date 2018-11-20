import sys

if len(sys.argv) != 2:
	print "Usage: python invert_profile.py <filename>"
	exit(0)

with open(sys.argv[1]) as f:
    content = f.readlines()

collectlines = []
for line in content:
	line = line.replace('\n', '').replace('\r', '')
	if line[0] == '\t':
		collectlines.reverse()
		for l in collectlines:
			print l
		print line
		collectlines = []
	else:
		collectlines.append(line)
