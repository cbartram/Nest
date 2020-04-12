const {
  DEBUG,
} = process.env;
const fs = require('fs');
// eslint-disable-next-line no-unused-vars
const path = require('path');
const { from, interval, Subject } = require('rxjs');
const request = require('request-promise-native');
const moment = require('moment');
const chalk = require('chalk');
const {
  switchMap,
  distinctUntilChanged,
  map,
  multicast,
  refCount,
} = require('rxjs/operators');
const Auth = require('./security/Auth');

/**
 * Class which exposes several features on the Nest Camera API
 */
class Nest extends Auth {
  /**
     * Constructs a new Nest class. This creates an observable which can be polled
     * at a specified interval to retrieve the latest image from the Nest camera.
     * subscribers.
     * @param options Object A set of options which are required and contain various configuration for the program
     * @param snapshotSubscriptionInterval Integer the amount of time between executions of the observable when a new
     * subscriber subscribes. Defaults to 5 seconds
     * @param eventSubscriptionInterval Integer The amount of time between executions of the event observable when
     * a new subscriber subscribes. Defaults to 3 seconds.
     */
  constructor(options = {
    nestId: null, refreshToken: null, apiKey: null, clientId: null,
  }, snapshotSubscriptionInterval = 5000, eventSubscriptionInterval = 3000) {
    if (options === null) throw new Error('The options argument cannot be null. It must include properties: nestId, refreshToken, apiKey, clientId');
    if (Object.keys(options) < 4) throw new Error('You must have at least the following four properties: nestId, refreshToken, apiKey, clientId');
    if (!options.nestId) throw new Error('The property: nestId is not defined.');
    if (!options.refreshToken) throw new Error('The property: refreshToken is not defined.');
    if (!options.apiKey) throw new Error('The property: apiKey is not defined.');
    if (!options.clientId) throw new Error('The property: clientId is not defined.');

    super(options);
    this._id = options.nestId;

    const latestSnapshotSubject = new Subject();
    const eventSubject = new Subject();
    this._latestSnapshotObservable = interval(options.snapshotSubscriptionInterval || 5000).pipe(
      switchMap(() => from(this.saveLatestSnapshot())),
      multicast(latestSnapshotSubject),
      refCount(),
    );
    this._eventsObservable = interval(options.eventSubscriptionInterval || 3000).pipe(
      switchMap(() => from(this.getEvents(moment().startOf('day').valueOf(), moment().valueOf()))),
      distinctUntilChanged((prevEvents, currEvents) => currEvents.length === prevEvents.length),
      map((events) => events[events.length - 1]),
      multicast(eventSubject),
      refCount(),
    );
  }

  /**
     * Checks for required fields and initializes the access and JWT tokens needed
     * to call the API
     * @returns {Promise<Nest>}
     */
  async init() {
    await this.refreshTokens();
    return this;
  }

  /**
     * Creates a multicasted subscription to the stream of camera events or camera snapshots for both
     * motion and sound
     * @param onEvent Function called when a new event is received
     * @param type String Either event or snapshot. This value determines what observable is subscribed to and thus what data
     * is being returned (either event data in JSON or a snapshot image as a byte array)
     * @param onError Function called when an error occurs during the processing of an event
     * @param onComplete Function called when the subscriber no longer wishes to receive events.
     */
  subscribe(type, onEvent, onError = () => {}, onComplete = () => {}) {
    DEBUG && console.log(chalk.green('[DEBUG] Creating Subscription for Observable of type:'), chalk.blue(type));
    const observer = {
      next(data) {
        onEvent(data);
      },
      error(e) {
        onError(e);
      },
      complete() {
        onComplete();
      },
    };
    switch (type.toUpperCase()) {
      case 'EVENT':
      case 'EVENTS':
        this._subscribedEventsObservable = this._eventsObservable.subscribe(observer);
        break;
      case 'SNAPSHOT':
      case 'SNAPSHOTS':
        this._subscribedSnapshotObservable = this._latestSnapshotObservable.subscribe(observer);
        break;
      default:
        console.log(chalk.yellow(`[WARN] No known event listeners to subscribe to for input: ${type}. Use either "event" or "snapshot".`));
    }
  }

  /**
     * Unsubscribes from a stream
     * @param type String type of stream to unsubscribe from. Can either be "event" or "snapshot"
     */
  unsubscribe(type) {
    if (typeof type === 'undefined' || type == null) {
      throw new Error('You must specify the type of string to unsubscribe from. Either "event", or "snapshot".');
    }
    if (type.toUpperCase() !== 'EVENT' && type.toUpperCase() !== 'SNAPSHOT') {
      throw new Error('You must specify a type of event to unsubscribe from either: "event" or "snapshot"');
    }
    DEBUG && console.log(chalk.green('[DEBUG] Unsubscribing from stream of type: '), chalk.blue(type));
    type.toUpperCase() === 'EVENT' ? this._subscribedEventsObservable.unsubscribe() : this._subscribedSnapshotObservable.unsubscribe();
  }

