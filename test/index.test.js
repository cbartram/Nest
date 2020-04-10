const { describe, it } = require('mocha');
const { expect } = require('chai');
const Nest = require('../src/index');

describe('Nest Camera Tests', () => {
    it('Constructs a new Nest() Object', (done) => {
       const nest = new Nest({
           nestId: 'fake',
           refreshToken: 'fake',
           clientId: 'fake',
           apiKey: 'fake'
       });
       expect(nest._latestSnapshotObservable).to.be.a('object').that.does.not.equal(null);
       expect(nest._eventsObservable).to.be.a('object').that.does.not.equal(null);
       done();
    });

    it('Throws an Error when options param is not present or null', (done) => {
        try {
            new Nest(null);
        } catch(err) {
            expect(err.message).to.be.a('string').that.equals('The options argument cannot be null. It must include properties: nestId, refreshToken, apiKey, clientId');
            done();
        }
    });

    it('Throws an error when nestId is not defined', (done) => {
        try {
            new Nest();
        } catch(err) {
            expect(err.message).to.be.a('string').that.equals('The property: nestId is not defined.');
            done();
        }
    });

    it('Throws an error when refreshToken is not defined', (done) => {
        try {
            new Nest({
                nestId: 'foo'
            });
        } catch(err) {
            expect(err.message).to.be.a('string').that.equals('The property: refreshToken is not defined.');
            done();
        }
    });

    it('Throws an error when api key is not defined', (done) => {
        try {
            new Nest({
                nestId: 'foo',
                refreshToken: 'foo'
            });
        } catch(err) {
            expect(err.message).to.be.a('string').that.equals('The property: apiKey is not defined.');
            done();
        }
    });

    it('Throws an error when clientId is not defined', (done) => {
        try {
            new Nest({
                nestId: 'foo',
                refreshToken: 'foo',
                apiKey: 'foo'
            });
        } catch(err) {
            expect(err.message).to.be.a('string').that.equals('The property: clientId is not defined.');
            done();
        }
    });

    it('Properly creates Nest Object when all properties are set', (done) => {
        const nest = new Nest({
            nestId: 'foo',
            refreshToken: 'foo',
            apiKey: 'foo',
            clientId: 'foo'
        });
        expect(nest._id).to.be.a('string').that.equals('foo');
        done();
    });

    it('Throws an error when unsubscribe type is null or undefined', (done) => {
        const nest = new Nest({
            nestId: 'foo',
            refreshToken: 'foo',
            apiKey: 'foo',
            clientId: 'foo'
        });

        try {
            nest.unsubscribe();
        } catch(err) {
            expect(err.message).to.be.a('string').that.equals('You must specify the type of string to unsubscribe from. Either "event", or "snapshot".');
            done();
        }
    });

    it('Throws an error when unsubscribe type is undefined', (done) => {
        const nest = new Nest({
            nestId: 'foo',
            refreshToken: 'foo',
            apiKey: 'foo',
            clientId: 'foo'
        });

        const options = {};
        try {
            nest.unsubscribe(options.foo); // undefined
        } catch(err) {
            expect(err.message).to.be.a('string').that.equals('You must specify the type of string to unsubscribe from. Either "event", or "snapshot".');
            done();
        }
    });

    it('Throws an error when unsubscribe type is not "event" or "subscription"', (done) => {
        const nest = new Nest({
            nestId: 'foo',
            refreshToken: 'foo',
            apiKey: 'foo',
            clientId: 'foo'
        });

        try {
            nest.unsubscribe('foo');
        } catch(err) {
            expect(err.message).to.be.a('string').that.equals('You must specify a type of event to unsubscribe from either: "event" or "snapshot"');
            done();
        }
    });

    it('Creates a subscription and Unsubscribes from observable for type: event', async () => {
        const nest = new Nest({
            nestId: 'foo',
            refreshToken: 'foo',
            apiKey: 'foo',
            clientId: 'foo'
        });

        nest.subscribe('event', (event) => {
            expect(nest._subscribedEventsObservable).to.be.a('object');
            nest.unsubscribe('event');
        });
    });


    it('Creates a subscription and Unsubscribes from observable for type: snapshot', async () => {
        const nest = new Nest({
            nestId: 'foo',
            refreshToken: 'foo',
            apiKey: 'foo',
            clientId: 'foo'
        });

        nest.subscribe('snapshot', (event) => {
            expect(nest._subscribedSnapshotObservable).to.be.a('object');
            nest.unsubscribe('snapshot');
        });
    });

    it('Throws an error if #getEvents() is called before init() method', (done) => {
        const nest = new Nest({
            nestId: 'foo',
            refreshToken: 'foo',
            apiKey: 'foo',
            clientId: 'foo'
        });

        try {
            nest.getEvents();
        } catch (err) {
            expect(err.message).to.be.a('string').that.equals('Access token is null or undefined call: #fetchAccessToken() to retrieve new OAuth token.');
            done();
        }
    });

    it('Throws an error if #saveSnapshots() is called before init() method', (done) => {
        const nest = new Nest({
            nestId: 'foo',
            refreshToken: 'foo',
            apiKey: 'foo',
            clientId: 'foo'
        });

        try {
            nest.saveSnapshot(null, null);
        } catch (err) {
            expect(err.message).to.be.a('string').that.equals('JWT token is null or undefined. Call #fetchJwtToken() to retrieve new json web token.');
            done();
        }
    });
});