const { describe, it } = require('mocha');
const { expect } = require('chai');
const Nest = require('../src/index');

describe('Nest Camera Tests', () => {
    let env;

    afterEach(() => {
        process.env = env;
    });

    it('Constructs a new Nest() Object', (done) => {
       const nest = new Nest();
       expect(nest._latestSnapshotObservable).to.be.a('object').that.does.not.equal(null);
       expect(nest._eventsObservable).to.be.a('object').that.does.not.equal(null);
       done();
    });

    it('Throws an Error when NEST_ID env param is not present', (done) => {
           const nest = new Nest();
           nest.init().catch(err => {
               expect(err.message).to.be.a('string').that.equals('The environmental variable: NEST_ID is not defined.');
               done();
           });
    });

    it('Throws an Error when REFRESH_TOKEN env param is not present', (done) => {
        env = process.env;
        process.env = { NEST_ID: 'foo' };
        const nest = new Nest();
        nest.init().catch(err => {
            expect(err.message).to.be.a('string').that.equals('The environmental variable: REFRESH_TOKEN is not defined.');
            done();
        });
    });
});