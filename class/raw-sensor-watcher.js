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
            
            /**
             * Watch GPS position
             * data: https://developer.mozilla.org/en-US/docs/Web/API/Position
             * 
             * @see https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition
             * @return {SensorListener}
             */
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

            /**
             * Gets camera and audio and records
             * data: image dataURL
             * 
             * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
             * @return {SensorListener}
             */
            getUserMedia: {
                start: (options)=>{
                    let eventListener = options.events.data;
                    return navigator.mediaDevices.getUserMedia({audio: true, video: true})
                    .then((stream)=>{
                        /*
                        //MediaRecorder API. Preferred but ondataavailable seems unreliable.
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

            /**
             * Device orientation(3d coordinates)
             * @see https://developer.mozilla.org/en-US/docs/Web/Events/deviceorientation
             * @return {SensorListener}
             */
            deviceOrientation: this._getWindowEventListenerObject('deviceorientation'),
            
            /**
             * Device light(lux)
             * @see https://developer.mozilla.org/en-US/docs/Web/API/DeviceLightEvent
             * @return {SensorListener}
             */
            deviceLight: this._getWindowEventListenerObject('devicelight'),
            
            /**
             * Device proximity(cm)
             * @see https://developer.mozilla.org/en-US/docs/Web/Events/deviceproximity
             * @return {SensorListener}
             */
            deviceProximity: this._getWindowEventListenerObject('deviceproximity'),
            
            /**
             * Device motion(acceleration + rotation. Can use for measuring path taken.)
             * @see https://developer.mozilla.org/en-US/docs/Web/Events/devicemotion
             * @return {SensorListener}
             */
            deviceMotion: this._getWindowEventListenerObject('devicemotion'),
            
            /**
             * Test use only.
             * For testing when sensors might not be available.
             * Not implemented in watchAll.
             * @return {SensorListener}
             */
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
     * Common SensorListener for window events such as devicemotion.
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