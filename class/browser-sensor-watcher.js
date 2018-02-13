/**
 * Collection of browser based sensor events.
 * Sensors should be continuous events.
 * Therefor each should be setup in similar way using an event listener.
 * Objects of events, arguments and implementations may differ.
 */
class BrowserSensorWatcher {

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
             * data:
             * 1. stream: returns stream once(FASTEST)
             * 2. image: returns each image frame({video, canvas, context, stream})
             * 3. details: returns {video, canvas, context, stream}
             * 
             * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
             * @return {SensorListener}
             */
            getUserMedia: {
                start: (options)=>{
                    return navigator.mediaDevices.getUserMedia({audio: true, video: true})
                    .then((stream)=>{
                        const mode = options.mode || 'stream';//String for existing handle OR function for custom.

                        const _streamToVideo = (stream)=>{
                            let url = window.URL.createObjectURL(stream);
                            let video = document.createElement('video');
                            video.autoplay = true;
                            video.src = url;

                            return video;
                        };

                        /**
                         * Returns stream as data once.
                         * For simple handling.
                         * @param {MediaStream} stream 
                         * @param {Object} options 
                         */
                        const streamGrabber = (stream, options)=>{
                            let eventListener = options.events.data;
                            eventListener(stream);
                        }

                        const detailsGrabber = (stream, options)=>{
                            let eventListener = options.events.data;
                            
                            let video = _streamToVideo(stream);
                            
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            const ctx = canvas.getContext('2d');
                            
                            const state = {
                                canvas: canvas,
                                context: ctx,
                                video: video,
                                stream: stream
                            };

                            eventListener(state);
                        }

                        /**
                         * Returns each frame
                         * @param {MediaStream} stream
                         * @param {Object} options
                         */
                        const createImageGrabber = (stream, options)=>{
                            let eventListener = options.events.data;
                            
                            let video = _streamToVideo(stream);

                            //Initialization
                            const canvas = document.createElement('canvas');
                            const state = {
                                canvas: canvas,
                                context: ctx,
                                video: video,
                                stream: stream
                            };

                            const onFrame = ()=>{
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(video, 0, 0);

                                eventListener(state);
                            };
                            video.addEventListener('frame', onFrame);

                            return {
                                stop: ()=>{video.removeEventListener('frame', onFrame);},
                                state: state
                            };
                        };

                        const handleMap = {
                            stream: streamGrabber,
                            details: detailsGrabber,
                            image: createImageGrabber
                        };

                        const handle = typeof mode === 'function' ? mode : handleMap[mode];
                        const commonObject = {
                            handler: handle()
                        };
                        
                        return Promise.resolve([stream, commonObject]);
                    });
                },
                stop: (stream, commonObject)=>{
                    
                    //Stop object
                    if(commonObject.handler && commonObject.handler.stop){
                        commonObject.handler.stop();
                    }
                    
                    //Stop stream
                    let tracks = stream.getTracks();
                    tracks.forEach((track)=>{track.stop();});
                    return Promise.resolve();
                }
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

module.exports = BrowserSensorWatcher;