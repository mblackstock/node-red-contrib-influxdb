var _ = require('lodash');

module.exports = function(RED) {
    "use strict";
    var Influx = require('influx');

    /**
     * Config node.  Currently we only connect to one host.
     */
    function InfluxConfigNode(n) {
        RED.nodes.createNode(this,n);
        this.hostname = n.hostname;
        this.port = n.port;
        this.database= n.database;
        this.name = n.name;
        this.usetls = n.usetls;
        if (typeof this.usetls === 'undefined') {
            this.usetls = false;
        }
        // for backward compatibility with old 'protocol' setting
        if (n.protocol === 'https') {
            this.usetls = true;
        }
        if (this.usetls && n.tls) {
            var tlsNode = RED.nodes.getNode(n.tls);
            if (tlsNode) {
                this.hostOptions = {};
                tlsNode.addTLSOptions(this.hostOptions);
            }
        }
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
            var client = new Influx.InfluxDB({
                hosts: [ {
                    host: this.influxdbConfig.hostname,
                    port: this.influxdbConfig.port,
                    protocol: this.influxdbConfig.usetls ? "https" : "http",
                    options: this.influxdbConfig.hostOptions
                    }
                ],
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
                // format payload to match new writePoints API
                var points = [];
                var point;
                var timestamp;
                if (_.isArray(msg.payload) && msg.payload.length > 0) {
                    // array of arrays
                    if (_.isArray(msg.payload[0]) && msg.payload[0].length > 0) {
                        msg.payload.forEach(function(nodeRedPoint) {
                            point = {
                                measurement: measurement,
                                fields: nodeRedPoint[0],
                                tags: nodeRedPoint[1]
                            }
                            if (point.fields.time) {
                                point.timestamp = point.fields.time;
                                delete point.fields.time;
                            }
                            points.push(point);
                        });
                    } else {
                        // array of non-arrays, assume one point with both fields and tags
                        point = {
                            measurement: measurement,
                            fields: msg.payload[0],
                            tags: msg.payload[1]
                        };
                        if (point.fields.time) {
                            point.timestamp = point.fields.time;
                            delete point.fields.time;
                        }
                        points.push(point);
                    }
                } else {
                    if (_.isPlainObject(msg.payload)) {
                        point = {
                            measurement: measurement,
                            fields: msg.payload
                        };
                    } else {
                        // just a value
                        point = {
                            measurement: measurement,
                            fields: {value:msg.payload}
                        };
                    }
                    if (point.fields.time) {
                        point.timestamp = point.fields.time;
                        delete point.fields.time;
                    }
                    points.push(point);
                }
                client.writePoints(points).catch(function(err) {
                    node.error(err,msg);
                });
            });
        } else {
            this.error(RED._("influxdb.errors.missingconfig"));
        }
    }

    RED.nodes.registerType("influxdb out",InfluxOutNode);

    /**
     * Output node to write batches of points to influxdb
     */
    function InfluxBatchNode(n) {
        RED.nodes.createNode(this,n);
        this.influxdb = n.influxdb;
        this.influxdbConfig = RED.nodes.getNode(this.influxdb);

        if (this.influxdbConfig) {
            var node = this;
            var client = new Influx.InfluxDB({
                hosts: [ {
                    host: this.influxdbConfig.hostname,
                    port: this.influxdbConfig.port,
                    protocol: this.influxdbConfig.usetls ? "https" : "http",
                    options: this.influxdbConfig.hostOptions
                    }
                ],
                database: this.influxdbConfig.database,
                username: this.influxdbConfig.credentials.username,
                password: this.influxdbConfig.credentials.password
            });

            node.on("input",function(msg) {
                client.writePoints(msg.payload).catch(function(err) {
                    node.error(err,msg);
                });
            });
        } else {
            this.error(RED._("influxdb.errors.missingconfig"));
        }
    }

    RED.nodes.registerType("influxdb batch",InfluxBatchNode);

    /**
     * Input node to make queries to influxdb
     */
    function InfluxInNode(n) {
        RED.nodes.createNode(this, n);
        this.influxdb = n.influxdb;
        this.query = n.query;
        this.precision = n.precision;
        this.retentionPolicy = n.retentionPolicy;
        this.rawOutput = n.rawOutput;
        this.influxdbConfig = RED.nodes.getNode(this.influxdb);
        if (this.influxdbConfig) {
            var node = this;
            var client = new Influx.InfluxDB({
                hosts: [{
                    host: this.influxdbConfig.hostname,
                    port: this.influxdbConfig.port,
                    protocol: this.influxdbConfig.usetls ? "https" : "http",
                    options: this.influxdbConfig.hostOptions
                }
                ],
                database: this.influxdbConfig.database,
                username: this.influxdbConfig.credentials.username,
                password: this.influxdbConfig.credentials.password
            });
            node.on("input", function (msg) {
                var query;
                var rawOutput;
                var queryOptions = {};
                var precision;
                var retentionPolicy;

                query = msg.hasOwnProperty('query') ? msg.query : node.query;
                if (!query) {
                    node.error(RED._("influxdb.errors.noquery"), msg);
                    return;                  
                }

                rawOutput = msg.hasOwnProperty('rawOutput') ? msg.rawOutput : node.rawOutput;
                precision = msg.hasOwnProperty('precision') ? msg.precision : node.precision;
                retentionPolicy = msg.hasOwnProperty('retentionPolicy') ? msg.retentionPolicy : node.retentionPolicy;

                if (precision) {
                    queryOptions.precision = precision;
                }

                if (retentionPolicy) {
                    queryOptions.retentionPolicy = retentionPolicy;
                }

                if (rawOutput) {
                    var queryPromise = client.queryRaw(query, queryOptions);
                } else {
                    var queryPromise = client.query(query, queryOptions);
                }

                queryPromise.then(function (results) {
                    msg.payload = results;
                    node.send(msg);
                }).catch(function (err) {
                    node.error(err);
                });
            });
        } else {
            this.error(RED._("influxdb.errors.missingconfig"));
        }
    }
    RED.nodes.registerType("influxdb in",InfluxInNode);
}
