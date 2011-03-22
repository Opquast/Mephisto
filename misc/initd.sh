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

USER="nobody"
PROFILE_DIR="/srv/mephisto"
LOGFILE="/var/log/mephisto/access.log"
FIREFOX="/usr/bin/firefox-4.0"

test -f /etc/default/mephisto && . /etc/default/mephisto

FIREFOX_OPTIONS=" -profile $PROFILE_DIR -quiet"

start() {
    echo "Starting Mephisto"
    test -f $PROFILE_DIR/extensions.sqlite && /bin/rm $PROFILE_DIR/extensions.sqlite
    su $USER -c "xvfb-run $FIREFOX $FIREFOX_OPTIONS 2>&1 1>>$LOGFILE &"
}

stop() {
    echo "Stopping Mephisto"
    pkill -15 -u $USER `basename $FIREFOX`
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
        sleep 2
        start
        ;;
    *)
        echo $"Usage: $0 {start|stop|reload|restart}"
        exit 1
esac

exit 0