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