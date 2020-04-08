const request = require('request-promise-native');
const moment = require('moment');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { config } = require('./constants');
const Auth = require('./security/Auth');
const { from, interval, Subject } = require('rxjs');
const {
    switchMap,
    takeWhile,
    distinctUntilChanged,
    map,
    multicast,
    refCount,
} = require('rxjs/operators');

/**
 * Class which exposes several features on the Nest Camera API
 */
class Nest extends Auth {

    /**
     * Constructs a new Nest class. This creates an observable which can be polled
     * at a specified interval to retrieve the latest image from the Nest camera.
     * subscribers.
     * @param snapshotSubscriptionInterval Integer the amount of time between executions of the observable when a new
     * subscriber subscribes. Defaults to 5 seconds
     * @param eventSubscriptionInterval Integer The amount of time between executions of the event observable when
     * a new subscriber subscribes. Defaults to 3 seconds.
     */
    constructor(snapshotSubscriptionInterval = 5000, eventSubscriptionInterval = 3000) {
        super();
        const latestSnapshotSubject = new Subject();
        const eventSubject = new Subject();
        this._latestSnapshotObservable = interval(snapshotSubscriptionInterval).pipe(
            switchMap(() => from(this.saveLatestSnapshot())),
            multicast(latestSnapshotSubject),
            refCount()
        );
        this._eventsObservable = interval(eventSubscriptionInterval).pipe(
            switchMap(() => from(this.getEvents(moment().startOf('day').valueOf(), moment().valueOf()))),
            takeWhile((events) => events.length >= 0),
            distinctUntilChanged((prevEvents, currEvents) => currEvents.length === prevEvents.length),
            map(events => events[events.length - 1]),
            multicast(eventSubject),
            refCount()
        );
    }

    async init() {
        this.refreshTokens();
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
    subscribe(onEvent, type, onError = () => {}, onComplete = () => {}) {
        console.log(chalk.green('[INFO] Creating Subscription for Observable of type:'), chalk.blue(type));
        const observer = {
            next(data) {
                onEvent(data)
            },
            error(e) {
                onError(e)
            },
            complete() {
                onComplete()
            }
        };
        switch(type.toUpperCase()) {
            case 'EVENT':
            case 'EVENTS':
                this._eventsObservable.subscribe(observer);
                break;
            case 'SNAPSHOT':
            case 'SNAPSHOTS':
                this._latestSnapshotObservable.subscribe(observer);
                break;
            default:
                console.log(chalk.yellow(`[WARN] No known event listeners to subscribe to for input: ${type}. Use either "event" or "snapshot".`));
        }
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
        if(!this.jwtToken) {
            throw new Error("Access token is null or undefined call: #fetchAccessToken() to retrieve new OAuth token.");
        }
        let query = "";

        if(start) query += `?start_time=${start}`;
        if(end) query += `&end_time=${end}`;


        const options = {
            'method': 'GET',
            'url': `${config.urls.NEXUS_HOST}${config.endpoints.EVENTS_ENDPOINT}${query}`,
            'headers': {
                'Authorization': `Basic ${this.jwtToken}`
            }
        };
        try {
            return new Promise((res, rej) => {
                request(options)
                    .then(response => res(JSON.parse(response)))
                    .catch(err => rej(err));
            });
        } catch(e) {
            console.log('[ERROR] Failed to retrieve events from the Nest API Refreshing OAuth & JWT Tokens: ', e);
            this.refreshTokens();
        }
    };

    async saveLatestSnapshot(path) {
        const options = {
            'method': 'GET',
            'url': `${config.urls.NEXUS_HOST}${config.endpoints.LATEST_IMAGE_ENDPOINT}`,
            'headers': {
                'Authorization': `Basic ${this.jwtToken}`
            }
        };
        try {
            return new Promise((res, rej) => {
                try {
                    request(options).pipe(fs.createWriteStream(path)).on('close', () => {
                        res(path);
                    });
                } catch(err) {
                    console.log('[ERROR] Failed to retrieve snapshots from the Nest API: ', err);
                    rej(err);
                }
            });
        } catch(e) {
            console.log('[ERROR] Failed to retrieve snapshots from the Nest API Refreshing OAuth & JWT Tokens: ', e);
            this.refreshTokens()
        }
    }

    /**
     * Retrieves a single snapshot image and writes it to disk
     * @param id String image id to retrieve. Will be postfixed with *-labs and prefixed with a unix time
     * stamp in seconds.
     * @returns Promise
     */
    getSnapshot(id) {
        if(!this.jwtToken) {
            throw new Error('JWT token is null or undefined. Call #fetchJwtToken() to retrieve new json web token.');
        }
        const options = {
            'method': 'GET',
            'url': `${config.urls.NEXUS_HOST}${config.endpoints.SNAPSHOT_ENDPOINT}${id}?crop_type=timeline&width=300`,
            'headers': {
                'Authorization': `Basic ${this.jwtToken}`
            }
        };
        const imagePath = path.join(__dirname, '..', 'assets', `snap_${moment().format('YYYY-mm-dd_hh:mm:ss.SSS')}.jpg`);
        return new Promise((res, rej) => {
            try {
                request(options).pipe(fs.createWriteStream(imagePath)).on('close', () => {
                    res(imagePath);
                });
            } catch(err) {
                console.log('[ERROR] Failed to retrieve snapshots from the Nest API: ', err);
                rej(err);
            }
        });
    };
}

module.exports = Nest;
