#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import (print_function, division, absolute_import, unicode_literals)

import os
import sys


def main():
    if len(sys.argv) == 1:
        sys.stderr.write('You should provide a script\n')
        sys.exit(1)

    script = os.path.realpath(sys.argv[1])
    if not os.path.exists(script) or not os.path.isfile(script):
        sys.stderr.write('Script "%s" does not exist.' % script)
        sys.exit(1)

    ext_dir = os.path.join(os.path.dirname(__file__), 'extension')

    env = dict(os.environ)
    env['SHADOW_MAIN'] = script
    env['SHADOW_ARGS'] = " ".join([script] + sys.argv[2:])

    cmd = ['cfx', 'run', '--pkgdir=%s' % ext_dir, '-g', 'shadow']

    sys.stdout.flush()
    sys.stderr.flush()
    os.execvpe(cmd[0], cmd, env)


if __name__ == '__main__':
    main()
