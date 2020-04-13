const { describe, it, beforeEach } = require('mocha');
const { expect } = require('chai');
const nock = require('nock');
const Nest = require('../src/index');

describe('Nest Camera Tests', () => {
  it('Constructs a new Nest() Object', (done) => {
    const nest = new Nest({
      nestId: 'fake',
      refreshToken: 'fake',
      clientId: 'fake',
      apiKey: 'fake',
    });
    expect(nest._latestSnapshotObservable).to.be.a('object').that.does.not.equal(null);
    expect(nest._eventsObservable).to.be.a('object').that.does.not.equal(null);
    done();
  });

  it('Throws an Error when options param is not present or null', (done) => {
    try {
      new Nest(null);
    } catch (err) {
      expect(err.message).to.be.a('string').that.equals('The options argument cannot be null. It must include properties: nestId, refreshToken, apiKey, clientId');
      done();
    }
  });

  it('Throws an error when nestId is not defined', (done) => {
    try {
      new Nest();
    } catch (err) {
      expect(err.message).to.be.a('string').that.equals('The property: nestId is not defined.');
      done();
    }
  });

  it('Throws an error when refreshToken is not defined', (done) => {
    try {
      new Nest({
        nestId: 'foo',
        something: '',
        else: '',
        four: '',
      });
    } catch (err) {
      expect(err.message).to.be.a('string').that.equals('The property: refreshToken is not defined.');
      done();
    }
  });

  it('Throws an error when api key is not defined', (done) => {
    try {
      new Nest({
        nestId: 'foo',
        refreshToken: 'foo',
        something: '',
        else: '',
        four: '',
      });
    } catch (err) {
      expect(err.message).to.be.a('string').that.equals('The property: apiKey is not defined.');
      done();
    }
  });

  it('Throws an error when clientId is not defined', (done) => {
    try {
      new Nest({
        nestId: 'foo',
        refreshToken: 'foo',
        apiKey: 'foo',
        something: '',
        else: '',
        four: '',
      });
    } catch (err) {
      expect(err.message).to.be.a('string').that.equals('The property: clientId is not defined.');
      done();
    }
  });

  it('Properly creates Nest Object when all properties are set', (done) => {
    const nest = new Nest({
      nestId: 'foo',
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
    });
    expect(nest._id).to.be.a('string').that.equals('foo');
    done();
  });

  it('Throws an error when unsubscribe type is null or undefined', (done) => {
    const nest = new Nest({
      nestId: 'foo',
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
    });

    try {
      nest.unsubscribe();
    } catch (err) {
      expect(err.message).to.be.a('string').that.equals('You must specify the type of string to unsubscribe from. Either "event", or "snapshot".');
      done();
    }
  });

  it('Throws an error when unsubscribe type is undefined', (done) => {
    const nest = new Nest({
      nestId: 'foo',
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
    });

    const options = {};
    try {
      nest.unsubscribe(options.foo); // undefined
    } catch (err) {
      expect(err.message).to.be.a('string').that.equals('You must specify the type of string to unsubscribe from. Either "event", or "snapshot".');
      done();
    }
  });

  it('Throws an error when unsubscribe type is not "event" or "subscription"', (done) => {
    const nest = new Nest({
      nestId: 'foo',
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
    });

    try {
      nest.unsubscribe('foo');
    } catch (err) {
      expect(err.message).to.be.a('string').that.equals('You must specify a type of event to unsubscribe from either: "event" or "snapshot"');
      done();
    }
  });

  it('Creates a subscription and Unsubscribes from observable for type: event', async () => {
    const nest = new Nest({
      nestId: 'foo',
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
    });

    nest.subscribe('event', () => {
      expect(nest._subscribedEventsObservable).to.be.a('object');
      nest.unsubscribe('event');
    });
  });


  it('Creates a subscription and Unsubscribes from observable for type: snapshot', async () => {
    const nest = new Nest({
      nestId: 'foo',
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
    });

    nest.subscribe('snapshot', () => {
      expect(nest._subscribedSnapshotObservable).to.be.a('object');
      nest.unsubscribe('snapshot');
    });
  });

  it('Throws an error if #getEvents() is called before init() method', (done) => {
    const nest = new Nest({
      nestId: 'foo',
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
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
      clientId: 'foo',
    });

    try {
      nest.saveSnapshot(null, null);
    } catch (err) {
      expect(err.message).to.be.a('string').that.equals('JWT token is null or undefined. Call #fetchJwtToken() to retrieve new json web token.');
      done();
    }
  });

  it('Throws an error if object keys are less than 4 in the options', (done) => {
    try {
      new Nest({ one: '', two: '', three: '' });
    } catch (err) {
      expect(err.message).to.be.a('string').that.equals('You must have at least the following four properties: nestId, refreshToken, apiKey, clientId');
      done();
    }
  });
});

describe('Mocking Camera API Tests', () => {
  beforeEach(() => {
    nock('https://nestauthproxyservice-pa.googleapis.com')
      .post('/v1/issue_jwt')
      .reply(200, {
        jwt: 'g.0.eyJraWQiOiIyMzhiNTUxZmM',
        claims: {
          subject: {
            nestId: {
              namespaceId: {
                id: 'nest-phoenix-prod',
              },
              id: '102568',
            },
          },
          expirationTime: '2020-04-11T23:56:59.861Z',
          policyId: 'authproxy-oauth-policy',
          structureConstraint: {},
        },
      });
  });
});
