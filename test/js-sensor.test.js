const JsSensor = require('../class/js-sensor');

const jsSensor = new JsSensor();

describe('JsSensor', ()=>{
    it('construction', ()=>{
        chai.expect(jsSensor).to.be.an('object');
    });
});