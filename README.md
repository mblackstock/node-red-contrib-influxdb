# node-red-contrib-influxdb

<a href="http://nodered.org" target="_new">Node-RED</a> nodes to write and query data from an influxdb time series database. 

A first set of nodes, available under the category **InfluxDB 18** in the NR editor, use the <a href="https://www.npmjs.com/package/influx" target="_new">influxDB 1.x client</a> for node.js, specifically calling the **writePoints()**, and **query()** methods. Currently these nodes can only communicate with one influxdb host. These nodes are used for writing and querying data in InfluxDB 1.x to 1.8+.

A second set of nodes, available under the category **InfluxDB 18 flux** in the NR editor, use the <a href="https://docs.influxdata.com/influxdb/v1.8/tools/api/#influxdb-2-0-api-compatibility-endpoints" target="_new"> influxDB 2.0 API compatibility endpoints</a> available in the <a href="https://docs.influxdata.com/influxdb/v1.8/tools/api/#influxdb-2-0-api-compatibility-endpoints" target="_new">InfluxDB 2.0 client libraries</a> for node.js. These nodes are used for writing and querying data with Flux in InfluxDB 1.8+.

A third set of nodes, available as **InfluxDB 2** category, leverage the <a href="https://docs.influxdata.com/influxdb/v1.8/tools/api/#influxdb-2-0-api-compatibility-endpoints" target="_new">InfluxDB 2.0 client libraries</a> for writing and querying data with Flux in InfluxDB 2.0.

## Prerequisites

To run this you'll need access to an InfluxDB database version 1.x, 1.8+ or 2.0. See the <a href="https://influxdb.com/" target="_new">influxdb site</a> for more information. The last release of this node has been tested with InfluxDB 1.8 and 2.0.

## Install

Run the following command in the root directory of your Node-RED install.
Usually this is `~/.node-red` .

    npm install node-red-contrib-influxdb

##  **Usage - InfluxDB 18**

Nodes to write and query data from an influxdb time series database. Supoorted versions from 1.x to 1.8.

### Input Node

Queries one or more measurements in an influxdb database.  The query is specified in the node configuration or in the ***msg.query*** property.  Setting it in the node will override the ***msg.query***.  The result is returned in ***msg.payload***.

For example, here is a simple flow to query all of the points in the `test` measurement of the `aTimeSeries` database, where the query is in the configuration of the influxdb input node (copy and paste to your NR editor).

    [{"id":"eba91e98.1456e","type":"influxdb","z":"b061b303.4f9e5","hostname":"127.0.0.1","port":"8086","database":"aTimeSeries","name":"aTimeSeries"},{"id":"9641241a.69bed8","type":"influxdb in","z":"b061b303.4f9e5","influxdb":"eba91e98.1456e","name":"time query","query":"select * from test;","x":259,"y":416,"wires":[["ef40525d.10bfb"]]},{"id":"99338e00.66cc7","type":"inject","z":"b061b303.4f9e5","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":108,"y":416,"wires":[["9641241a.69bed8"]]},{"id":"ef40525d.10bfb","type":"debug","z":"b061b303.4f9e5","name":"","active":true,"console":"false","complete":"false","x":441,"y":416,"wires":[]}]

This flow performs the same, but using a query in the msg.payload:

    [{"id":"eba91e98.1456e","type":"influxdb","z":"b061b303.4f9e5","hostname":"127.0.0.1","port":"8086","database":"aTimeSeries","name":"aTimeSeries"},{"id":"c8b8604d.3747a","type":"inject","z":"b061b303.4f9e5","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":113,"y":496,"wires":[["affa0a63.5005f8"]]},{"id":"affa0a63.5005f8","type":"function","z":"b061b303.4f9e5","name":"simple query","func":"msg.query=\"select * from test;\";\nreturn msg;","outputs":1,"noerr":0,"x":273,"y":496,"wires":[["30a428ee.cf5bd8"]]},{"id":"30a428ee.cf5bd8","type":"influxdb in","z":"b061b303.4f9e5","influxdb":"eba91e98.1456e","name":"time query","query":"","x":436,"y":496,"wires":[["eee2af7a.111d5"]]},{"id":"eee2af7a.111d5","type":"debug","z":"b061b303.4f9e5","name":"","active":true,"console":"false","complete":"false","x":594,"y":496,"wires":[]}]

The function node in this flow sets the `msg.query` property as follows:

    msg.query="select * from test;";
    return msg;

