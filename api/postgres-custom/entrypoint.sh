#!/bin/sh
# Force trust auth on every startup regardless of existing pg_hba.conf in the volume
mkdir -p /tmp/pgconf
printf 'local all all trust\nhost all all all trust\n' > /tmp/pgconf/pg_hba.conf
exec docker-entrypoint.sh "$@" -c hba_file=/tmp/pgconf/pg_hba.conf
