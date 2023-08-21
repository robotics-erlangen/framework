from collections import defaultdict
from pathlib import Path
from sys import stderr
from argparse import ArgumentParser

def read_file(path: Path):
    d = defaultdict(set)
    with path.open() as f:
        for line in f:
            if line.startswith("#"):
                continue
            loguid, _, log = line.strip().partition("  ")
            d[loguid].add(log)
    return {k: tuple(sorted(v)) for k, v in d.items()}

if __name__ == "__main__":
    parser = ArgumentParser(description="This tool is made to work on listings created with the loguidreader (see src/loguidreader/loguidreader.cpp).")
    parser.add_argument("-l", "--local", type=Path, help="Specify index file of local logs", default=Path("./log-index-local.txt"))
    parser.add_argument("-n", "--nas", type=Path, help="Specify index file of nas logs", default=Path("./log-index-nas.txt"))

    subparsers = parser.add_subparsers(dest="command", required=True, help="Available subcommands")

    shared_parser = subparsers.add_parser("shared", help="Finds logs that are shared between local and nas")

    only_parser = subparsers.add_parser("only", help="Finds logs that are only in LOCATION")
    only_parser.add_argument("location", choices=["local", "nas"], help="location to process")

    duplicates_parser = subparsers.add_parser("duplicates", help="Finds logs that exist multiple times in LOCATION")
    duplicates_parser.add_argument("location", choices=["local", "nas"], help="location to process")

    args = parser.parse_args()

    local = read_file(args.local)
    nas = read_file(args.nas)
    locations = {"local": local, "nas": nas}

    match args.command:
        case "shared":
            both = local.keys() & nas.keys()
            if len(both) == 0:
                print("No shared logs found", file=stderr)
            else:
                uids = sorted(both, key=lambda k: local[k][0])
                left = tuple(', '.join(local[k]) for k in uids)
                leftmax = max(len(l) for l in left)
                right = tuple(', '.join(nas[k]) for k in uids)
                for l, r in zip(left, right):
                    print(f"{l:{leftmax}} -> {r}")

        case "only":
            location = locations[args.location]
            only = location - (nas.keys() if args.location == "local" else local.keys())
            print("\n".join(sorted(l for k in only for l in location[k])))

        case "duplicates":
            location = locations[args.location]
            duplicates_found = False
            for uid, logs in location.items():
                if len(logs) <= 1:
                    continue
                duplicates_found = True
                print(uid)
                print("\n".join(sorted(logs)))
                print()
            if not duplicates_found:
                print("No duplicate logs found", file=stderr)
