# Test Flows README

To test this node, we use InfluxDB running in a docker container. Currently tested with InfluxDB 1.8 and 2.0.

Set up InfluxDB using docker. See documentation at https://hub.docker.com/_/influxdb/

## Generating InfluxDB 1.8 configuration

We have a configuration file already set up for use with a self signed cert.  To generate a new, fresh config file locally:

    docker run --rm influxdb:1.8 influxd config > influxdb.conf

## Set up self signed certificate

From the [InfluxDB admim documentation](https://docs.influxdata.com/influxdb/v1.8/administration/https_setup/) you can set up
self signed SSL cert as follows:

    sudo openssl req -x509 -nodes -newkey rsa:2048 -keyout ./keys/influxdb-selfsigned.key -out ./keys/influxdb-selfsigned.crt

Answer the questions as you like.

## Running InfluxDB for tests

### Docker Method

To run InfluxDB 1.8 using the config file in the current directory:

    docker run --name=influxdb -p 8086:8086 \
      -v $PWD/influxdb.conf:/etc/influxdb/influxdb.conf:ro \
      -v $PWD/ssl:/etc/ssl \
      influxdb:1.8 -config /etc/influxdb/influxdb.conf

To run the InfluxDB CLI against this container using a self-signed cert:

    docker run --rm --link=influxdb -it influxdb influx -ssl -unsafeSsl -host influxdb

You can then execute CLI commands to create databases, make queries, etc.

First, create a `test` database to use by the test flows.  

    create database test

Then, import the test flows into Node-RED and ensure they work.

### Docker Compose Method

To run InfluxDB 1.8, 2.0 and Chronograf using the config file in the current directory:

    docker-compose up

Then, import the test flows into Node-RED and ensure they work.

1 - Launch Chronograf for InfluxDB 1.8 and 1.8 Flux: https://localhost:8888/

* Select `Unsafe SSL option` in the Connection Configuration section with Chronograf. Create a `test` database to be used by the test flows.
* Test flows parameters: 
    * Database: test
    * Measurement: test
    * Precision: ms
    * Credentials:
        * Username: username
        * Password: password
    
2 - Launch Chronograf for InfluxDB 2.0: https://localhost:9999

* Test flows parameters:
    * Bucket: test
    * Measurement: test
    * Precision: ms
    * Organisation: my-org
    * Credentials:
        * Username: my-user
        * Password: my-password
        * Token: Create one under `Load Data/Tokens`

#### Select Test Query:
* InfluxDB 1.8
    
        SELECT * FROM "test"."autogen"."test"

#### Flux Test Query:
* InfluxDB 1.8 Flux

        from(bucket: "test/autogen")
          |> range(start: -1m, stop: 1h)
          |> filter(fn: (r) => r._measurement == "test")

* InfluxDB 2.0

        from(bucket: "test")
          |> range(start: -1m, stop: 1h)
          |> filter(fn: (r) => r._measurement == "test")
