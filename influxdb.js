var _ = require('lodash');

module.exports = function (RED) {
    "use strict";
    var { InfluxDB, Point } = require('@influxdata/influxdb-client');

    const VERSION_18 = '1.8';
    const VERSION_20 = '2.0';

    /**
     * Config node. Currently we only connect to one host.
     */
    function InfluxConfigNode(n) {
        RED.nodes.createNode(this, n);
        this.hostname = n.hostname;
        this.port = n.port;
        this.database = n.database;
        this.name = n.name;

        var clientOptions = null;
        
        if (!n.influxdbVersion) {
            n.influxdbVersion = VERSION_20;
        }

        const token = n.influxdbVersion === VERSION_18 ?
            `${this.credentials.username}:${this.credentials.password}` :
            this.credentials.token;

        clientOptions = {
            url: n.url,
            rejectUnauthorized: n.rejectUnauthorized,
            token
        }
        this.client = new InfluxDB(clientOptions);
        this.influxdbVersion = n.influxdbVersion;
    }

    RED.nodes.registerType("influxdb", InfluxConfigNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
            token: { type: "password" }
        }
    });

    function isIntegerString(value) {
        return /^-?\d+i$/.test(value);
    }

    function setFieldIntegers(fields) {
        for (const prop in fields) {
            const value = fields[prop];
            if (isIntegerString(value)) {
                fields[prop] = parseInt(value.substring(0,value.length-1));
            }
        }
    }

    function addFieldToPoint(point, name, value) {
        if (name === 'time') {
            point.timestamp(value);
        } else if (typeof value === 'number') {
            point.floatField(name, value);
        } else if (typeof value === 'string') {
            // string values with numbers ending with 'i' are considered integers            
            if (isIntegerString(value)) {
                value = parseInt(value.substring(0,value.length-1));
                point.intField(name, value);
            } else {
                point.stringField(name, value);
            }
        } else if (typeof value === 'boolean') {
            point.booleanField(name, value);
        }
    }

    function addFieldsToPoint(point, fields) {
        for (const prop in fields) {
            const value = fields[prop];
            addFieldToPoint(point, prop, value);
        }
    }

    // write using influx-client-js
    function writePoints(msg, node, done) {
        var measurement = msg.hasOwnProperty('measurement') ? msg.measurement : node.measurement;
        if (!measurement) {
            return done(RED._("influxdb.errors.nomeasurement"));
        }
        try {
            if (_.isArray(msg.payload) && msg.payload.length > 0) {
                // array of arrays: multiple points with fields and tags
                if (_.isArray(msg.payload[0]) && msg.payload[0].length > 0) {
                    msg.payload.forEach(element => {
                        let point = new Point(measurement);
                        let fields = element[0];
                        addFieldsToPoint(point, fields);
                        let tags = element[1];
                        for (const prop in tags) {
                            point.tag(prop, tags[prop]);
                        }
                        node.client.writePoint(point);
                    });
                } else {
                    // array of non-arrays: one point with both fields and tags
                    let point = new Point(measurement);
                    let fields = msg.payload[0];
                    addFieldsToPoint(point, fields);
                    const tags = msg.payload[1];
                    for (const prop in tags) {
                        point.tag(prop, tags[prop]);
                    }
                    node.client.writePoint(point)
                }
            } else {
                // single object: fields only
                if (_.isPlainObject(msg.payload)) {
                    let point = new Point(measurement);
                    let fields = msg.payload;
                    addFieldsToPoint(point, fields);
                    node.client.writePoint(point);
                } else {
                    // just a value
                    let point = new Point(measurement);
                    let value = msg.payload;
                    addFieldToPoint(point, 'value', value);
                    node.client.writePoint(point);
                }
            }
    
            node.client.flush(true).then(() => {
                    done();
                }).catch(error => {
                    msg.influx_error = {
                        errorMessage: error
                    };
                    done(error);
                });
        } catch (error) {
            msg.influx_error = {
                errorMessage: error
            };
            done(error);
        }
    }

    /**
     * Output node to write to a single influxdb measurement
     */
    function InfluxOutNode(n) {
        RED.nodes.createNode(this, n);
        this.measurement = n.measurement;
        this.influxdb = n.influxdb;
        this.influxdbConfig = RED.nodes.getNode(this.influxdb);

        this.database = n.database;                 // 1.8 only
        this.retentionPolicy = n.retentionPolicy;   // 1.8 only
        this.precision = n.precision;
        this.org = n.org;
        this.bucket = n.bucket;

        if (!this.influxdbConfig) {
            this.error(RED._("influxdb.errors.missingconfig"));
            return;
        }
        let version = this.influxdbConfig.influxdbVersion;

        var node = this;

        let bucket = this.bucket;
        if (version === VERSION_18) {
            let retentionPolicy = this.retentionPolicy ? this.retentionPolicy : 'autogen';
            bucket = `${this.database}/${retentionPolicy}`;
        }
        // org only set for 2.x
        let org = version === VERSION_20 ? this.org : '';

        this.client = this.influxdbConfig.client.getWriteApi(org, bucket, this.precision);

        node.on("input", function (msg, send, done) {
            writePoints(msg, node, done);
        });
    }

    RED.nodes.registerType("influxdb out", InfluxOutNode);

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
        this.org = n.org;

        if (!this.influxdbConfig) {
            this.error(RED._("influxdb.errors.missingconfig"));
            return;
        }

        let version = this.influxdbConfig.influxdbVersion
        let org = version === VERSION_20 ? this.org : ''
        this.client = this.influxdbConfig.client.getQueryApi(org);
        var node = this;

        node.on("input", function (msg, send, done) {
            var query = msg.hasOwnProperty('query') ? msg.query : node.query;
            if (!query) {
                return done(RED._("influxdb.errors.noquery"));
            }
            var output = [];
            node.client.queryRows(query, {
                next(row, tableMeta) {
                    var o = tableMeta.toObject(row)
                    output.push(o);
                },
                error(error) {
                    msg.influx_error = {
                        errorMessage: error
                    };
                    done(error);
                },
                complete() {
                    msg.payload = output;
                    send(msg);
                    done();
                },
            });
        });

    }

    RED.nodes.registerType("influxdb in", InfluxInNode);
}
