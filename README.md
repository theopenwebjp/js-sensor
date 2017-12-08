 # JS Sensor
 Sensor watcher of JavaScript sensor events.
 This module is designed to have only basic functionality.
 Any more complex functionality should be achieved through extending this module.

 ## Installation
 1. Install node(including npm)
 2. "npm install" in base directory

 ## Usage
 
 ```
 const jsSensor = new require('js-sensor');
 
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
 * Esdoc