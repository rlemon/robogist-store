const config = require('../config.json');
const pg = require('pg');

const client = new pg.Client(config.psqlConnectionString);
client.connect(err => {
	if( err ) console.log('ERROR', err);
});
module.exports = client.query.bind(client);