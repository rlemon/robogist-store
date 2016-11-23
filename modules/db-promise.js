const query = require('./db-query');

module.exports = function({text, values}) {
	return new Promise( (resolve, reject) => {
		query({text, values}, (err, results) => {
			if( err ) return reject( err );
			return resolve(results.rows);
		});
	});
};