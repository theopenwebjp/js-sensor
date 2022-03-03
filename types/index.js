/**
 * @typedef {Object} SensorState
 * @property {boolean} isSensorState
 * @property {string} name
 * @property {() => void} stop
 * @property {(any[])|void} startReturnData
 * @property {WatchOptions} options
 * @property {{ data?: any }} events
 */

/**
 * @typedef {Object<string, function>} SensorEvents
 */

/**
 * @typedef {Object} WatchOptions
 * @property {string} mode
 * @property {SensorEvents} events
 */

/**
 * Other keys mapped to sensor state.
 * @typedef {Object<string, *>} SensorStateSettings
 * @property {WatchOptions} options
 */

/**
 * @typedef {void|any} SensorListenerBaseType
 * @typedef {SensorListenerBaseType|(Promise<SensorListenerBaseType>)} SensorListenerBaseReturnType
 */

/**
 * @typedef {Object} SensorListener
 * @property {(options?: WatchOptions) => SensorListenerBaseReturnType} start
 * @property {(...args: any[]) => SensorListenerBaseReturnType} stop
 * @property {() => boolean} check
 */

module.exports = {}
