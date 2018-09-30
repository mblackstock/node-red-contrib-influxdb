# Test Flows README

To test this node, we use influxdb running in a docker container.  Currently testing with influxdb 1.6.3

Set up influxdb using docker.  See documentation at https://hub.docker.com/_/influxdb/

## Generating influxdb configuration

We have a configuration file already set up for use with a self signed cert.  To generate a new, fresh config file locally:

    docker run --rm influxdb:1.6.3 influxd config > influxdb.conf

## Set up self signed certificate

From the [influxdb admim documentation](https://docs.influxdata.com/influxdb/v1.6/administration/https_setup/) you can set up
self signed SSL cert as follows:

    sudo openssl req -x509 -nodes -newkey rsa:2048 -keyout ./keys/influxdb-selfsigned.key -out ./keys/influxdb-selfsigned.crt

Answer the questions as you like.

## Running influxdb for tests

To run influxdb using the config file in the current directory:

    docker run --name=influxdb -p 8086:8086 \
      -v $PWD/influxdb.conf:/etc/influxdb/influxdb.conf:ro \
      -v $PWD/ssl:/etc/ssl \
      influxdb:1.6.3 -config /etc/influxdb/influxdb.conf

To run the influxdb CLI against this container using a self-signed cert:

    docker run --rm --link=influxdb -it influxdb influx -ssl -unsafeSsl -host influxdb

You can then execute CLI commands to create databases, make queries, etc..

First, create a `test database to use by the test flows.  

    create database test

Then import the test flows into Node-RED and ensure they work.