  /**
     * Retrieves a list of recent events that the Nest camera detected. It can take two optional params
     * start and end which are unix timestamps in seconds since epoch and represent a window of time to retrieve
     * events for.
     * @param start integer Unix timestamp in seconds representing the starting period of time to retrieve events for
     * @param end integer Unix timestamp in seconds representing the ending period of time to retrieve events for
     * @returns {Promise<any>}
     */
  getEvents(start = null, end = null) {
    if (!this.jwtToken) {
      throw new Error('Access token is null or undefined call: #fetchAccessToken() to retrieve new OAuth token.');
    }
    let query = '';

    if (start) query += `?start_time=${start}`;
    if (end) query += `&end_time=${end}`;

    const options = {
      method: 'GET',
      url: `${this.config.urls.NEXUS_HOST}${this.config.endpoints.getEventsEndpoint(this._id)}${query}`,
      headers: {
        Authorization: `Basic ${this.jwtToken}`,
      },
    };
    try {
      DEBUG && console.log(chalk.green('[DEBUG] Making Http request to retrieve all events to url: '), chalk.blue(options.url), chalk.green('between start time: '), chalk.blue(start), chalk.green('and end time: '), chalk.blue(end));
      return new Promise((res, rej) => {
        request(options)
          .then((response) => res(JSON.parse(response)))
          .catch((err) => rej(err));
      });
    } catch (e) {
      console.log(chalk.red('[ERROR] Failed to retrieve events from the Nest API Refreshing OAuth & JWT Tokens: ', e));
      this.refreshTokens();
      return null;
    }
  }

  /**
     * Saves the latest snapshot that is available from the camera to a specified location
     * @param snapshotPath String the location where the latest snapshot image should be saved.
     * @returns {Promise<any>}
     */
  async saveLatestSnapshot(snapshotPath = path.join(__dirname, '..', 'assets', `snap_${moment().format('YYYY-mm-dd_hh:mm:ss.SSS')}.jpg`)) {
    const options = {
      method: 'GET',
      url: `${this.config.urls.NEXUS_HOST}${this.config.endpoints.getLatestImageEndpoint(this._id)}`,
      headers: {
        Authorization: `Basic ${this.jwtToken}`,
      },
    };
    try {
      DEBUG && console.log(chalk.green('[DEBUG] Making Http Request to save latest snapshot to the location: '), chalk.blue(snapshotPath));
      return new Promise((res, rej) => {
        try {
          request(options).pipe(fs.createWriteStream(snapshotPath)).on('close', () => {
            res(snapshotPath);
          });
        } catch (err) {
          console.log(chalk.red('[ERROR] Failed to retrieve snapshots from the Nest API: ', err));
          rej(err);
        }
      });
    } catch (e) {
      console.log(chalk.red('[ERROR] Failed to retrieve snapshots from the Nest API Refreshing OAuth & JWT Tokens: ', e));
      this.refreshTokens();
      return null;
    }
  }

  /**
     * Retrieves a single snapshot image and writes it to disk
     * @param id String image id to retrieve. Will be post fixed with *-labs and prefixed with a unix time
     * stamp in seconds.
     * @param snapshotPath String the path where the image should be saved
     * @returns Promise
     */
  saveSnapshot(id, snapshotPath = path.join(__dirname, '..', 'assets', `snap_${moment().format('YYYY-mm-dd_hh:mm:ss.SSS')}.jpg`)) {
    if (!this.jwtToken) {
      throw new Error('JWT token is null or undefined. Call #fetchJwtToken() to retrieve new json web token.');
    }
    const options = {
      method: 'GET',
      url: `${this.config.urls.NEXUS_HOST}${this.config.endpoints.getSnapshotEndpoint(this._id)}${id}?crop_type=timeline&width=300`,
      headers: {
        Authorization: `Basic ${this.jwtToken}`,
      },
    };
    DEBUG && console.log(chalk.green('[DEBUG] Making Http Request to save snapshot with the id: '), chalk.blue(id), chalk.green(' to the location: '), chalk.blue(snapshotPath));
    return new Promise((res, rej) => {
      try {
        request(options).pipe(fs.createWriteStream(snapshotPath)).on('close', () => {
          res(snapshotPath);
        });
      } catch (err) {
        console.log(chalk.red('[ERROR] Failed to retrieve snapshots from the Nest API: ', err));
        rej(err);
      }
    });
  }
}

module.exports = Nest;
