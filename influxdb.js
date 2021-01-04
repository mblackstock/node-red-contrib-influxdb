var _ = require('lodash');

module.exports = function (RED) {
    "use strict";
    var Influx = require('influx');
    var { InfluxDB, Point } = require('@influxdata/influxdb-client');

    const VERSION_1X = '1.x';
    const VERSION_18_FLUX = '1.8-flux';
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
            n.influxdbVersion = VERSION_1X;
        }

        if (n.influxdbVersion === VERSION_1X) {
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

            this.client = new Influx.InfluxDB({
                hosts: [{
                    host: this.hostname,
                    port: this.port,
                    protocol: this.usetls ? "https" : "http",
                    options: this.hostOptions
                }],
                database: this.database,
                username: this.credentials.username,
                password: this.credentials.password
            });
        } else if (n.influxdbVersion === VERSION_18_FLUX) {
            var token = `${this.credentials.username}:${this.credentials.password}`;
            clientOptions = {
                url: n.url,
                rejectUnauthorized: n.rejectUnauthorized,
                token: token
            }

            this.client = new InfluxDB(clientOptions);
        } else if (n.influxdbVersion === VERSION_20) {
            clientOptions = {
                url: n.url,
                rejectUnauthorized: n.rejectUnauthorized,
                token: this.credentials.token
            }

            this.client = new InfluxDB(clientOptions);
        }

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
        node.client.closed == false ? null : node.client.closed = false;
        var measurement = msg.hasOwnProperty('measurement') ? msg.measurement : node.measurement;
        if (!measurement) {
            return done(RED._("influxdb.errors.nomeasurement"));
        }
        try {
            if (_.isArray(msg.payload) && msg.payload.length > 0) {
                // array of arrays
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
                    // array of non-arrays, assume one point with both fields and tags
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
    
            // actual write happens here
            node.client
                .close()
                .then(() => {
                    done();
                })
                .catch(error => {
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
     * Output node to write to an influxdb measurement
     */
    function InfluxOutNode(n) {
        RED.nodes.createNode(this, n);
        this.measurement = n.measurement;
        this.influxdb = n.influxdb;
        this.precision = n.precision;
        this.retentionPolicy = n.retentionPolicy;
        this.influxdbConfig = RED.nodes.getNode(this.influxdb);
        this.database = n.database;
        this.precisionV18FluxV20 = n.precisionV18FluxV20;
        this.retentionPolicyV18Flux = n.retentionPolicyV18Flux;
        this.org = n.org;
        this.bucket = n.bucket;

        function setFieldIntegers(fields) {
            for (const prop in fields) {
                const value = fields[prop];
                if (isIntegerString(value)) {
                    fields[prop] = parseInt(value.substring(0,value.length-1));
                }
            } 
        }

        if (!this.influxdbConfig) {
            this.error(RED._("influxdb.errors.missingconfig"));
            return;
        }
        let version = this.influxdbConfig.influxdbVersion;

        if (version === VERSION_1X) {
            var node = this;
            var client = this.influxdbConfig.client;

            node.on("input", function (msg, send, done) {
                var measurement;
                var writeOptions = {};

                var measurement = msg.hasOwnProperty('measurement') ? msg.measurement : node.measurement;
                if (!measurement) {
                    return done(RED._("influxdb.errors.nomeasurement"));
                }
                var precision = msg.hasOwnProperty('precision') ? msg.precision : node.precision;
                var retentionPolicy = msg.hasOwnProperty('retentionPolicy') ? msg.retentionPolicy : node.retentionPolicy;

                if (precision) {
                    writeOptions.precision = precision;
                }

                if (retentionPolicy) {
                    writeOptions.retentionPolicy = retentionPolicy;
                }

                // format payload to match new writePoints API
                var points = [];
                var point;
                if (_.isArray(msg.payload) && msg.payload.length > 0) {
                    // array of arrays
                    if (_.isArray(msg.payload[0]) && msg.payload[0].length > 0) {
                        msg.payload.forEach(function (nodeRedPoint) {
                            let fields = _.clone(nodeRedPoint[0])
                            point = {
                                measurement: measurement,
                                fields,
                                tags: nodeRedPoint[1]
                            }
                            setFieldIntegers(point.fields)
                            if (point.fields.time) {
                                point.timestamp = point.fields.time;
                                delete point.fields.time;
                            }
                            points.push(point);
                        });
                    } else {
                        // array of non-arrays, assume one point with both fields and tags
                        let fields = _.clone(msg.payload[0])
                        point = {
                            measurement: measurement,
                            fields,
                            tags: msg.payload[1]
                        };
                        setFieldIntegers(point.fields)
                        if (point.fields.time) {
                            point.timestamp = point.fields.time;
                            delete point.fields.time;
                        }
                        points.push(point);
                    }
                } else {
                    if (_.isPlainObject(msg.payload)) {
                        let fields = _.clone(msg.payload)
                        point = {
                            measurement: measurement,
                            fields,
                        };
                        setFieldIntegers(point.fields)
                        if (point.fields.time) {
                            point.timestamp = point.fields.time;
                            delete point.fields.time;
                        }
                    } else {
                        // just a value
                        point = {
                            measurement: measurement,
                            fields: { value: msg.payload }
                        };
                        setFieldIntegers(point.fields)
                    }
                    points.push(point);
                }

                client.writePoints(points, writeOptions)
                .then(() => {
                    done();
                }).catch(function (err) {
                    msg.influx_error = {
                        statusCode: err.res ? err.res.statusCode : 503
                    }
                    done(err);
                });
            });
        } else if (version === VERSION_18_FLUX || version === VERSION_20) {
            let bucket = this.bucket;
            if (version === VERSION_18_FLUX) {
                let retentionPolicy = this.retentionPolicyV18Flux ? this.retentionPolicyV18Flux : 'autogen';
                bucket = `${this.database}/${retentionPolicy}`;
            }
            let org = version === VERSION_18_FLUX ? '' : this.org;

            this.client = this.influxdbConfig.client.getWriteApi(org, bucket, this.precisionV18FluxV20);
            var node = this;

            node.on("input", function (msg) {
                writePoints(msg, node, done);
            });
        }
    }

    RED.nodes.registerType("influxdb out", InfluxOutNode);

    /**
     * Output node to write batches of points to influxdb
     */
    function InfluxBatchNode(n) {
        RED.nodes.createNode(this, n);
        this.influxdb = n.influxdb;
        this.precision = n.precision;
        this.retentionPolicy = n.retentionPolicy;
        this.influxdbConfig = RED.nodes.getNode(this.influxdb);

        if (!this.influxdbConfig) {
            this.error(RED._("influxdb.errors.missingconfig"));
            return;
        }
        if (this.influxdbConfig.influxdbVersion !== VERSION_1X) {
            this.error(RED._("influxdb.errors.invalidconfig"));
            return;
        }
        var node = this;
        var client = this.influxdbConfig.client;

        node.on("input", function (msg, send, done) {
            var writeOptions = {};
            var precision = msg.hasOwnProperty('precision') ? msg.precision : node.precision;
            var retentionPolicy = msg.hasOwnProperty('retentionPolicy') ? msg.retentionPolicy : node.retentionPolicy;

            if (precision) {
                writeOptions.precision = precision;
            }

            if (retentionPolicy) {
                writeOptions.retentionPolicy = retentionPolicy;
            }

            client.writePoints(msg.payload, writeOptions).catch(function (err) {
                msg.influx_error = {
                    statusCode: err.res ? err.res.statusCode : 503
                }
                node.error(err, msg);
                done();
            });
        });
    }

    RED.nodes.registerType("influxdb batch", InfluxBatchNode);

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
        if (version === VERSION_1X) {
            var node = this;
            var client = this.influxdbConfig.client;

            node.on("input", function (msg, send, done) {
                var query;
                var rawOutput;
                var queryOptions = {};
                var precision;
                var retentionPolicy;

                query = msg.hasOwnProperty('query') ? msg.query : node.query;
                if (!query) {
                    node.error(RED._("influxdb.errors.noquery"), msg);
                    done();
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
                    send(msg);
                    done();
                }).catch(function (err) {
                    msg.influx_error = {
                        statusCode: err.res ? err.res.statusCode : 503
                    }
                    done(err);
                });
            });

        } else if (version === VERSION_18_FLUX || version === VERSION_20) {
            let org = version === VERSION_20 ? this.org : ''
            this.client = this.influxdbConfig.client.getQueryApi(org);
            var node = this;

            node.on("input", function (msg, send, done) {
                var query = msg.hasOwnProperty('query') ? msg.query : node.query;
                if (!query) {
                    return done(RED._("influxdb18.errors.noquery"));
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
                        node.error(error, msg);
                        done();
                    },
                    complete() {
                        msg.payload = output;
                        send(msg);
                    },
                });
            });
        }
    }

    RED.nodes.registerType("influxdb in", InfluxInNode);
}
