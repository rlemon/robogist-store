const request = require('request');

module.exports = function(params) {
	return new Promise( (resolve, reject) => {
		request(params, (err, response, body) => {
			if( err ) return reject(err);
			resolve( body );
		});
	});
}