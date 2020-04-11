const { describe, it } = require('mocha');
const { expect } = require('chai');
const config = require('../src/constants');


describe('Configuration Tests', () => {
  it('Correctly creates URL for getEventsEndpoint', (done) => {
    expect(config.endpoints.getEventsEndpoint('foo')).to.be.a('string').that.equals('/cuepoint/foo/2');
    done();
  });

  it('Correctly creates URL for getSnapshotEndpoint', (done) => {
    expect(config.endpoints.getSnapshotEndpoint('foo')).to.be.a('string').that.equals('/event_snapshot/foo/?crop_type=timeline&width=700');
    done();
  });

  it('Correctly creates URL for getLatestImageEndpoint', (done) => {
    expect(config.endpoints.getLatestImageEndpoint('foo')).to.be.a('string').that.equals('/get_image?width=640&uuid=foo');
    done();
  });
});
