import sys

if len(sys.argv) != 2:
	print "Usage: python total_profile.py <filename>"
	exit(0)

with open(sys.argv[1]) as f:
    content = f.readlines()

totalCount = 0
collectlines = []
timeMap = {}
for line in content:
	line = line.replace('\n', '').replace('\r', '')
	if line[0] == '\t':
		count = int(line.replace('\t', ''))
		totalCount = totalCount + count
		for l in collectlines:
			if l in timeMap:
				timeMap[l] = timeMap[l] + count
			else:
				timeMap[l] = count
		collectlines = []
	else:
		collectlines.append(line)

asTupel = [ (v,k) for k,v in timeMap.iteritems() ]
asTupel.sort(reverse=True)
for (count, name) in asTupel:
	print name.ljust(70), count / float(totalCount)
