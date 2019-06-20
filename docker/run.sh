docker run --name influxdb -p 8086:8086 \
      -v $PWD/influxdb.conf:/etc/influxdb/influxdb.conf:ro \
      -v influxdb:/var/lib/influxdb \
      influxdb -config /etc/influxdb/influxdb.conf
