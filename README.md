node-red-contrib-influxdb
=========================

A <a href="http://nodered.org" target="_new">Node-RED</a> node to write and query data from an influxdb time series database.  These nodes use the <a href="https://www.npmjs.com/package/influx" target="_new">influxDB client</a> for node.js, specifically calling the **writePoint()**, **writePoints()**, and **query()** methods.  Currently it can only communicate with one influxdb host.


Pre-requesites
--------------

To run this you'll need access to an influxdb database version 0.9.x, possibly later.  See the <a href="https://influxdb.com/" target="_new">influxdb site</a> for more information.  The last release of this node has been tested with InfluxDb 0.9.6.1.

Install
-------

Run the following command in the root directory of your Node-RED install.
Usually this is `~/.node-red` .

    npm install node-red-contrib-influxdb

Usage
-----

Nodes to write and query data from an influxdb time series database.

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

Note how timestamps are specified - the number of milliseconds since 1 January 1970 00:00:00 UTC.