### Output Node

Writes one or more points (fields and tags) to a measurement.

The fields and tags to write are in ***msg.payload***.  If the message is a string, number, or boolean, it will be written as a single value to the specified measurement (called *value*).

For example, the following flow injects a single random field called `value` into the measurement `test` in the database `aTimeSeries` with the current timestamp.

    [{"id":"eba91e98.1456e","type":"influxdb","z":"b061b303.4f9e5","hostname":"127.0.0.1","port":"8086","database":"aTimeSeries","name":"aTimeSeries"},{"id":"17bd4566.e842bb","type":"influxdb out","z":"b061b303.4f9e5","influxdb":"eba91e98.1456e","name":"","measurement":"test","x":428,"y":36,"wires":[]},{"id":"be93bfeb.416c4","type":"function","z":"b061b303.4f9e5","name":"single value","func":"msg.payload = Math.random()*10;\nreturn msg;","outputs":1,"noerr":0,"x":245,"y":64,"wires":[["17bd4566.e842bb"]]},{"id":"31f9f174.ce060e","type":"inject","z":"b061b303.4f9e5","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":101,"y":39,"wires":[["be93bfeb.416c4"]]}]

The function node consists of the following:

    msg.payload = Math.random()*10;
    return msg;

If ***msg.payload*** is an object containing multiple properties, the fields will be written to the measurement.

For example, the following flow injects three fields, `numValue`, `randomValue` and `strValue` into the same measurement with the current timestamp.

    [{"id":"eba91e98.1456e","type":"influxdb","z":"b061b303.4f9e5","hostname":"127.0.0.1","port":"8086","database":"aTimeSeries","name":"aTimeSeries"},{"id":"baee675c.451198","type":"inject","z":"b061b303.4f9e5","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":103,"y":177,"wires":[["827180cf.7d8e8"]]},{"id":"827180cf.7d8e8","type":"function","z":"b061b303.4f9e5","name":"Fields","func":"msg.payload = {\n    numValue: 123.0,\n    strValue: \"message\",\n    randomValue: Math.random()*10\n}\nreturn msg;","outputs":1,"noerr":0,"x":251,"y":177,"wires":[["c36cb4d6.3c9348"]]},{"id":"c36cb4d6.3c9348","type":"influxdb out","z":"b061b303.4f9e5","influxdb":"eba91e98.1456e","name":"","measurement":"test","x":421,"y":177,"wires":[]}]

The function node in the flow above consists of the following:

    msg.payload = {
        numValue: 123.0,
        strValue: "message",
        randomValue: Math.random()*10
    }
    return msg;

If ***msg.payload*** is an array containing two objects, the first object will be written as the set of named fields, the second is the set of named tags.

For example, the following simple flow injects three fields as above, along with two tags, `tag1` and `tag2`:

    [{"id":"eba91e98.1456e","type":"influxdb","z":"b061b303.4f9e5","hostname":"127.0.0.1","port":"8086","database":"aTimeSeries","name":"aTimeSeries"},{"id":"7f25337e.80dacc","type":"inject","z":"b061b303.4f9e5","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":101,"y":248,"wires":[["bb0ff0.ff44f01"]]},{"id":"bb0ff0.ff44f01","type":"function","z":"b061b303.4f9e5","name":"Fields and Tags","func":"msg.payload = [{\n    numValue: 12,\n    randomValue: Math.random()*10,\n    strValue: \"message2\"\n},\n{\n    tag1:\"sensor1\",\n    tag2:\"device2\"\n}];\nreturn msg;","outputs":1,"noerr":0,"x":272,"y":248,"wires":[["8e2713fa.71d8f"]]},{"id":"8e2713fa.71d8f","type":"influxdb out","z":"b061b303.4f9e5","influxdb":"eba91e98.1456e","name":"","measurement":"test","x":460,"y":248,"wires":[]}]

The function node consists of the following code:

    msg.payload = [{
        numValue: 12,
        randomValue: Math.random()*10,
        strValue: "message2"
    },
    {
        tag1:"sensor1",
        tag2:"device2"
    }];
    return msg;

Finally, if ***msg.payload*** is an array of arrays, it will be written as a series of points containing fields and tags.

