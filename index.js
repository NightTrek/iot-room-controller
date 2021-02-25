#!/usr/bin/env node
const express = require('express')


//user files
const mqtt = require('./MQTT.js');
const s = require('./sqlite');
const config = require('./config');




const app = express()
const port = 3000;

const LiveChannel = config.deviceID + "/data/Live";
const HistoryChannel = config.deviceID + "/data/History";
const MinMaxChannel = config.deviceID + "/alarms/MinMax";
const AlarmOutChannel = config.deviceID + "/alarms/alarm";

const GenerateAlarms = (input, currentMinMax) => {
    let alarms = [];

    const tempRange = 5;
    const rhRange = 5;
    const vpdRange = 250;
    const co2Range = 500;
    const now = Math.floor(Date.now() / 1000);

    for (let key in currentMinMax) {
        let item = currentMinMax[key];
        let type = key.split('');
        //if type is SP
        if (type[type.length - 1] === "P") {
            //for temp
            switch (type[0]) {
                case "t":
                    if (input.temp > item + tempRange) {
                        alarms.push({ type: "warning", unixTime: now, item: key, val: input.temp, msg: `Temperature warning current value of ${input.temp} is over ${tempRange} of its Set Point` })
                    }
                    if (input.temp < item - tempRange) {
                        alarms.push({ type: "warning", unixTime: now, item: key, val: input.temp, msg: `Temperature warning current value of ${input.temp} is under ${tempRange} of its Set Point` })
                    }
                    break;
                case "r":
                    if (input.rh > item + rhRange) {
                        alarms.push({ type: "warning", unixTime: now, item: key, val: input.rh, msg: `Humidity warning current value of ${input.rh} is over ${rhRange} of its Set Point` })
                    }
                    if (input.rh < item - rhRange) {
                        alarms.push({ type: "warning", unixTime: now, item: key, val: input.rh, msg: `Humidity warning current value of ${input.rh} is under ${rhRange} of its Set Point` })
                    }
                    break;
                case "v":
                    if (input.vpd > item + vpdRange) {
                        alarms.push({ type: "warning", unixTime: now, item: key, val: input.vpd, msg: `VPD warning current value of ${input.vpd} is over ${vpdRange} of its Set Point` })
                    }
                    if (input.vpd < item - vpdRange) {
                        alarms.push({ type: "warning", unixTime: now, item: key, val: input.vpd, msg: `VPD warning current value of ${input.vpd} is under ${vpdRange} of its Set Point` })
                    }
                    break;
                case "c":
                    if (input.co2 > item + co2Range) {
                        alarms.push({ type: "warning", unixTime: now, item: key, val: input.co2, msg: `CO2 level warning current value of ${input.co2} is over ${co2Range} of its Set Point` })
                    }
                    if (input.co2 < item - co2Range) {
                        alarms.push({ type: "warning", unixTime: now, item: key, val: input.co2, msg: `CO2 level warning current value of ${input.co2} is under ${co2Range} of its Set Point` })
                    }
                    break;
            }
            //end of setpoint handler
        }
        //if type is min
        if (type[type.length - 1] === "n") {
            switch (type[0]) {
                case "t":
                    if (input.temp <= item) {
                        alarms.push({ type: "alarm", unixTime: now, item: key, val: input.temp, msg: `Temperature ALARM current value of ${input.temp} is under ${item}` })
                    }
                    break;
                case "r":
                    if (input.rh <= item) {
                        alarms.push({ type: "alarm", unixTime: now, item: key, val: input.rh, msg: `Humidity warning current value of ${input.rh} is under ${item}` })
                    }
                    break;
                case "v":
                    if (input.vpd <= item) {
                        alarms.push({ type: "alarm", unixTime: now, item: key, val: input.vpd, msg: `VPD warning current value of ${input.vpd} is under ${item}` })
                    }
                    break;
                case "c":
                    if (input.co2 <= item) {
                        alarms.push({ type: "alarm", unixTime: now, item: key, val: input.co2, msg: `CO2 level warning current value of ${input.co2} is under ${item}` })
                    }
                    break;
            }
        }
        /// if type is max
        if (type[type.length - 1] === "x") {
            switch (type[0]) {
                case "t":
                    if (input.temp >= item) {
                        alarms.push({ type: "alarm", unixTime: now, item: key, val: input.temp, msg: `Temperature ALARM current value of ${input.temp} is over ${item}` })
                    }
                    break;
                case "r":
                    if (input.rh >= item) {
                        alarms.push({ type: "alarm", unixTime: now, item: key, val: input.rh, msg: `Humidity warning current value of ${input.rh} is over ${item}` })
                    }
                    break;
                case "v":
                    if (input.vpd >= item) {
                        alarms.push({ type: "alarm", unixTime: now, item: key, val: input.vpd, msg: `VPD warning current value of ${input.vpd} is over ${item}` })
                    }
                    break;
                case "c":
                    if (input.co2 >= item) {
                        alarms.push({ type: "alarm", unixTime: now, item: key, val: input.co2, msg: `CO2 level warning current value of ${input.co2} is over ${item}` })
                    }
                    break;
            }
        }
    }
    return alarms;
}

