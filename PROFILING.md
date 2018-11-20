# Profiling in general
Use https://github.com/brendangregg/FlameGraph to generate interactive flame graphs.
For a given profile profile.samples (how to acquire this will come later), execute:

./stackcollapse-stap.pl ../profile.samples  | ./flamegraph.pl > ../graph.svg

In the FlameGraph repository to generate an interactive svg.

## Inverting flame graphs
The regular flame graphs shows the call hirarchy and the processing time distribution.
Inverted flame graphs show how much time a function uses itself and also shows all callees of this function.
They can be generated with the the script data/scripts/invert_profile.py by executing the following (adapt all paths as necessary):

python data/scripts/invert_profile.py path/to/your/profile.samples > my_inverted_profile.samples

## Total times per function
In order to find out how much time is spent in each function and its children combined,
use the script data/scripts/total_profile.py (adapt all paths as necessary):

python data/scripts/total_profile.py path/to/your/profile.samples > function_info.txt

Note that in this representation, the percent don't add up to 1 anymore, as a function can be active in multiple lines (e.g. being called by different callees).

# Profiling javascript code
The easiest way to profile javascript code executed by amun is to use the replay-cli, as it can directly generate the necessary files.

Example usage for profiling (you will need to have a log that is long enough):
./replay-cli -l -d --profileOutfile profile.samples --profileStart 2000 --profileLength 20000 /path/to/your/log.log /path/to/strategy/init.js

This will generate the file profile.samples that can be used with the other tools.


