'use strict';
const Glue = require('glue');
const Manifest = require('./manifest');

process.on('unhandledRejection', (reason, promise) => {
    var date = new Date().toLocaleTimeString("en-US");
    console.log(promise);
    console.error(`${date}: Unhandled Rejection at: ${promise} reason: ${reason}`);
});


const main = async function () {

    const options = { relativeTo: __dirname };
    const server = await Glue.compose(Manifest.get('/'), options);
    const cache = server.cache({ segment: 'sessions', expiresIn: 3 * 24 * 60 * 60 * 1000 });
    server.app.cache = cache;
    await server.start();

    console.log(`Server started on port ${Manifest.get('/server/port')}`);
};


main();
