(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const SensorHandler = require('./sensor-handler');

/**
 * Wrapper for main class
 * Add additional methods here not to do with sensors if required.
 */
class JsSensor extends SensorHandler{
    constructor(){
        super();
    }
}

if(typeof window !== 'undefined'){
    window.JsSensor = JsSensor;
}
if(typeof module !== 'undefined'){
    module.exports = JsSensor;
}
},{"./sensor-handler":3}],2:[function(require,module,exports){
/**
 * Sensors should be continuous events.
 * Therefor each should be setup in similar way using an event listener.
 * Objects of events, arguments and implementations may differ.
 */
class RawSensorWatcher {

    constructor(){
        /**
         * All sensor handles must return promise and take no arguments.
         * start: required. args: (optional options object) should resolve an array with arguments to be passed to stop.
         * stop: required. args: (returnedData from start)
         * check: optional.
         */
        this.sensorHandles = {
               watchPosition: {
                   start: (options)=>{
                       let eventListener = options.events.data;
                       return new Promise((resolve, reject)=>{
                           let id = navigator.geolocation.watchPosition(
                               eventListener,
                               (err)=>{
                                   return reject(console.error('Failed watchPosition', err));
                                }
                            );
                            resolve([id]);
                        });
                    },
                    stop: (id)=>{navigator.geolocation.clearWatch(id); return Promise.resolve();}
               },
               getUserMedia: {
                   start: (options)=>{
                       let eventListener = options.events.data;
                       return navigator.mediaDevices.getUserMedia({audio: true, video: true})
                       .then((stream)=>{
                           /*
                           //MediaRecorder API. Preferred but ondataavailablelet seems unreliable.
                           let recorder = new MediaRecorder(stream);
                           let onDataAvailable = function(ev){console.log("WORKED");
                            eventListener(ev.data);
                           };
                           //recorder.addEventListener('dataavailable', onDataAvailable);
                           recorder.ondataavailable = onDataAvailable;
                           recorder.start();
                           */

                           //Basic interval
                           let url = window.URL.createObjectURL(stream);
                           let video = document.createElement('video');
                           video.autoplay = true;
                           video.src = url;

                           let recorder = {};
                           recorder.interval = null;
                           recorder.ondataavailable = function(ev){
                               eventListener(ev.data);
                           };
                           recorder.start = function(){
                               recorder.interval = window.setInterval(recorder.handleData, 500);
                           };
                           recorder.handleData = function(){
                               let canvas = document.createElement('canvas');
                               canvas.width = video.videoWidth;
                               canvas.height = video.videoHeight;
                               let ctx = canvas.getContext('2d');
                               ctx.drawImage(video, 0, 0);

                               recorder.ondataavailable({
                                   data: canvas.toDataURL()
                               });
                           };
                           recorder.stop = function(){
                               window.URL.revokeObjectURL(url);
                               window.clearTimeout(recorder.interval);
                               recorder.interval = null;
                           };
                           recorder.start();

                           return Promise.resolve([stream, recorder]);
                       });
                    },
                   stop: (stream, recorder)=>{recorder.stop(); let tracks = stream.getTracks(); tracks.map((track)=>{track.stop();}); return Promise.resolve();}
               },
               deviceOrientation: this._getWindowEventListenerObject('deviceorientation'),
               deviceLight: this._getWindowEventListenerObject('devicelight'),
               deviceProximity: this._getWindowEventListenerObject('deviceproximity'),
               deviceMotion: this._getWindowEventListenerObject('devicemotion'),
               test: this._getTestEventListenerObject()//Useful for both automated testing and learning on personal computer.
        };
    }

    /**
     * Common object for handling sensors
     * start: Starts watching sensor
     * stop: Stops watching sensor
     * check: Checks for support
     */
    SensorListener(){
        return {
            start: ()=>{},
            stop: ()=>{},
            check: ()=>{return true;}
        };
    }

    /**
     * 
     * 
     * @param {String} eventName 
     * @return {SensorListener}
     */
    _getWindowEventListenerObject(eventName){
        return {
            start: function(options){
                let eventListener = options.events.data;
                return new Promise((resolve, reject)=>{
                    window.addEventListener(eventName, eventListener);
                    resolve([eventName, eventListener]);
                }); 
            },
            stop: function(eventName, eventListener){
                return new Promise((resolve, reject)=>{
                    window.removeEventListener(eventName, eventListener);
                    resolve();
                });
            },
            check: ()=>{return true;}
        };
    }

    /**
     * Gets test SensorListener that can be used without access to sensors.
     * Used for testing on displaying when sensors not available.
     * 
     * @return {SensorListener}
     */
    _getTestEventListenerObject(){
        return {
            start: function(options){
                let eventListener = options.events.data;
                return new Promise((resolve, reject)=>{
                    let id = window.setInterval(()=>{
                        eventListener('test data');
                    }, 500);

                    resolve([id]);
                });
            },
            stop: function(id){
                return new Promise((resolve, reject)=>{
                    window.clearTimeout(id);
                    resolve();
                });
            },
            check: function(){
                return true;
            }
        }
    }
}

module.exports = RawSensorWatcher;
},{}],3:[function(require,module,exports){
const RawSensorWatcher = require('./raw-sensor-watcher');
const rawSensorWatcher = new RawSensorWatcher();

/**
 * Main class for handling sensors.
 * This class allows get, watch, etc. of sensors.
 */
class SensorHandler {

    constructor(){

        this.rawSensorWatcher = rawSensorWatcher;
        
        //SensorState mapped by sensor name
        this.sensors = {
            //
        };

        //Sensor counts stored accross start and stop watching to make sure async starting and stopping doesn't cause bugs.
        this.sensorCreationCounts = {
           // 
        };
    }

    /**
     * Get sensor once. Should stop watching sensor if newly made.
     * 
     * @param {string} sensorName 
     */
    get(sensorName){
        let self = this;
        return new Promise((resolve, reject)=>{
            let sensorCreationCount = self._getSensorCreationCount() + 1;
            let handle = (sensorState)=>{
                //resolve(sensorState);

                //Only stop if no new watches happened.
                if(!(self._getSensorCreationCount() > sensorCreationCount)){
                    self.stop(sensorName)
                    .then(()=>{
                        resolve(sensorState);
                    });
                }else{
                    resolve(sensorState);
                }
            };
            self.watch(sensorName, {
                events: {
                    data: handle
                }
            });
        });
    }

    /**
     * Watch sensor from RawSensorWatcher. Ignores duplicates.
     * options: {
     *   events: {
     *     data: function(data){}
     *   }
     * }
     * 
     * @param {string} sensorName
     * @param {object} options optional options
     * @return {promise} promise resolving SensorState
     */
    watch(sensorName, options={}){
        const self = this;
        
        //data required(use console log if nothing)
        if(!options.events){options.events = {};}
        if(!options.events.data){options.events.data = this._getDefaultDataEvent(sensorName);}

        return new Promise((resolve, reject)=>{

            const onResolve = (sensorState)=>{
                self._incSensorCreationCount(sensorName);
                resolve(sensorState);
            };

            if(self.sensors[sensorName]){
                return onResolve(self.sensors[sensorName]);
            }

            if(rawSensorWatcher.sensorHandles[sensorName]){
                rawSensorWatcher.sensorHandles[sensorName].start(options)
                .then(function(startReturnData){
                    let sensorState = self._setSensorState(sensorName, {
                        options: options,
                        startReturnData: startReturnData,
                        stop: rawSensorWatcher.sensorHandles[sensorName].stop//Set to state because may implement multiple watching later.
                    });
                    return onResolve(sensorState);
                })
                .catch(reject);
            }else{
                return reject(new Error('No raw sensor: ' + sensorName));
            }
        });
    }

    /**
     * Watches all available sensors.
     * 
     * @return {promise} Resolves array of SensorStates. However allows for failing returning null.
     */
    watchAll(){
        let possibleSensors = rawSensorWatcher.sensorHandles;
        let promises = [];
        for(let key in possibleSensors){
            if(key === 'test'){continue;}
            let p = new Promise((resolve, reject)=>{
                this.watch(key)
                .then(resolve)
                .catch(()=>{
                    resolve(null);
                });
            });
            promises.push(p);
        }

        return Promise.all(promises);
    }

    /**
     * Stops watching sensor.
     * 
     * @param {string} sensorName
     * @return {promise}
     */
    stop(sensorName){
        let self = this;
        return new Promise((resolve, reject)=>{
            let sensor = self.sensors[sensorName];
            if(!sensor){
                reject(new Error('No sensor: ' + sensorName));
            }

            if(sensor.stop){
                sensor.stop(...sensor.startReturnData)
                .then(()=>{
                    delete self.sensors[sensorName];
                    console.log('sensor stop success: ' + sensorName);

                    resolve(sensor);
                })
                .catch(reject);
            }else{
                reject(new Error('No sensor stop handle: ' + sensorName));
            }
        });
    }

    /**
     * Stops watching all.
     * 
     * @return {promise}
     */
    stopAll(){
        let promises = [];
        for(let key in this.sensors){
            promises.push(this.stop(key));
        }

        return Promise.all(promises);
    }

    /**
     * Adds sensor event. Multiple at same time ok.
     * 
     * @param {string} sensorName 
     * @param {string} eventName 
     * @param {function} handle
     * @return {boolean} success/failure  
     */
    addSensorEvent(sensorName, eventName, handle){

        //Require started
        let sensor = this.sensors[sensorName];
        if(!sensor){
            return false;
        }
        
        let events = sensor.events;
        if(!events[eventName]){
            events[eventName] = [];
        }

        events[eventName].push(handle);

        return true;
    }

    /**
     * Removes sensor event. Only removes handle specified.
     * 
     * @param {string} sensorName 
     * @param {string} eventName 
     * @param {function} handle
     * @return {boolean} success/failure 
     */
    removeSensorEvent(sensorName, eventName, handle){

        //No sensor or event
        let sensor = this.sensors[sensorName];
        if(!sensor || !sensor.events[eventName]){
            return false;
        }

        let event = sensor.events[eventName];
        let index = event.indexOf(handle);

        if(index >= 0){
            event.splice(index, 1);

            return true;
        }else{
            return false;
        }
    }

    /**
     * Gets usable sensor names
     * 
     * @return {array} sensor names
     */
    getMappedSensorNames(){
        return Object.keys(this.rawSensorWatcher.sensorHandles);
    }

    /**
     * Current state of sensor
     * @return {SensorState}
     */
    _SensorState(){
        return {
            isSensorState: true,
            name: '',
            stop: null,//Copied over from RawSensorWatcher object for better management.
            startReturnData: null,
            options: {},
            events: {
                data: null
            }
        };
    }

    /**
     * Sets sensor state. Requires settings.events.
     * 
     * @param {string} sensorName 
     * @param {object} settings 
     */
    _setSensorState(sensorName, settings={}){
        console.log('_setSensorState: ', sensorName, settings);

        let sensorState;
        if(this.sensors[sensorName]){
            sensorState = this.sensors[sensorName];
        }else{
            sensorState = this._SensorState();
            sensorState.name = sensorName;

            this.sensors[sensorName] = sensorState;

            let key;
            for(key in settings){
                sensorState[key] = settings[key];
            }

            //Events
            let options = settings.options;
            if(options.events){
                for(key in options.events){
                    this.addSensorEvent(sensorName, key, options.events[key]);
                }
            }

            console.log('added sensor state: ', sensorState);
        }

        return sensorState;
    }

    /**
     * Gets number of times sensor created
     * 
     * @param {String} sensorName 
     * @return {Number} sensor creation count
     */
    _getSensorCreationCount(sensorName){
        return (!!this.sensorCreationCounts[sensorName]) ? this.sensorCreationCounts[sensorName] : 0;
    }

    /**
     * Increment sensor creation count
     * 
     * @param {String} sensorName 
     * @return {Number} sensor creation count
     */
    _incSensorCreationCount(sensorName){
        if(!Number.isInteger(this.sensorCreationCounts[sensorName])){
            this.sensorCreationCounts[sensorName] = 0;
        }

        return ++this.sensorCreationCounts[sensorName];
    }

    /**
     * Data event used when no event to handle sensor data is provided.
     * Stringifies data and logs.
     * 
     * @param {String} sensorName 
     * @return {Function}
     */
    _getDefaultDataEvent(sensorName){
        return (data)=>{
            if(data && typeof data === 'object'){
                let oldData = data;
                let cache = [];
                data = JSON.stringify(data, function(key, val){
                    if(val && typeof val === 'object'){

                        //Ignore duplicates
                        if(cache.indexOf(val) >= 0){
                            return;
                        }

                        cache.push(val);
                    }

                    return val;
                });
                cache = null;
            }
            console.log('sensor: ' + sensorName, String(new Date()), data);
        }
    }
}

module.exports = SensorHandler;
},{"./raw-sensor-watcher":2}],4:[function(require,module,exports){
const JsSensor = require('../class/js-sensor');

const jsSensor = new JsSensor();

describe('JsSensor', ()=>{
    it('construction', ()=>{
        chai.expect(jsSensor).to.be.an('object');
    });
});
},{"../class/js-sensor":1}],5:[function(require,module,exports){
const RawSensorWatcher = require('../class/raw-sensor-watcher');

const rawSensorWatcher = new RawSensorWatcher();

describe('RawSensorWatcher', ()=>{
    it('_getWindowEventListenerObject', ()=>{
        let object = rawSensorWatcher._getWindowEventListenerObject('devicemotion');

        chai.expect(object).to.be.an('object');
        chai.expect(object).to.have.property('start');
        chai.expect(object).to.have.property('stop');
        chai.expect(object).to.have.property('check');
    });
});
},{"../class/raw-sensor-watcher":2}],6:[function(require,module,exports){
const SensorHandler = require('../class/sensor-handler');

const sensorHandler = new SensorHandler();
console.log(sensorHandler);
/**
 * Tests require fully capable device + manual movement to complete.
 */
describe('SensorHandler', function(){
    beforeEach(()=>{
        return sensorHandler.stopAll();
    });
    this.timeout(5000);//Devices may take a while.
    
    it('getMappedSensorNames', ()=>{
        let names = sensorHandler.getMappedSensorNames();
        chai.expect(names).to.be.an('array');
    });

    it('get', ()=>{
        return sensorHandler.get('test')
        .then((data)=>{
            chai.expect(data).to.equal('test data');

            return Promise.resolve();
        });
    });

    it('watch', ()=>{
        return sensorHandler.watch('test')
        .then((sensorState)=>{
            chai.expect(sensorState).to.be.an('object');
            chai.expect(sensorState.isSensorState).to.equal(true);

            return Promise.resolve();
        });
    });

    it('watchAll', ()=>{
        return sensorHandler.watchAll()
        .then((promises)=>{
            chai.expect(promises).to.be.an('array');

            return Promise.resolve();
        });
    });

    it('stop', ()=>{
        return sensorHandler.watch('test')
        .then(()=>{return sensorHandler.stop('test');})
        .then(()=>{
            return Promise.resolve();
        });
    });

    it('stopAll', ()=>{
        return sensorHandler.stopAll()
        .then((promises)=>{
            chai.expect(promises).to.be.an('array');

            return Promise.resolve();
        });
    });

    it('addSensorEvent', ()=>{
        return sensorHandler.watch('test')
        .then(()=>{
            let handle = function(){};
            sensorHandler.addSensorEvent('test', 'data', handle);
            
            chai.expect(sensorHandler.sensors['test'].events['data'].indexOf(handle)).to.be.greaterThan(-1);
            
            return Promise.resolve();
        })
        .then(()=>{
            return sensorHandler.stop('test');
        });
    });

    it('removeSensorEvent', ()=>{
        return sensorHandler.watch('test')
        .then(()=>{
            let handle = function(){};
            sensorHandler.addSensorEvent('test', 'data', handle);

            chai.expect(sensorHandler.sensors['test'].events['data'].indexOf(handle)).to.be.greaterThan(-1);

            sensorHandler.removeSensorEvent('test', 'data', handle);

            chai.expect(sensorHandler.sensors['test'].events['data'].indexOf(handle)).to.equal(-1);
        })
        .then(()=>{
            return sensorHandler.stop('test');
        });
    });

    it('_SensorState', ()=>{
        chai.expect(sensorHandler._SensorState()).to.be.an('object');
    });
});
},{"../class/sensor-handler":3}]},{},[4,5,6]);
