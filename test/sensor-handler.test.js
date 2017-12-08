const SensorHandler = require('../class/sensor-handler');

const sensorHandler = new SensorHandler();
console.log(sensorHandler);
/**
 * Tests require fully capable device + manual movement to complete.
 */
describe('SensorHandler', function(){
    beforeEach(()=>{
        return sensorHandler.stopAll();
    });
    this.timeout(5000);//Devices may take a while.
    
    it('getMappedSensorNames', ()=>{
        let names = sensorHandler.getMappedSensorNames();
        chai.expect(names).to.be.an('array');
    });

    it('get', ()=>{
        return sensorHandler.get('test')
        .then((data)=>{
            chai.expect(data).to.equal('test data');

            return Promise.resolve();
        });
    });

    it('watch', ()=>{
        return sensorHandler.watch('test')
        .then((sensorState)=>{
            chai.expect(sensorState).to.be.an('object');
            chai.expect(sensorState.isSensorState).to.equal(true);

            return Promise.resolve();
        });
    });

    it('watchAll', ()=>{
        return sensorHandler.watchAll()
        .then((promises)=>{
            chai.expect(promises).to.be.an('array');

            return Promise.resolve();
        });
    });

    it('stop', ()=>{
        return sensorHandler.watch('test')
        .then(()=>{return sensorHandler.stop('test');})
        .then(()=>{
            return Promise.resolve();
        });
    });

    it('stopAll', ()=>{
        return sensorHandler.stopAll()
        .then((promises)=>{
            chai.expect(promises).to.be.an('array');

            return Promise.resolve();
        });
    });

    it('addSensorEvent', ()=>{
        return sensorHandler.watch('test')
        .then(()=>{
            let handle = function(){};
            sensorHandler.addSensorEvent('test', 'data', handle);
            
            chai.expect(sensorHandler.sensors['test'].events['data'].indexOf(handle)).to.be.greaterThan(-1);
            
            return Promise.resolve();
        })
        .then(()=>{
            return sensorHandler.stop('test');
        });
    });

    it('removeSensorEvent', ()=>{
        return sensorHandler.watch('test')
        .then(()=>{
            let handle = function(){};
            sensorHandler.addSensorEvent('test', 'data', handle);

            chai.expect(sensorHandler.sensors['test'].events['data'].indexOf(handle)).to.be.greaterThan(-1);

            sensorHandler.removeSensorEvent('test', 'data', handle);

            chai.expect(sensorHandler.sensors['test'].events['data'].indexOf(handle)).to.equal(-1);
        })
        .then(()=>{
            return sensorHandler.stop('test');
        });
    });

    it('_SensorState', ()=>{
        chai.expect(sensorHandler._SensorState()).to.be.an('object');
    });
});