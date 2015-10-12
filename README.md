node-red-contrib-influxdb
=========================

A <a href="http://nodered.org" target="_new">Node-RED</a> node to write and query data from an influxdb time series database.  These nodes use the <a href="https://www.npmjs.com/package/influx" target="_new">influxDB client</a> for node.js, specifically calling the **writePoint()**, **writePoints()**, and **query()** methods.  Currently it can only communicate with one influxdb host.

Pre-requesites
--------------

To run this you'll need access to an influxdb database version 0.9.x, possibly later.  See the <a href="https://influxdb.com/" target="_new">influxdb site</a> for more information.

Install
-------

Run the following command in the root directory of your Node-RED install.
Usually this is `~/.node-red` .

    npm install node-red-node-influxdb

Usage
-----

Nodes to write and query data from an influxdb time series database.

### Input Node

Queries one or more measurements in an influxdb database.  The query is specified in the node configuration or in the ***msg.query*** property.  Setting it in the node will override the ***msg.query***.  The result is returned in ***msg.payload***.

### Output Node

Writes one or more points (fields and tags) to a measurement.

The fields and tags to write are in ***msg.payload***.  If the message is a string, number, or boolean, it will be written as a single value to the specified measurement (called *value*).

If ***msg.payload*** is an object containing multiple properties, the fields will be written to the measurement.

If ***msg.payload*** is an array containing two objects, the first object will be written as the set of named fields, the second is the set of named tags.

Finally, if ***msg.payload*** is an array of arrays, it will be written as a series of points containing fields and tags.
