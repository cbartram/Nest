const { describe, it, beforeEach } = require('mocha');
const { expect } = require('chai');
const nock = require('nock');
const config = require('../src/constants');
const Nest = require('../src/index');
const Auth = require('../src/security/Auth');


describe('Authentication Tests', () => {
  beforeEach(() => {
    nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(200, {
        access_token: 'ya29.a0Ae4lvC2w1OP-k2mBo9ebdW-GGCLoA1EW6s8AUgh7wLH',
        expires_in: 3599,
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/nest-account openid https://www.googleapis.com/auth/userinfo.email',
        token_type: 'Bearer',
        id_token: 'eyJMiLCJlbWFpbX25hbWUiOiJCYXJ0cmFtIiwibG9jYWxlIjoiZWAA',
      });

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

  it('Successfully sets the accessToken and JWT Token when init() is called', (done) => {
    const nest = new Nest({
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
      nestId: 'foo',
    });

    nest.init().then(() => {
      expect(nest.accessToken).to.be.a('string').that.equals('ya29.a0Ae4lvC2w1OP-k2mBo9ebdW-GGCLoA1EW6s8AUgh7wLH');
      expect(nest.jwtToken).to.be.a('string').that.equals('g.0.eyJraWQiOiIyMzhiNTUxZmM');
      done();
    });
  });

  it('Successfully retrieves configuration object', (done) => {
    const nest = new Nest({
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
      nestId: 'foo',
    });

    expect(nest.config).to.be.a('object').that.deep.equals(config);
    done();
  });

  it('Successfully refreshes security tokens (OAuth & JWT)', (done) => {
    const auth = new Auth({
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
      nestId: 'foo',
    });

    auth.refreshTokens().then(() => {
      expect(auth.accessToken).to.be.a('string').that.equals('ya29.a0Ae4lvC2w1OP-k2mBo9ebdW-GGCLoA1EW6s8AUgh7wLH');
      expect(auth.jwtToken).to.be.a('string').that.equals('g.0.eyJraWQiOiIyMzhiNTUxZmM');
      done();
    });
  });

  it('Returns OAuth token if token is already set', (done) => {
    const auth = new Auth({
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
      nestId: 'foo',
    });

    auth.refreshTokens().then(() => {
      expect(auth.accessToken).to.be.a('string').that.equals('ya29.a0Ae4lvC2w1OP-k2mBo9ebdW-GGCLoA1EW6s8AUgh7wLH');
      expect(auth.jwtToken).to.be.a('string').that.equals('g.0.eyJraWQiOiIyMzhiNTUxZmM');
      auth.fetchOAuthToken().then(token => {
        expect(token).to.be.a('string').that.equals('ya29.a0Ae4lvC2w1OP-k2mBo9ebdW-GGCLoA1EW6s8AUgh7wLH');
        done();
      });
    });
  });

  it('Returns JWT token if token is already set', (done) => {
    const auth = new Auth({
      refreshToken: 'foo',
      apiKey: 'foo',
      clientId: 'foo',
      nestId: 'foo',
    });

    auth.refreshTokens().then(() => {
      expect(auth.accessToken).to.be.a('string').that.equals('ya29.a0Ae4lvC2w1OP-k2mBo9ebdW-GGCLoA1EW6s8AUgh7wLH');
      expect(auth.jwtToken).to.be.a('string').that.equals('g.0.eyJraWQiOiIyMzhiNTUxZmM');
      auth.fetchJwtToken().then(token => {
        expect(token).to.be.a('string').that.equals('g.0.eyJraWQiOiIyMzhiNTUxZmM');
        done();
      });
    });
  });
});