mqtt.createMqttClient().then(async (mqttClient) => {
    let db;
    try{
        
        db = await s.ConnectToDB();
    }catch(err){
        console.log(err)
    }
    
    const sendLiveData = () => {
        const fakeData = {
            temp: 70 + Math.floor(Math.random() * 6),
            rh: 40 + Math.floor(Math.random() * 5),
            vpd: 1000 + Math.floor(Math.random() * 500),
            co2: 1000 + Math.floor(Math.random() * 2000),
            unixTime: Math.floor(Date.now() / 1000)
        };
        //add fake data
        let insert = s.insertData(db)
        insert.run(fakeData);
        //publish data to mqtt
        mqttClient.publish(LiveChannel, JSON.stringify(fakeData), { retain: true }, (err) => {
            if (err) {
                console.log(err);
                //TODO better Error logging
            }
        });
        //get the MinMaxlist from the db
        s.GetMinMax(db).run((MinMaxList) => {
            if(!MinMaxList.length || MinMaxList.length<1){
                console.log(MinMaxList)
                console.log("error MinMax undefined");
            }
            let alarms = GenerateAlarms(fakeData, MinMaxList[0])
            if(alarms.length>0){
                mqttClient.publish(AlarmOutChannel, JSON.stringify(alarms), (err) => {
                    if (err){
                        console.log(err);
                        //TODO handle MQTT error logging.
                    }
                })
            }
        })
    }

    const updateHistory = () => {
        s.GetDataHistory(db).run((history) => {
            console.log(history)
            let payload = {
                data:[]
            };
            for (let i = 0; i< history.length;i++){
                if(i%5 ===0){
                    payload.data.push( history[i] );       
                }
            }
            mqttClient.publish(HistoryChannel, JSON.stringify(payload), (err) => {
                if(err){
                    console.log(err)
                    //TODO handle MQTT error logging
                }
            })

        })
    }
    //middleware
    app.use(express.json());


    //routes

    //api to test if server is up
    app.get('/ping', (req, res) => {
        res.set('Access-Control-Allow-Methods', '*');
        res.set('Access-Control-Allow-Headers', '*');
        res.send(`Device: ${config.deviceID} localTime: ${Math.floor(Date.now() / 1000)}\n `)
    })

     setInterval(sendLiveData, 10 * 1000);
     setInterval(sendLiveData, 10 * 60000);



    // Express app initialization.
    app.listen(port, () => {
        console.log(`Example app listening at \n local: http://localhost:${port} \n VPN: ${config.ip}:${port}`)
    })
    //mqtt message handler
    mqtt.clientMsgHandler(mqttClient, (msg) => {
        //parse the topic and upload to the correct firebase document
        let topicParts = msg.topic.split('/')
        //update firestore with the new data.


        console.log(msg);
    })

}).catch((err) => {
    console.log(err);
});

