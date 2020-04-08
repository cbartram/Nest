const Nest = require('../build/main');

const camera = new Nest();

camera.init().then(() => {
    camera.subscribe((event) => {
        console.log('[INFO] Event received: ', event);
    }, 'event');
});