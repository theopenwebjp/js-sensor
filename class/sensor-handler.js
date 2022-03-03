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
