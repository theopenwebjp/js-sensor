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