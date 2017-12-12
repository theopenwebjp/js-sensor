const BrowserSensorWatcher = require('../class/browser-sensor-watcher');

const browserSensorWatcher = new BrowserSensorWatcher();

describe('BrowserSensorWatcher', ()=>{
    it('_getWindowEventListenerObject', ()=>{
        let object = browserSensorWatcher._getWindowEventListenerObject('devicemotion');

        chai.expect(object).to.be.an('object');
        chai.expect(object).to.have.property('start');
        chai.expect(object).to.have.property('stop');
        chai.expect(object).to.have.property('check');
    });
});