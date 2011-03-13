#!/bin/sh
### BEGIN INIT INFO
# Provides:             mephisto
# Required-Start:       $remote_fs $syslog
# Required-Stop:        $remote_fs $syslog
# Default-Start:        2 3 4 5
# Default-Stop:         1
# Short-Description:    Mephisto, HTTP service on a browser
### END INIT INFO

set -e

USER="mephisto"
PROFILE_DIR="/srv/mephisto/profile"

FIREFOX="/usr/bin/firefox-4.0"

test -f /etc/default/mephisto && . /etc/default/mephisto

FIREFOX_OPTIONS=" -profile $PROFILE_DIR -quiet"

start() {
        echo "Starting Mephisto"
        test -f $PROFILE_DIR/extensions.sqlite && /bin/rm $PROFILE_DIR/extensions.sqlite
        xvfb-run start-stop-daemon --start -b --user $USER --chuid $USER --startas $FIREFOX -- $FIREFOX_OPTIONS
}

stop() {
        echo "Stopping Mephisto"
        start-stop-daemon --stop --user $USER --chuid $USER --startas $FIREFOX -- $FIREFOX_OPTIONS
}


case "$1" in
        start)
                start
                ;;
        stop)
                stop
                ;;
        reload|restart)
                stop
                start
                ;;
    *)
                echo $"Usage: $0 {start|stop|reload|restart}"
                exit 1
esac

exit 0