For example, the following flow injects two points with timestamps specified.  

    [{"id":"eba91e98.1456e","type":"influxdb","z":"b061b303.4f9e5","hostname":"127.0.0.1","port":"8086","database":"aTimeSeries","name":"aTimeSeries"},{"id":"9555a67c.6aaa58","type":"function","z":"b061b303.4f9e5","name":"multiple readings","func":"msg.payload = [\n    [{\n        numValue: 10,\n        randomValue: Math.random()*10,\n        strValue: \"message1\",\n        time: new Date(\"2015-12-28T19:41:13Z\").getTime()\n    },\n    {\n        tag1:\"sensor1\",\n        tag2:\"device2\"\n    }],\n    [{\n        numValue: 20,\n        randomValue: Math.random()*10,\n        strValue: \"message2\",\n        time: new Date(\"2015-12-28T19:41:14Z\").getTime()\n    },\n    {\n        tag1:\"sensor1\",\n        tag2:\"device2\"\n    }]\n];\nreturn msg;","outputs":1,"noerr":0,"x":278,"y":335,"wires":[["f485378d.0b7ac8"]]},{"id":"68b911d9.9746f","type":"inject","z":"b061b303.4f9e5","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":104,"y":335,"wires":[["9555a67c.6aaa58"]]},{"id":"f485378d.0b7ac8","type":"influxdb out","z":"b061b303.4f9e5","influxdb":"eba91e98.1456e","name":"","measurement":"test","x":479,"y":334,"wires":[]}]

The function node in the above flow looks as follows:

    msg.payload = [
        [{
            numValue: 10,
            randomValue: Math.random()*10,
            strValue: "message1",
            time: new Date("2015-12-28T19:41:13Z").getTime()
        },
        {
            tag1:"sensor1",
            tag2:"device2"
        }],
        [{
            numValue: 20,
            randomValue: Math.random()*10,
            strValue: "message2",
            time: new Date("2015-12-28T19:41:14Z").getTime()
        },
        {
            tag1:"sensor1",
            tag2:"device2"
        }]
    ];
    return msg;

Note how timestamps are specified - the number of milliseconds since 1 January 1970 00:00:00 UTC. In this case do not forget to set "ms" in "Time Precision" (Advanced Query Options) of the "Influx Out Node".

### The Batch Output Node

