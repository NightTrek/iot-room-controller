
const ConnectToDB = (dbName = "sqlite.db") => {
    return new Promise((resolve, reject) => {
        let db;
        try {
            db = require('better-sqlite3')(dbName, {
                verbose: console.log,
                fileMustExist: true
            })
            if(db){
                resolve(db)
            }
        } catch (err) {
            db = require('better-sqlite3')(dbName, {
                verbose: console.log
            });
            s.createDataHistory(db).run();
            s.createMinMax(db).run();
            s.createAlarms(db).run();
            if(db){
                resolve(db)
            }

        }



    });
}

const insertData = (db, data) => {
    let insert = db.prepare('INSERT INTO dataHistory(temp, rh, vpd, co2, unixTime) VALUES (@temp, @rh, @vpd, @co2, @unixTime;')
    return insert.run(data);
}

const GetMinMax = (db) => {
    return db.prepare('SELECT * FROM MinMax ORDER BY unixTime LIMIT 4;'); 
}

const GetDataHistory = (db) => {
    return db.prepare("SELECT * FROM dataHistory ORDER BY unixTime ASC LIMIT 1000;")
}


module.exports = {
    ConnectToDB:ConnectToDB,
    createDataHistory: (db) => {
        return db.prepare(`CREATE TABLE dataHistory(
            temp INTEGER,
            rh INTEGER,
            vpd INTEGER,
            co2 INTEGER,
            unixTime INTEGER,
            primary key(unixTime)
        );`)
    },

    createMinMax: (db) => {
        return db.prepare(`CREATE TABLE MinMax(
            tempMin INTEGER,
            tempMax INTEGER,
            tempSP INTEGER,
            rhMin INTEGER,
            rhMax INTEGER,
            rhSP INTEGER,
            vpdMin INTEGER,
            vpdMax INTEGER,
            vpdSP INTEGER,
            co2Min INTEGER,
            co2Max INTEGER,
            co2SP INTEGER,
            unixTime INTEGER,
            primary key(unixTime)
        );`)
    },

    createAlarms: (db) => {
        return db.prepare(`CREATE TABLE Alarms(
            alarmType VARCHAR,
            item VARCHAR,
            val INTEGER,
            msg VARCHAR,
            unixTime INTEGER,
            primary key(unixTime)
        );`)
    },
    insertData:insertData,
    GetMinMax: GetMinMax,
    GetDataHistory: GetDataHistory


}