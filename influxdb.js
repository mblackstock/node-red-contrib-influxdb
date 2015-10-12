var _ = require('lodash');

module.exports = function(RED) {
    "use strict";
    var influx = require('influx');

    /**
     * Config node.  Currently we only connect to one host.
     */
    function InfluxConfigNode(n) {
        RED.nodes.createNode(this,n);
        this.hostname = n.hostname;
        this.port = n.port;
        this.database= n.database;
        this.name = n.name;
    }

    RED.nodes.registerType("influxdb",InfluxConfigNode,{
        credentials: {
            username: {type:"text"},
            password: {type: "password"}
        }
    });

    /**
     * Output node to write to an influxdb measurement
     */
    function InfluxOutNode(n) {
        RED.nodes.createNode(this,n);
        this.measurement = n.measurement;
        this.influxdb = n.influxdb;
        this.influxdbConfig = RED.nodes.getNode(this.influxdb);

        if (this.influxdbConfig) {
            var node = this;
            var client = influx({
                host: this.influxdbConfig.hostname,
                port: this.influxdbConfig.port,
                database: this.influxdbConfig.database,
                username: this.influxdbConfig.credentials.username,
                password: this.influxdbConfig.credentials.password
            });

            node.on("input",function(msg) {
                var measurement;
                if (node.measurement) {
                    measurement = node.measurement;
                } else {
                    if (msg.measurement) {
                        measurement = msg.measurement;
                    } else {
                        node.error(RED._("influxdb.errors.nomeasurement"),msg);
                        return;
                    }
                }
                // depending on payload, call writePoints or writePoint
                if (_.isArray(msg.payload) && msg.payload.length > 0) {
                    if (_.isArray(msg.payload[0]) && msg.payload[0].length > 0) {
                        // array of arrays means we have multiple points, use writePoints
                        client.writePoints(measurement, msg.payload, function (err, result) {
                            if (err) {
                                node.error(err,msg);
                            }
                        });
                    } else {
                        // array of non-arrays, assume one point with both fields and tags
                        var values = msg.payload[0];
                        var tags = msg.payload[1];
                        client.writePoint(measurement, values, tags, function(err, result) {
                            if (err) {
                                node.error(err,msg);
                            }
                        });
                    }
                } else {
                    // point with no tags, just field(s)
                    client.writePoint(measurement, msg.payload, null, function(err, result) {
                        if (err) {
                            node.error(err,msg);
                        }
                    });
                }
            });
        } else {
            this.error(RED._("influxdb.errors.missingconfig"));
        }
    }

    RED.nodes.registerType("influxdb out",InfluxOutNode);

    /**
     * Input node to make queries to influxdb
     */
    function InfluxInNode(n) {
        RED.nodes.createNode(this,n);
        this.influxdb = n.influxdb;
        this.query = n.query;
        this.influxdbConfig = RED.nodes.getNode(this.influxdb);

        if (this.influxdbConfig) {
            var node = this;
            var client = influx({
                host: this.influxdbConfig.hostname,
                port: this.influxdbConfig.port,
                database: this.influxdbConfig.database,
                username: this.influxdbConfig.credentials.username,
                password: this.influxdbConfig.credentials.password
            });
            node.on("input",function(msg) {
                var query;
                if (node.query) {
                    query = node.query;
                }
                if (!node.query) {
                    if (msg.query) {
                        query = msg.query;
                    } else {
                        node.error(RED._("influxdb.errors.noquery"),msg);
                        return;
                    }
                }
                client.query(query, function(err, results) {
                    if (err) {
                        node.error(err);
                    } else {
                        msg.payload = results;
                        node.send(msg);
                    }
                });
            });
        } else {
            this.error(RED._("influxdb.errors.missingconfig"));
        }
    }
    RED.nodes.registerType("influxdb in",InfluxInNode);
}