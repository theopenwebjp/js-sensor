(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * @typedef {import('../types/index').SensorListener} SensorListener
 * @typedef {import('../types/index').WatchOptions} WatchOptions
 */

/**
 * Collection of browser based sensor events.
 * Sensors should be continuous events.
 * Therefor each should be setup in similar way using an event listener.
 * Objects of events, arguments and implementations may differ.
 */
class BrowserSensorWatcher {

  constructor() {
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
        /**
         * @param {WatchOptions} options
         */
        start: (options) => {
          let eventListener = options.events.data;
          return new Promise((resolve, reject) => {
            let id = navigator.geolocation.watchPosition(
              eventListener,
              (err) => {
                return reject(console.error('Failed watchPosition', err));
              }
            );
            resolve([id]);
          });
        },
        /**
         * @param {number} id
         */
        stop: (id) => { navigator.geolocation.clearWatch(id); return Promise.resolve(); }
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
        /**
         * @param {WatchOptions} options
         */
        start: (options) => {
          return navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            .then((stream) => {
              const mode = options.mode || 'stream';//String for existing handle OR function for custom.

              /**
               * @param {MediaStream} stream 
               */
              const _streamToVideo = (stream) => {
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
              const streamGrabber = (stream, options) => {
                let eventListener = options.events.data;
                eventListener(stream);
              }

              /**
               * @param {MediaStream} stream 
               * @param {Object} options 
               */
              const detailsGrabber = (stream, options) => {
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
              const createImageGrabber = (stream, options) => {
                let eventListener = options.events.data;

                let video = _streamToVideo(stream);

                //Initialization
                const canvas = document.createElement('canvas');
                const ctx = /** @type {CanvasRenderingContext2D} */ (notFalsy(canvas.getContext('2d')));
                const state = {
                  canvas: canvas,
                  context: ctx,
                  video: video,
                  stream: stream
                };

                const onFrame = () => {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  ctx.drawImage(video, 0, 0);

                  eventListener(state);
                };
                video.addEventListener('frame', onFrame);

                return {
                  stop: () => { video.removeEventListener('frame', onFrame); },
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
        /**
         * @param {MediaStream} stream
         * @param {{ handler: { stop?: () => void } }} commonObject
         */
        stop: (stream, commonObject) => {

          // Stop object
          if (commonObject.handler && commonObject.handler.stop) {
            commonObject.handler.stop();
          }

          // Stop stream
          let tracks = stream.getTracks();
          tracks.forEach((track) => { track.stop(); });
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
   * @return {SensorListener}
   */
  SensorListener() {
    return {
      start: () => { },
      stop: () => { },
      check: () => { return true; }
    };
  }

  /**
   * Common SensorListener for window events such as devicemotion.
   * 
   * @param {String} eventName 
   * @return {SensorListener}
   */
  _getWindowEventListenerObject(eventName) {
    return {
      /**
       * @param {WatchOptions} options 
       */
      start: function (options) {
        let eventListener = options.events.data;
        return new Promise((resolve, reject) => {
          window.addEventListener(eventName, eventListener);
          resolve([eventName, eventListener]);
        });
      },
      /**
       * @param {string} eventName 
       * @param {function} eventListener 
       */
      stop: function (eventName, eventListener) {
        return new Promise((resolve, reject) => {
          window.removeEventListener(eventName, eventListener);
          resolve();
        });
      },
      check: () => { return true; }
    };
  }

  /**
   * Gets test SensorListener that can be used without access to sensors.
   * Used for testing on displaying when sensors not available.
   * 
   * @return {SensorListener}
   */
  _getTestEventListenerObject() {
    return {
      /**
       * @param {WatchOptions} options
       */
      start: function (options) {
        let eventListener = options.events.data;
        return new Promise((resolve, reject) => {
          let id = window.setInterval(() => {
            eventListener('test data');
          }, 500);

          resolve([id]);
        });
      },
      /**
       * @param {number} id clearTimeout id
       */
      stop: function (id) {
        return new Promise((resolve, reject) => {
          window.clearTimeout(id);
          resolve();
        });
      },
      check: function () {
        return true;
      }
    }
  }
}

module.exports = BrowserSensorWatcher;

/**
 * @param {*} value TODO: Pass type through 
 */
function notFalsy(value) {
  if (!value) {
    throw new Error(`Expected ${value} to not be falsy`)
  }
  return value
}

},{}],2:[function(require,module,exports){
const SensorHandler = require('./sensor-handler');

/**
 * Wrapper for main class
 * Add additional methods here not to do with sensors if required.
 */
class JsSensor extends SensorHandler {
  constructor() {
    super();
  }
}

if(typeof window !== 'undefined'){
    window.JsSensor = JsSensor;
}
if(typeof module !== 'undefined'){
    module.exports = JsSensor;
}

},{"./sensor-handler":3}],3:[function(require,module,exports){
const BrowserSensorWatcher = require('./browser-sensor-watcher');

/**
 * @type {BrowserSensorWatcher}
 */
let rawSensorWatcher;

/**
 * @typedef {import('../types/index').SensorState} SensorState
 * @typedef {import('../types/index').SensorEvents} SensorEvents
 * @typedef {import('../types/index').WatchOptions} WatchOptions
 * @typedef {import('../types/index').SensorStateSettings} SensorStateSettings
 */

/**
 * Main class for handling sensors.
 * This class allows get, watch, etc. of sensors.
 */
class SensorHandler {

  constructor(env = 'browser') {

    // Override with updateSensorListeners
    if (env === 'browser') {
      rawSensorWatcher = this.rawSensorWatcher = new BrowserSensorWatcher();
    }

    /**
     * SensorState mapped by sensor name
     * @type {Object<string, SensorState>}
     */
    this.sensors = {
      //
    };

    /**
     * Sensor counts stored accross start and stop watching to make sure async starting and stopping doesn't cause bugs.
     * @type {Object<string, number>}
     */
    this.sensorCreationCounts = {
      // 
    };
  }

  /**
   * Get sensor once. Should stop watching sensor if newly made.
   * 
   * @param {string} sensorName
   * @return {Promise<SensorState>}
   */
  get(sensorName) {
    let self = this;
    return new Promise((resolve) => {
      let sensorCreationCount = self._getSensorCreationCount() + 1;
      /**
       * @param {SensorState} sensorState 
       */
      let handle = (sensorState) => {
        //resolve(sensorState);

        //Only stop if no new watches happened.
        if (!(self._getSensorCreationCount() > sensorCreationCount)) {
          self.stop(sensorName)
            .then(() => {
              resolve(sensorState);
            });
        } else {
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
   * @param {Partial<WatchOptions>} options optional options
   * @return {Promise<SensorState>} Returns: promise resolving SensorState
   */
  watch(sensorName, options = {}) {
    const self = this;

    // data required(use console log if nothing)
    if (!options.events) { options.events = {}; }
    if (!options.events.data) { options.events.data = this._getDefaultDataEvent(sensorName); }

    return new Promise((resolve, reject) => {

      /**
       * @param {SensorState} sensorState 
       */
      const onResolve = (sensorState) => {
        self._incSensorCreationCount(sensorName);
        resolve(sensorState);
      };

      if (self.sensors[sensorName]) {
        return onResolve(self.sensors[sensorName]);
      }

      if (rawSensorWatcher.sensorHandles[sensorName]) {
        rawSensorWatcher.sensorHandles[sensorName].start(options)
          .then(function (startReturnData) {
            let sensorState = self._setSensorState(sensorName, {
              options: options,
              startReturnData: startReturnData,
              stop: rawSensorWatcher.sensorHandles[sensorName].stop // Set to state because may implement multiple watching later.
            });
            return onResolve(sensorState);
          })
          .catch(reject);
      } else {
        return reject(new Error('No raw sensor: ' + sensorName));
      }
    });
  }

  /**
   * Watches all available sensors.
   * 
   * @return {Promise<SensorState[]>} Resolves array of SensorStates. However allows for failing returning null.
   */
  watchAll() {
    let possibleSensors = rawSensorWatcher.sensorHandles;
    let promises = [];
    for (let key in possibleSensors) {
      if (key === 'test') { continue; }
      let p = new Promise((resolve) => {
        this.watch(key)
          .then(resolve)
          .catch(() => {
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
   * @return {Promise<SensorState>}
   */
  stop(sensorName) {
    let self = this;
    return new Promise((resolve, reject) => {
      let sensor = self.sensors[sensorName];
      if (!sensor) {
        reject(new Error('No sensor: ' + sensorName));
      }

      if (sensor.stop) {
        sensor.stop(...sensor.startReturnData)
          .then(() => {
            delete self.sensors[sensorName];
            console.log('sensor stop success: ' + sensorName);

            resolve(sensor);
          })
          .catch(reject);
      } else {
        reject(new Error('No sensor stop handle: ' + sensorName));
      }
    });
  }

  /**
   * Stops watching all.
   */
  stopAll() {
    /**
     * @type {Promise<SensorState>[]}
     */
    const promises = [];
    for (let key in this.sensors) {
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
  addSensorEvent(sensorName, eventName, handle) {

    //Require started
    let sensor = this.sensors[sensorName];
    if (!sensor) {
      return false;
    }

    let events = sensor.events;
    if (!events[eventName]) {
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
  removeSensorEvent(sensorName, eventName, handle) {

    //No sensor or event
    let sensor = this.sensors[sensorName];
    if (!sensor || !sensor.events[eventName]) {
      return false;
    }

    let event = sensor.events[eventName];
    let index = event.indexOf(handle);

    if (index >= 0) {
      event.splice(index, 1);

      return true;
    } else {
      return false;
    }
  }

  /**
   * Update registered sensor listeners.
   * Pass handle with one argument.
   * MUST return.
   * Dynamic updating during watching may result in bugs.
   * 
   * @param {Function} callback handle taking object map of registered SensorListeners 
   */
  updateSensorListeners(callback) {
    this.rawSensorWatcher = callback(this.rawSensorWatcher);
  }

  /**
   * Gets usable sensor names
   * 
   * Returns: sensor names
   */
  getMappedSensorNames() {
    return Object.keys(this.rawSensorWatcher.sensorHandles);
  }

  /**
   * Current state of sensor
   * @return {SensorState}
   */
  _SensorState() {
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
   * @param {SensorStateSettings} settings 
   */
  _setSensorState(sensorName, settings = {}) {
    console.log('_setSensorState: ', sensorName, settings);

    /**
     * @type {SensorState|undefined}
     */
    let sensorState;
    if (this.sensors[sensorName]) {
      sensorState = this.sensors[sensorName];
    } else {
      sensorState = this._SensorState();
      sensorState.name = sensorName;

      this.sensors[sensorName] = sensorState;

      for (let key in settings) {
        sensorState[key] = settings[key];
      }

      //Events
      let options = settings.options;
      if (options.events) {
        for (let key in options.events) {
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
   * @param {string} sensorName 
   * @return {number} sensor creation count
   */
  _getSensorCreationCount(sensorName = '') {
    return (!!this.sensorCreationCounts[sensorName]) ? this.sensorCreationCounts[sensorName] : 0;
  }

  /**
   * Increment sensor creation count
   * 
   * @param {string} sensorName 
   * @return {number} sensor creation count
   */
  _incSensorCreationCount(sensorName) {
    if (!Number.isInteger(this.sensorCreationCounts[sensorName])) {
      this.sensorCreationCounts[sensorName] = 0;
    }

    return ++this.sensorCreationCounts[sensorName];
  }

  /**
   * Data event used when no event to handle sensor data is provided.
   * Stringifies data and logs.
   * 
   * @param {string} sensorName
   */
  _getDefaultDataEvent(sensorName) {
    /**
     * @param {any} data
     */
    return (data) => {
      if (data && typeof data === 'object') {
        // let oldData = data;
        /**
         * @type {any[]}
         */
        let cache = [];
        data = JSON.stringify(data, function (key, val) {
          if (val && typeof val === 'object') {

            //Ignore duplicates
            if (cache.indexOf(val) >= 0) {
              return;
            }

            cache.push(val);
          }

          return val;
        });
        cache = []; // deref
      }
      console.log('sensor: ' + sensorName, String(new Date()), data);
    }
  }
}

module.exports = SensorHandler;

},{"./browser-sensor-watcher":1}]},{},[2,1,3]);
