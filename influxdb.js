var _ = require('lodash');

module.exports = function(RED) {
    "use strict";
    var Influx = require('influx');
    var { InfluxDB, Point } = require('@influxdata/influxdb-client');

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

        this.client = new Influx.InfluxDB({
            hosts: [ {
                host: this.hostname,
                port: this.port,
                protocol: this.usetls ? "https" : "http",
                options: this.hostOptions
                }
            ],
            database: this.database,
            username: this.credentials.username,
            password: this.credentials.password
        });
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
        this.precision = n.precision;
        this.retentionPolicy = n.retentionPolicy;
        this.influxdbConfig = RED.nodes.getNode(this.influxdb);

        if (this.influxdbConfig) {
            var node = this;
            var client = this.influxdbConfig.client;

            node.on("input",function(msg) {
                var measurement;
                var writeOptions = {};
                var measurement = msg.hasOwnProperty('measurement') ? msg.measurement : node.measurement;
                if (!measurement) {
                    node.error(RED._("influxdb.errors.nomeasurement"),msg);
                    return;                
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

                client.writePoints(points, writeOptions).catch(function(err) {
                    msg.influx_error = {
                        statusCode : err.res ? err.res.statusCode : 503
                    }
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
        this.precision = n.precision;
        this.retentionPolicy = n.retentionPolicy;
        this.influxdbConfig = RED.nodes.getNode(this.influxdb);

        if (this.influxdbConfig) {
            var node = this;
            var client = this.influxdbConfig.client;

            node.on("input",function(msg) {
                var writeOptions = {};
                var precision = msg.hasOwnProperty('precision') ? msg.precision : node.precision;
                var retentionPolicy = msg.hasOwnProperty('retentionPolicy') ? msg.retentionPolicy : node.retentionPolicy;

                if (precision) {
                    writeOptions.precision = precision;
                }

                if (retentionPolicy) {
                    writeOptions.retentionPolicy = retentionPolicy;
                }

                client.writePoints(msg.payload, writeOptions).catch(function(err) {
                    msg.influx_error = {
                        statusCode : err.res ? err.res.statusCode : 503
                    }
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
            var client = this.influxdbConfig.client;

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
                    msg.influx_error = {
                        statusCode : err.res ? err.res.statusCode : 503
                    }
                    node.error(err, msg);
                });
            });
        } else {
            this.error(RED._("influxdb.errors.missingconfig"));
        }
    }
    RED.nodes.registerType("influxdb in",InfluxInNode);

    function addFieldsToPoint(point, fields) {
        for (const prop in fields) {
          const value = fields[prop];
          if (prop === 'time') {
            point.timestamp(value);
          } else if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              point.intField(prop, value);
            } else {
              point.floatField(prop, value);
            }
          } else if (typeof value === 'string') {
            point.stringField(prop, value);
          } else if (typeof value === 'boolean') {
            point.booleanField(prop, value);
          }
        }
      }

    /**
     * Config node for InfluxDB 1.8 flux
     */
    function Influx18FluxConfigNode(n) {
        RED.nodes.createNode(this,n);
        var token = `${this.credentials.username}:${this.credentials.password}`;
        var clientOptions = {
            url: n.url,
            token: token
        }
        this.influxDB = new InfluxDB(clientOptions);
    }
    RED.nodes.registerType("influxdb18flux",Influx18FluxConfigNode,{
        credentials: {
            username: {type:"text"},
            password: {type: "password"}
        }
    });

    /**
     * Output node to write to an InfluxDB 1.8 flux measurement
     */
    function Influx18FluxOutNode(n) {
        RED.nodes.createNode(this,n);
        this.influxdbConfig = RED.nodes.getNode(n.influxdb);        
        this.measurement = n.measurement;
        this.precision = n.precision;
        var retentionPolicy = n.retentionPolicy ? n.retentionPolicy : 'autogen';
        this.bucket = `${n.database}/${retentionPolicy}`;

        if (this.influxdbConfig) {
            var node = this;
            node.on("input",function(msg) {                
                var precision = msg.hasOwnProperty('precision') ? msg.precision : node.precision;
                var client = this.influxdbConfig.influxDB.getWriteApi('', node.bucket, precision);
                var measurement = msg.hasOwnProperty('measurement') ? msg.measurement : node.measurement;
                if (!measurement) {
                    node.error(RED._("influxdb18.errors.nomeasurement"),msg);
                    return;                
                }
                var point;
                if (_.isArray(msg.payload) && msg.payload.length > 0) {
                    // array of arrays
                    if (_.isArray(msg.payload[0]) && msg.payload[0].length > 0) {
                        msg.payload.forEach(element => {  
                            point = new Point(measurement);                            
                            
                            var fields = element[0];
                            addFieldsToPoint(point, fields);
                          
                            var tags = element[1];
                            for (const prop in tags) {
                              point.tag(prop, tags[prop]);
                            }
                            client.writePoint(point);
                          });                          
                    } else {
                        // array of non-arrays, assume one point with both fields and tags
                        point = new Point(measurement);

                        var fields = msg.payload[0];
                        addFieldsToPoint(point, fields);

                        const tags = msg.payload[1];
                        for (const prop in tags) {
                            point.tag(prop, tags[prop]);
                        }

                        client.writePoint(point)
                    }
                } else {
                    if (_.isPlainObject(msg.payload)) {
                        point = new Point(measurement);
                        var fields = msg.payload;
                        addFieldsToPoint(point, fields);
                        client.writePoint(point);
                    } else {
                        // just a value
                        point = new Point(measurement);
                        var value = msg.payload;
                        if (typeof value === 'number') {
                            if (Number.isInteger(value)) {
                              point.intField('value', value);
                            } else {
                              point.floatField('value', value);
                            }
                          } else if (typeof value === 'string') {
                            point.stringField('value', value);
                          } else if (typeof value === 'boolean') {
                            point.booleanField('value', value);
                          }
                          client.writePoint(point);
                    }
                }
                
                client
                    .close()
                    .catch(error => {
                        msg.influx_error = {
                            errorMessage: error
                        };
                        node.error(error, msg);
                    })
            });
        } else {
            this.error(RED._("influxdb18.errors.missingconfig"));
        }
    }
    RED.nodes.registerType("influxdb 1.8 flux out",Influx18FluxOutNode);
    
    /**
     * Input node to make queries to InfluxDB 1.8 flux
     */
    function Influx18FluxInNode(n) {
        RED.nodes.createNode(this, n);
        this.influxdbConfig = RED.nodes.getNode(n.influxdb);
        this.query = n.query;

        if (this.influxdbConfig) {
            var node = this;
            var client = this.influxdbConfig.client;

            node.on("input", function (msg) {                
                var client = this.influxdbConfig.influxDB.getQueryApi('');                
                var query = msg.hasOwnProperty('query') ? msg.query : node.query;
                if (!query) {
                    node.error(RED._("influxdb18.errors.noquery"), msg);
                    return;                  
                }
                var output = [];
                client.queryRows(query, {
                    next(row, tableMeta) {
                        var o = tableMeta.toObject(row)
                        output.push(o);
                    },
                    error(error) {
                        msg.influx_error = {
                            errorMessage: error
                        };
                        node.error(error, msg);
                    },
                    complete() {
                        msg.payload = output;
                        node.send(msg);
                    },
                })
            });
        } else {
            this.error(RED._("influxdb18.errors.missingconfig"));
        }
    }
    RED.nodes.registerType("influxdb 1.8 flux in",Influx18FluxInNode);

    /**
     * Config node for InfluxDB 2
     */
    function Influx2ConfigNode(n) {
        RED.nodes.createNode(this,n);
        var clientOptions = {
            url: n.url,
            token: n.token
        }
        this.influxDB = new InfluxDB(clientOptions);        
    }
    RED.nodes.registerType("influxdb2",Influx2ConfigNode);

    /**
     * Output node to write to an InfluxDB 2 measurement
     */
    function Influx2OutNode(n) {
        RED.nodes.createNode(this,n);
        this.influxdbConfig = RED.nodes.getNode(n.influxdb);        
        this.org = n.org;
        this.bucket = n.bucket;
        this.measurement = n.measurement;
        this.precision = n.precision;        

        if (this.influxdbConfig) {
            var node = this;
            node.on("input",function(msg) {                
                var precision = msg.hasOwnProperty('precision') ? msg.precision : node.precision;
                var client = this.influxdbConfig.influxDB.getWriteApi(node.org, node.bucket, precision);
                var measurement = msg.hasOwnProperty('measurement') ? msg.measurement : node.measurement;
                if (!measurement) {
                    node.error(RED._("influxdb2.errors.nomeasurement"),msg);
                    return;                
                }
                var point;
                if (_.isArray(msg.payload) && msg.payload.length > 0) {
                    // array of arrays
                    if (_.isArray(msg.payload[0]) && msg.payload[0].length > 0) {
                        msg.payload.forEach(element => {  
                            point = new Point(measurement);                            
                            
                            var fields = element[0];
                            addFieldsToPoint(point, fields);
                          
                            var tags = element[1];
                            for (const prop in tags) {
                              point.tag(prop, tags[prop]);
                            }
                            client.writePoint(point);
                          });                          
                    } else {
                        // array of non-arrays, assume one point with both fields and tags
                        point = new Point(measurement);

                        var fields = msg.payload[0];
                        addFieldsToPoint(point, fields);

                        const tags = msg.payload[1];
                        for (const prop in tags) {
                            point.tag(prop, tags[prop]);
                        }

                        client.writePoint(point)
                    }
                } else {
                    if (_.isPlainObject(msg.payload)) {
                        point = new Point(measurement);
                        var fields = msg.payload;
                        addFieldsToPoint(point, fields);
                        client.writePoint(point);
                    } else {
                        // just a value
                        point = new Point(measurement);
                        var value = msg.payload;
                        if (typeof value === 'number') {
                            if (Number.isInteger(value)) {
                              point.intField('value', value);
                            } else {
                              point.floatField('value', value);
                            }
                          } else if (typeof value === 'string') {
                            point.stringField('value', value);
                          } else if (typeof value === 'boolean') {
                            point.booleanField('value', value);
                          }
                          client.writePoint(point);
                    }
                }
                
                client
                    .close()
                    .catch(error => {
                        msg.influx_error = {
                            errorMessage: error
                        };
                        node.error(error, msg);
                    })
            });
        } else {
            this.error(RED._("influxdb2.errors.missingconfig"));
        }
    }
    RED.nodes.registerType("influxdb 2 out",Influx2OutNode);
    
    /**
     * Input node to make queries to InfluxDB 2
     */
    function Influx2InNode(n) {
        RED.nodes.createNode(this, n);
        this.influxdbConfig = RED.nodes.getNode(n.influxdb);
        this.org = n.org;
        this.query = n.query;

        if (this.influxdbConfig) {
            var node = this;
            var client = this.influxdbConfig.client;

            node.on("input", function (msg) {                
                var client = this.influxdbConfig.influxDB.getQueryApi(node.org);                
                var query = msg.hasOwnProperty('query') ? msg.query : node.query;
                if (!query) {
                    node.error(RED._("influxdb2.errors.noquery"), msg);
                    return;                  
                }
                var output = [];
                client.queryRows(query, {
                    next(row, tableMeta) {
                        var o = tableMeta.toObject(row)
                        output.push(o);
                    },
                    error(error) {
                        msg.influx_error = {
                            errorMessage: error
                        };
                        node.error(error, msg);
                    },
                    complete() {
                        msg.payload = output;
                        node.send(msg);
                    },
                })
            });
        } else {
            this.error(RED._("influxdb2.errors.missingconfig"));
        }
    }
    RED.nodes.registerType("influxdb 2 in",Influx2InNode);
}