The batch output node (influx batch) sends a list of *points* together in a batch to InfluxDB in a slightly different format from the output node, more in line with the underlying node.js [influx library version 5.x](https://www.npmjs.com/package/influx). In each point you must specify the measurement name to write into as well as a list of tag and field values. Optionally, you can specify the time to tag that point at, defaulting to the current time.

Under the hood we are calling the node influxdb 5.x library **writePoints()** call as documented [here](https://node-influx.github.io/class/src/index.js~InfluxDB.html#instance-method-writePoints).

By default the node will write timestamps using ms precision since that's what JavaScript gives us. if you specify the timestamp as a Date object, we'll convert it to milliseconds.

If you provide a string or number as the timestamp, we'll pass it straight into Influx to parse using the specified precision, or the default precision in nanoseconds if it is left unspecified.

>>**Note** that the default precision is *nanoseconds*, so if you pass in a number such as date.getTime(), and do not specify millisecond precision, your timestamp will be orders of magnitude incorrect.

The following example flow writes two points to two measurements, setting the timestamp to the current date.

    [{"id":"4a271a88.499184","type":"function","z":"87205ed6.329bc","name":"multiple measurement points","func":"msg.payload = [\n    {\n        measurement: \"weather_sensor\",\n        fields: {\n            temp: 5.5,\n            light: 678,\n            humidity: 51\n        },\n        tags:{\n            location:\"garden\"\n        },\n        timestamp: new Date()\n    },\n    {\n        measurement: \"alarm_sensor\",\n        fields: {\n            proximity: 999,\n            temp: 19.5\n        },\n        tags:{\n            location:\"home\"\n        },\n        timestamp: new Date()\n    }\n];\nreturn msg;","outputs":1,"noerr":0,"x":400,"y":280,"wires":[["748a06bd.675ed8"]]},{"id":"6493a442.1cdcbc","type":"inject","z":"87205ed6.329bc","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":140,"y":220,"wires":[["4a271a88.499184"]]},{"id":"748a06bd.675ed8","type":"influxdb batch","z":"87205ed6.329bc","influxdb":"6ca8bde.9eb2f44","name":"","x":670,"y":220,"wires":[]},{"id":"6ca8bde.9eb2f44","type":"influxdb","z":"","hostname":"localhost","port":"8086","protocol":"https","database":"new_db","name":"","usetls":true,"tls":"f7f39f4e.896ae"},{"id":"f7f39f4e.896ae","type":"tls-config","z":"","name":"local-tls","cert":"","key":"","ca":"","certname":"","keyname":"","caname":"","verifyservercert":false}]

The function node generates sample points as follows:

    msg.payload = [
        {
            measurement: "weather_sensor",
            fields: {
                temp: 5.5,
                light: 678,
                humidity: 51
            },
            tags:{
                location:"garden"
            },
            timestamp: new Date()
        },
        {
            measurement: "alarm_sensor",
            fields: {
                proximity: 999,
                temp: 19.5
            },
            tags:{
                location:"home"
            },
            timestamp: new Date()
        }
    ];
    return msg;

### Catching Failed Reads and Writes

Errors in reads and writes can be caught using the node-red `catch` node as usual.
Standard error information is availlable in the default `msg.error` field; additional
information about the underlying error is in the `msg.influx_error` field. Currently,
this includes the HTTP status code returned from the influxdb server. The `influx-read`
node will always throw a `503`, whereas the write nodes will include other status codes
as detailed in the 
[Influx API documentation](https://docs.influxdata.com/influxdb/v1.8/tools/api/#status-codes-and-responses-2).

## **Usage - InfluxDB 18 flux**

Nodes to write and query data from an influxdb time series database using compatibility endpoints of the InfluxDB 2.0 client libraries for writing and querying data with Flux. Supoorted version is 1.8+.

### Input Node

Allows flux queries to be made to an influxdb time series database. The flux query can be specified in the configuration property or using the property **msg.query**. Setting it in the node will override the **msg.query**. The results will be returned in **msg.payload**.

For example, here is a simple flow to query all of the points in the `test` database, where the query is in the configuration of the influxdb input node (copy and paste to your NR editor).

    [{"id":"2c24bff8.5d5fb","type":"influxdb 1.8 flux in","z":"653805bf.2d2784","influxdb":"eb34baa.56944c8","query":"from(bucket: \"test/autogen\") |> range(start: -1m, stop: 1h)","name":"","x":520,"y":300,"wires":[["9ec53e18.774c18"]]},{"id":"9ec53e18.774c18","type":"debug","z":"653805bf.2d2784","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","x":930,"y":300,"wires":[]},{"id":"a89497f8.4c509","type":"inject","z":"653805bf.2d2784","name":"","repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":140,"y":300,"wires":[["2c24bff8.5d5fb"]]},{"id":"eb34baa.56944c8","type":"influxdb18flux","z":"","url":"https://localhost:8086","name":""}]

This flow performs the same, but using a query in the msg.payload:

    [{"id":"661fd96e.7691f8","type":"inject","z":"653805bf.2d2784","name":"","repeat":"","crontab":"","once":false,"topic":"","payload":"","payloadType":"date","x":160,"y":540,"wires":[["ce9462a5.eed9a8"]]},{"id":"ce9462a5.eed9a8","type":"function","z":"653805bf.2d2784","name":"simple query","func":"msg.query='from(bucket: \"test/autogen\") |> range(start: -1m, stop: 1h)';\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","x":350,"y":540,"wires":[["3d674774.6f9d08"]]},{"id":"f231bdfa.999e8","type":"debug","z":"653805bf.2d2784","name":"","active":true,"console":"false","complete":"false","x":810,"y":540,"wires":[]},{"id":"3d674774.6f9d08","type":"influxdb 1.8 flux in","z":"653805bf.2d2784","influxdb":"eb34baa.56944c8","query":"","name":"","x":580,"y":540,"wires":[["f231bdfa.999e8"]]},{"id":"eb34baa.56944c8","type":"influxdb18flux","z":"","url":"https://localhost:8086","name":""}]

The function node in this flow sets the `msg.query` property as follows:

    msg.query='from(bucket: "test/autogen") |> range(start: -1m, stop: 1h)';
    return msg;

### Output Node

Writes one or more points (fields and tags) to a measurement.

The fields and tags to write are in ***msg.payload***. If the message is a string, number or boolean, it will be written as a single value to the specified measurement (field called *value*).

For example, the following flow injects a single random field called `value` into the measurement `test` in the database `test` with the current timestamp.

    [{"id":"120c5823.db609","type":"inject","z":"653805bf.2d2784","name":"","props":[{"p":"payload","v":"","vt":"date"},{"p":"topic","v":"","vt":"string"}],"repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","payload":"","payloadType":"date","x":140,"y":60,"wires":[["eb30f561.c70148"]]},{"id":"eb30f561.c70148","type":"function","z":"653805bf.2d2784","name":"Single Value","func":"msg.payload = Math.random() * 10;\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","x":330,"y":60,"wires":[["cad9f0d2.1463e8"]]},{"id":"cad9f0d2.1463e8","type":"influxdb 1.8 flux out","z":"653805bf.2d2784","influxdb":"eb34baa.56944c8","database":"test","measurement":"test","precision":"ms","retentionPolicy":"","name":"","x":580,"y":60,"wires":[]},{"id":"eb34baa.56944c8","type":"influxdb18flux","z":"","url":"https://localhost:8086","name":""}]

The function node consists of the following:

    msg.payload = Math.random() * 10;
    return msg;

If ***msg.payload*** is an object containing multiple properties, the fields will be written to the measurement.

For example, the following flow injects four fields, `numValue`, `strValue`, `floatValue` and `booleanValue` into the same measurement with the current timestamp. A `time` field can be specified if the timestamp for the measurement is not the current one.

    [{"id":"4fc65aec.2d88bc","type":"inject","z":"653805bf.2d2784","name":"","repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","payload":"","payloadType":"date","x":140,"y":120,"wires":[["b6d751d.392793"]]},{"id":"b6d751d.392793","type":"function","z":"653805bf.2d2784","name":"Fields","func":"msg.payload = {\n  numValue: 123.0,\n  strValue: \"message\",\n  floatValue: Math.random() * 10,\n  booleanValue: true,\n  //time: new Date(\"2020-07-15T12:00:00Z\")\n}\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","x":310,"y":120,"wires":[["207a1809.718b5"]]},{"id":"207a1809.718b5","type":"influxdb 1.8 flux out","z":"653805bf.2d2784","influxdb":"eb34baa.56944c8","database":"test","measurement":"test","precision":"ms","retentionPolicy":"","name":"","x":580,"y":120,"wires":[]},{"id":"eb34baa.56944c8","type":"influxdb18flux","z":"","url":"https://localhost:8086","name":""}]

The function node in the flow above consists of the following:

    msg.payload = {
        numValue: 123.0,
        strValue: "message",
        floatValue: Math.random() * 10,
        ooleanValue: true,
        //time: new Date("2020-07-15T12:00:00Z")
    }
    return msg;

If ***msg.payload*** is an array containing two objects, the first object will be written as the set of named fields and the second is the set of named tags.

For example, the following simple flow injects three fields along with two tags, `tag1` and `tag2`:

    [{"id":"e33df9a0.62473","type":"inject","z":"653805bf.2d2784","name":"","repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","payload":"","payloadType":"date","x":140,"y":180,"wires":[["d195b182.a4702"]]},{"id":"d195b182.a4702","type":"function","z":"653805bf.2d2784","name":"Fields and Tags","func":"msg.payload = [{\n  numValue: 12,\n  randomValue: Math.random() * 10,\n  strValue: \"message2\",\n  //time: new Date(\"2020-07-09T16:00:00Z\")\n},\n{\n  tag1: \"sensor1\",\n  tag2: \"device2\"\n}];\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","x":340,"y":180,"wires":[["bf4607a5.cc9a88"]]},{"id":"bf4607a5.cc9a88","type":"influxdb 1.8 flux out","z":"653805bf.2d2784","influxdb":"eb34baa.56944c8","database":"test","measurement":"test","precision":"ms","retentionPolicy":"","name":"","x":610,"y":180,"wires":[]},{"id":"eb34baa.56944c8","type":"influxdb18flux","z":"","url":"https://localhost:8086","name":""}]

The function node consists of the following code:

    msg.payload = [{
        numValue: 12,
        randomValue: Math.random() * 10,
        strValue: "message2",
        //time: new Date("2020-07-09T16:00:00Z")
    },
    {
        tag1: "sensor1",
        tag2: "device2"
    }];
    return msg;

Finally, if ***msg.payload*** is an array of arrays, it will be written as a series of points containing fields and tags.

For example, the following flow injects two points with timestamps specified.  

    [{"id":"99251519.a7b3e8","type":"inject","z":"653805bf.2d2784","name":"","repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","payload":"","payloadType":"date","x":140,"y":240,"wires":[["1bf3451b.36b1bb"]]},{"id":"1bf3451b.36b1bb","type":"function","z":"653805bf.2d2784","name":"multiple readings","func":"msg.payload = [\n  [{\n    numValue: 10,\n    randomValue: Math.random() * 10,\n    strValue: \"message1\",\n    time: new Date(\"2020-07-16T13:00:02Z\")\n  },\n  {\n    tag1: \"sensor1\",\n    tag2: \"device2\"\n  }],\n  [{\n    numValue: 20,\n    randomValue: Math.random() * 10,\n    strValue: \"message2\",\n    time: new Date(\"2020-07-16T13:00:03Z\")\n  },\n  {\n    tag1: \"sensor2\",\n    tag2: \"device1\"\n  }]\n];\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","x":350,"y":240,"wires":[["fd4b0034.d7eb7"]]},{"id":"fd4b0034.d7eb7","type":"influxdb 1.8 flux out","z":"653805bf.2d2784","influxdb":"eb34baa.56944c8","database":"test","measurement":"test","precision":"ms","retentionPolicy":"","name":"","x":610,"y":240,"wires":[]},{"id":"eb34baa.56944c8","type":"influxdb18flux","z":"","url":"https://localhost:8086","name":""}]

The function node in the above flow looks as follows:

    msg.payload = [
        [{
            numValue: 10,
            randomValue: Math.random() * 10,
            strValue: "message1",
            time: new Date("2020-07-16T13:00:02Z")
        },
        {
            tag1: "sensor1",
            tag2: "device2"
        }],
        [{
            numValue: 20,
            randomValue: Math.random() * 10,
            strValue: "message2",
            time: new Date("2020-07-16T13:00:03Z")
        },
        {
            tag1: "sensor2",
            tag2: "device1"
        }]
        ];
    return msg;

Note how timestamps are specified - the number of milliseconds since 1 January 1970 00:00:00 UTC. In this case do not forget to set "ms" in "Time Precision" of the influx out node.

### Catching Failed Reads and Writes

Errors in reads and writes can be caught using the node-red `catch` node as usual. Standard error information is availlable in the default `msg.error` field; additional information about the underlying error is in the `msg.influx_error` field. Currently, this includes the HTTP status code returned from the influxdb server.

## **Usage - InfluxDB 2**

Nodes to write and query data from an influxdb time series database using the InfluxDB 2.0 client libraries for writing and querying data with Flux. Supoorted version is 2.0.

### Input Node

Allows flux queries to be made to an influxdb time series database. The flux query can be specified in the configuration property or using the property **msg.query**. Setting it in the node will override the **msg.query**. The results will be returned in **msg.payload**.

For example, here is a simple flow to query all of the points in the `test` bucket, where the query is in the configuration of the influxdb input node (copy and paste to your NR editor).

    [{"id":"3e760db.d141d72","type":"debug","z":"c70ec85f.ffbc3","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","x":930,"y":300,"wires":[]},{"id":"6d054c00.b726dc","type":"inject","z":"c70ec85f.ffbc3","name":"","repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":140,"y":300,"wires":[["de82c653.cd498"]]},{"id":"de82c653.cd498","type":"influxdb 2 in","z":"c70ec85f.ffbc3","influxdb":"3dcd3c8e.fe9b24","org":"my-org","query":"from(bucket: \"test\") |> range(start: -1m, stop: 1h)","name":"","x":500,"y":300,"wires":[["3e760db.d141d72"]]},{"id":"3dcd3c8e.fe9b24","type":"influxdb2","z":"","url":"https://localhost:9999","token":"M7r8bFX-PqZVyehdeKKRqnGiGq8HIKkSSgcKJulra63_FrJydTtm_KmzTm_KzZLuME69xBCTW-MFbOBl2JpGtg==","name":""}]

This flow performs the same, but using a query in the msg.payload:

    [{"id":"e521a270.12701","type":"inject","z":"c70ec85f.ffbc3","name":"","repeat":"","crontab":"","once":false,"topic":"","payload":"","payloadType":"date","x":160,"y":520,"wires":[["68210f4f.60f99"]]},{"id":"68210f4f.60f99","type":"function","z":"c70ec85f.ffbc3","name":"simple query","func":"msg.query='from(bucket: \"test\") |> range(start: -1m, stop: 1h)';\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","x":350,"y":520,"wires":[["664bc03e.d3311"]]},{"id":"9a24c95c.a13a9","type":"debug","z":"c70ec85f.ffbc3","name":"","active":true,"console":"false","complete":"false","x":810,"y":520,"wires":[]},{"id":"664bc03e.d3311","type":"influxdb 2 in","z":"c70ec85f.ffbc3","influxdb":"3dcd3c8e.fe9b24","org":"my-org","query":"","name":"","x":580,"y":520,"wires":[["9a24c95c.a13a9"]]},{"id":"3dcd3c8e.fe9b24","type":"influxdb2","z":"","url":"https://localhost:9999","token":"M7r8bFX-PqZVyehdeKKRqnGiGq8HIKkSSgcKJulra63_FrJydTtm_KmzTm_KzZLuME69xBCTW-MFbOBl2JpGtg==","name":""}]

The function node in this flow sets the `msg.query` property as follows:

    msg.query='from(bucket: "test") |> range(start: -1m, stop: 1h)';
    return msg;

### Output Node

Writes one or more points (fields and tags) to a measurement.

The fields and tags to write are in ***msg.payload***. If the message is a string, number or boolean, it will be written as a single value to the specified measurement (field called *value*).

For example, the following flow injects a single random field called `value` into the measurement `test` in the bucket `test` and organisation `my-org` with the current timestamp.

    [{"id":"d9f0ebfc.ecfec8","type":"inject","z":"c70ec85f.ffbc3","name":"","props":[{"p":"payload","v":"","vt":"date"},{"p":"topic","v":"","vt":"string"}],"repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","payload":"","payloadType":"date","x":140,"y":60,"wires":[["c555c3a0.204c58"]]},{"id":"c555c3a0.204c58","type":"function","z":"c70ec85f.ffbc3","name":"Single Value","func":"msg.payload = Math.random() * 10;\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","x":330,"y":60,"wires":[["f5a4befd.56d75"]]},{"id":"f5a4befd.56d75","type":"influxdb 2 out","z":"c70ec85f.ffbc3","influxdb":"3dcd3c8e.fe9b24","org":"my-org","bucket":"test","measurement":"test","precision":"ms","name":"","x":650,"y":60,"wires":[]},{"id":"3dcd3c8e.fe9b24","type":"influxdb2","z":"","url":"https://localhost:9999","token":"M7r8bFX-PqZVyehdeKKRqnGiGq8HIKkSSgcKJulra63_FrJydTtm_KmzTm_KzZLuME69xBCTW-MFbOBl2JpGtg==","name":""}]

The function node consists of the following:

    msg.payload = Math.random() * 10;
    return msg;

If ***msg.payload*** is an object containing multiple properties, the fields will be written to the measurement.

For example, the following flow injects four fields, `numValue`, `strValue`, `floatValue` and `booleanValue` into the same measurement with the current timestamp. A `time` field can be specified if the timestamp for the measurement is not the current one.

    [{"id":"1606c311.639f3d","type":"inject","z":"c70ec85f.ffbc3","name":"","repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","payload":"","payloadType":"date","x":140,"y":120,"wires":[["6fad44a5.d5f544"]]},{"id":"6fad44a5.d5f544","type":"function","z":"c70ec85f.ffbc3","name":"Fields","func":"msg.payload = {\n  numValue: 123.0,\n  strValue: \"message\",\n  floatValue: Math.random() * 10,\n  booleanValue: true,\n  //time: new Date(\"2020-07-15T12:00:00Z\")\n}\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","x":310,"y":120,"wires":[["a57b64be.670488"]]},{"id":"a57b64be.670488","type":"influxdb 2 out","z":"c70ec85f.ffbc3","influxdb":"3dcd3c8e.fe9b24","org":"my-org","bucket":"test","measurement":"test","precision":"ms","name":"","x":650,"y":120,"wires":[]},{"id":"3dcd3c8e.fe9b24","type":"influxdb2","z":"","url":"https://localhost:9999","token":"M7r8bFX-PqZVyehdeKKRqnGiGq8HIKkSSgcKJulra63_FrJydTtm_KmzTm_KzZLuME69xBCTW-MFbOBl2JpGtg==","name":""}]

The function node in the flow above consists of the following:

    msg.payload = {
        numValue: 123.0,
        strValue: "message",
        floatValue: Math.random() * 10,
        ooleanValue: true,
        //time: new Date("2020-07-15T12:00:00Z")
    }
    return msg;

If ***msg.payload*** is an array containing two objects, the first object will be written as the set of named fields and the second is the set of named tags.

For example, the following simple flow injects three fields along with two tags, `tag1` and `tag2`:

    [{"id":"f35e5815.9ac48","type":"inject","z":"c70ec85f.ffbc3","name":"","repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","payload":"","payloadType":"date","x":140,"y":180,"wires":[["cc6a2a67.5edc28"]]},{"id":"cc6a2a67.5edc28","type":"function","z":"c70ec85f.ffbc3","name":"Fields and Tags","func":"msg.payload = [{\n  numValue: 12,\n  randomValue: Math.random() * 10,\n  strValue: \"message2\",\n  //time: new Date(\"2020-07-09T16:00:00Z\")\n},\n{\n  tag1: \"sensor1\",\n  tag2: \"device2\"\n}];\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","x":340,"y":180,"wires":[["42816c54.99f794"]]},{"id":"42816c54.99f794","type":"influxdb 2 out","z":"c70ec85f.ffbc3","influxdb":"3dcd3c8e.fe9b24","org":"my-org","bucket":"test","measurement":"test","precision":"ms","name":"","x":650,"y":180,"wires":[]},{"id":"3dcd3c8e.fe9b24","type":"influxdb2","z":"","url":"https://localhost:9999","token":"M7r8bFX-PqZVyehdeKKRqnGiGq8HIKkSSgcKJulra63_FrJydTtm_KmzTm_KzZLuME69xBCTW-MFbOBl2JpGtg==","name":""}]

The function node consists of the following code:

    msg.payload = [{
        numValue: 12,
        randomValue: Math.random() * 10,
        strValue: "message2",
        //time: new Date("2020-07-09T16:00:00Z")
    },
    {
        tag1: "sensor1",
        tag2: "device2"
    }];
    return msg;

Finally, if ***msg.payload*** is an array of arrays, it will be written as a series of points containing fields and tags.

For example, the following flow injects two points with timestamps specified.  

    [{"id":"cab64da3.ec089","type":"inject","z":"c70ec85f.ffbc3","name":"","repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","payload":"","payloadType":"date","x":140,"y":240,"wires":[["45dc1b5a.7ab1d4"]]},{"id":"45dc1b5a.7ab1d4","type":"function","z":"c70ec85f.ffbc3","name":"multiple readings","func":"msg.payload = [\n  [{\n    numValue: 10,\n    randomValue: Math.random() * 10,\n    strValue: \"message1\",\n    time: new Date(\"2020-07-16T13:00:02Z\")\n  },\n  {\n    tag1: \"sensor1\",\n    tag2: \"device2\"\n  }],\n  [{\n    numValue: 20,\n    randomValue: Math.random() * 10,\n    strValue: \"message2\",\n    time: new Date(\"2020-07-16T13:00:03Z\")\n  },\n  {\n    tag1: \"sensor2\",\n    tag2: \"device1\"\n  }]\n];\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","x":350,"y":240,"wires":[["3c9f8227.c549de"]]},{"id":"3c9f8227.c549de","type":"influxdb 2 out","z":"c70ec85f.ffbc3","influxdb":"3dcd3c8e.fe9b24","org":"my-org","bucket":"test","measurement":"test","precision":"ms","name":"","x":650,"y":240,"wires":[]},{"id":"3dcd3c8e.fe9b24","type":"influxdb2","z":"","url":"https://localhost:9999","token":"M7r8bFX-PqZVyehdeKKRqnGiGq8HIKkSSgcKJulra63_FrJydTtm_KmzTm_KzZLuME69xBCTW-MFbOBl2JpGtg==","name":""}]

The function node in the above flow looks as follows:

    msg.payload = [
        [{
            numValue: 10,
            randomValue: Math.random() * 10,
            strValue: "message1",
            time: new Date("2020-07-16T13:00:02Z")
        },
        {
            tag1: "sensor1",
            tag2: "device2"
        }],
        [{
            numValue: 20,
            randomValue: Math.random() * 10,
            strValue: "message2",
            time: new Date("2020-07-16T13:00:03Z")
        },
        {
            tag1: "sensor2",
            tag2: "device1"
        }]
        ];
    return msg;

Note how timestamps are specified - the number of milliseconds since 1 January 1970 00:00:00 UTC. In this case do not forget to set "ms" in "Time Precision" of the influx out node.

### Catching Failed Reads and Writes

Errors in reads and writes can be caught using the node-red `catch` node as usual. Standard error information is availlable in the default `msg.error` field; additional information about the underlying error is in the `msg.influx_error` field. Currently, this includes the HTTP status code returned from the influxdb server.
