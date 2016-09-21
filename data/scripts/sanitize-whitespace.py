#!/usr/bin/python
from __future__ import division, absolute_import, print_function

import sys
import os

class Config(object):
    def __init__(self, tab_length, warn_uneven):
        self.tab_length = tab_length
        self.warn_uneven = warn_uneven

def is_lua_file(fn):
    return fn.endswith(".lua")

def create_tabs(indentation, tab_length):
    tab_count = indentation // tab_length
    extra_spaces = indentation % tab_length
    return ("\t" * tab_count) + (" " * extra_spaces)

def is_comment_line(line):
    line = line.lstrip()
    return line.startswith("-- ") or line.startswith("--\t")

def has_interior_tabs(line):
    line = line.strip()
    if is_comment_line(line):
        # ignore tabs in commented out code
        line = line[2:].lstrip()
    return line.find('\t') != -1

def calculate_indentation(line, tab_length):
    indentation = 0
    offset = 0
    while offset < len(line):
        char = line[offset]
        if char == " ":
            indentation += 1
        elif char == "\t":
            indentation = (indentation + tab_length) // tab_length * tab_length
        else:
            break
        offset += 1

    remainder = line[offset:]
    return indentation, remainder

def regenerate_tabs(line, tab_length):
    indentation, text = calculate_indentation(line, tab_length)
    return create_tabs(indentation, tab_length) + text

def has_uneven_indentation(line, tab_length):
    indentation, text = calculate_indentation(line, tab_length)
    return not (indentation % tab_length) == 0

def warning(fn, line_number, message):
    print("{0}:{1}: {2}".format(fn, line_number, message))

def sanitize_whitespace(fn, config):
    lines = []
    with open(fn, "rb") as f:
        line_number = 0
        for line in f:
            line_number += 1
            # remove extra whitespace, clear lines without text
            line = line.rstrip()
            line = regenerate_tabs(line, config.tab_length)
            lines.append(line)

            if has_interior_tabs(line):
                warning(fn, line_number, "Line contains interrior tabs")
            if config.warn_uneven and has_uneven_indentation(line, config.tab_length):
                warning(fn, line_number, "Uneven indentation")


    if len(lines) > 0 and lines[-1] != "":
        newline_at_end_of_file = ""
        lines.append(newline_at_end_of_file)

    with open(fn, "wb") as f:
        f.write(os.linesep.join(lines))

def walk_lua_files(folder):
    for (dirpath, dirnames, filenames) in os.walk(folder):
        for fn in filenames:
            if is_lua_file(fn):
                yield os.path.join(dirpath, fn)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Sanitize whitespace of lua files. Convert to all tabs.')
    parser.add_argument('files', metavar='file/dir', type=str, nargs='+',
                        help='files / directories to sanitize')
    parser.add_argument('--warn-uneven', dest='warn_uneven', action='store_true',
                        help='warn about uneven indentation')
    parser.add_argument('-t', '--tab-length', dest='tab_length', type=int,
                        default=4, choices=range(1,8+1),
                        help='length of one tab in spaces')

    args = parser.parse_args()
    config = Config(args.tab_length, args.warn_uneven)
    for path in args.files:
        if os.path.isfile(path):
            sanitize_whitespace(path, config)
        elif os.path.isdir(path):
            for fn in walk_lua_files(path):
                sanitize_whitespace(fn, config)
