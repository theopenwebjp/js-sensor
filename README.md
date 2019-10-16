 # JS Sensor

 Sensor watcher of JavaScript sensor events.
 This module is designed to have only basic functionality.
 Any more complex functionality should be achieved through extending this module.

 ## Environment

 Should work and be extensible using any new JavaScript environment(node, browser).
 Default event listeners provided via browser-sensor-watcher.
 Possible to use own via extension.

 ## Installation

 1. Install node(including npm)
 2. "npm install" in base directory

 ## Usage

 The full api can be checked from the documentation. See "Documentation" below.

 Basic usage can be seen below:
 
 ```javascript
 const jsSensor = new require('js-sensor');

 //Get sensor list
 console.log('names:' jsSensor.getMappedSensorNames());

 //Update/extend
 jsSensor.updateSensorListeners((sensorListenerMap)=>{
     sensorListenerMap['myListener'] = {
         start: (options)=>{
             const data = '...HANDLE HERE';
             options.events.data(data);
         },
         stop: ()=>{
             //STOP
         },
         check: ()=>{
             //CHECK FOR AVAILABILITY
             return true;
         }
     };
     return sensorListenerMap;
 });

 //Get
 jsSensor.get('deviceMotion')
 .then((data)=>{
     console.log('get', data);
 });

 //Watch
 jsSensor.watch('deviceOrientation',
 {
     events: {
         data: (data)=>{
             console.log('watch', data);
         }
     }
 });

 //Stop
 jsSensor.stop('deviceOrientation);

 //WatchAll
 jsSensor.watchAll();
 //...wait a while
 //StopAll
 jsSensor.stopAll()
 ```

 ## Events

 * watchPosition
 * getUserMedia
 * deviceOrientation
 * deviceLight
 * deviceProximity
 * deviceMotion
 * test

 ## Tests

 Run `npm run test`

 ## Reports

 * Built when running tests.
 * Eslint

 ## Documentation
 
 * Esdoc(./docs/)