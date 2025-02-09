const {
  DEBUG,
} = process.env;
// eslint-disable-next-line no-unused-vars
const path = require('path');
const axios = require('axios');
const { from, interval, Subject } = require('rxjs');
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
    nestId: null,
    refreshToken: null,
    apiKey: null,
    clientId: null,
    nexusHost: "https://nexusapi-us1.dropcam.com", // Default value
    snapshotInterval: 5000,
    eventInterval: 3000,
  }) {
    if (options === null) throw new Error('The options argument cannot be null. It must include properties: nestId, refreshToken, apiKey, clientId');
    if (Object.keys(options).length < 4) throw new Error('You must have at least the following four properties: nestId, refreshToken, apiKey, clientId');
    if (!options.nestId) throw new Error('The property: nestId is not defined.');
    if (!options.refreshToken) throw new Error('The property: refreshToken is not defined.');
    if (!options.apiKey) throw new Error('The property: apiKey is not defined.');
    if (!options.clientId) throw new Error('The property: clientId is not defined.');

    super(options);
    this._id = options.nestId;
    this._options = options;

    const eventSubject = new Subject();
    this._eventsObservable = interval(options.eventInterval || 3000).pipe(
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
     * Creates a multicasted subscription to the stream of camera events for both motion and sound
     * @param onEvent Function called when a new event is received
     * @param type String Either event or snapshot. This value determines what observable is subscribed to and thus what data
     * is being returned (either event data in JSON or a snapshot image as a byte array)
     * @param onError Function called when an error occurs during the processing of an event
     * @param onComplete Function called when the subscriber no longer wishes to receive events.
     */
  subscribe(onEvent, onError = () => {}, onComplete = () => {}) {
    DEBUG && console.log(chalk.green('[DEBUG] Creating Subscription for Observable of type:'), chalk.blue('Event'));
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
    this._subscribedEventsObservable = this._eventsObservable.subscribe(observer);
  }

  /**
   * Creates a multicasted subscription to the stream of camera images for both motion and sound
   * @param onEvent Function callback function executed when a new image is received
   * @param onError Function callback function executed when there is some kind of error.
   * @param onComplete Function callback function executed when the observer completes its task
   */
  subscribeSnapshot(onEvent, onError, onComplete = () => {}) {
    DEBUG && console.log(chalk.green('[DEBUG] Creating Subscription for Observable of type:'), chalk.blue('Snapshot'));
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
    this._latestSnapshotObservable = interval(this._options.snapshotInterval || 5000).pipe(
      switchMap(() => from(this.getLatestSnapshot())),
      multicast(new Subject()),
      refCount(),
    );
    this._subscribedSnapshotObservable = this._latestSnapshotObservable.subscribe(observer);
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
     * events over. te
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
      method: "GET",
      url: `${this._options.nexusHost}${this.config.endpoints.getEventsEndpoint(
        this._id
      )}${query}`,
      headers: {
        Authorization: `Basic ${this.jwtToken}`,
      },
    };
    try {
      DEBUG && console.log(chalk.green('[DEBUG] Making Http request to retrieve all events to url: '), chalk.blue(options.url), chalk.green('between start time: '), chalk.blue(start), chalk.green('and end time: '), chalk.blue(end));
      return new Promise((res, rej) => {
        axios(options)
          .then((response) => res(response.data))
          .catch((err) => rej(err));
      });
    } catch (e) {
      console.log(chalk.red('[ERROR] Failed to retrieve events from the Nest API Refreshing OAuth & JWT Tokens: ', e));
      this.refreshTokens();
      return null;
    }
  }

  /**
     * Retrieves an image from the Nest camera and streams the result to a callback function in the promise (.then(...)).
     * This does NOT save the image to disk automatically. Users can do what they wish with the image data that is being
     * returned.
     * @returns {Promise<any>}
     */
  async getLatestSnapshot() {
    const options = {
      method: 'GET',
      url: `${this._options.nexusHost}${this.config.endpoints.getLatestImageEndpoint(this._id)}`,
      headers: {
        Authorization: `Basic ${this.jwtToken}`,
      },
      responseType: 'stream',
    };
    try {
      DEBUG && console.log(chalk.green('[DEBUG] Making Http Request to retrieve latest snapshot image.'));
      return new Promise((res, rej) => {
        try {
          axios(options).then((response) => res(response.data));
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
     * Retrieves a single snapshot image from the past given its unique id and streams the result back to a promise based
     * callback function i.e .then(). This does NOT save the image to disk automatically. Users can do what they wish with the image data that is being
     * returned.
     * @param id String image id to retrieve. Will be post fixed with *-labs and prefixed with a unix time
     * stamp in seconds.
     * @returns Promise
     */
  getSnapshot(id) {
    if (!this.jwtToken) {
      throw new Error('JWT token is null or undefined. Call #fetchJwtToken() to retrieve new json web token.');
    }
    const options = {
      method: "GET",
      url: `${
        this._options.nexusHost
      }${this.config.endpoints.getSnapshotEndpoint(
        this._id
      )}${id}?crop_type=timeline&width=300`,
      headers: {
        Authorization: `Basic ${this.jwtToken}`,
      },
      responseType: "stream",
    };
    DEBUG && console.log(chalk.green('[DEBUG] Making Http Request to retrieve snapshot with the id: '), chalk.blue(id));
    return new Promise((res, rej) => {
      try {
        axios(options).then((response) => res(response.data));
      } catch (err) {
        console.log(chalk.red('[ERROR] Failed to retrieve snapshots from the Nest API: ', err));
        rej(err);
      }
    });
  }
}

module.exports = Nest;
