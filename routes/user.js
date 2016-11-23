const express = require('express');
const router = express.Router();
const query = require('../modules/db-promise');

function loggedIn(req, res, next) {
	if( !( 'user' in req ) ) {
		req.session.redirectTo = req.url;
		return res.redirect('/login');
	}
	next();
}
function getInformation(userid, getUserInformation = false) {
	const gistParams = {
		text: `
			SELECT store.*, profile.login as username
			FROM gist_store store
			LEFT OUTER JOIN profile_details profile
			ON (CAST(profile.userid AS VARCHAR(255)) = store.userid)
			WHERE store.userid = $1
		`,
		values: [userid]
	};
	if( getUserInformation ) {
		const userParams = {
			text: `
				SELECT 
					oauthid ,login, gravatar_id, avatar_url, html_url, gists_url, email, blog, location,
					CAST(joined as TEXT) as joined
				FROM profile_details WHERE userid = $1 
			`,
			values: [userid]
		};
		return Promise.all([query(gistParams), query(userParams)]);
	}
	return query(gistParams);
}
router.get('/', loggedIn, (req, res, next) => {
	getInformation(req.user.userid).then(rows => {
		res.render('user/profile', {
			user: req.user,
			gists: rows
		});
	});
});

router.get('/:id', (req, res, next) => {
	const {id} = req.params;
	getInformation(id, true).then(([gists, user]) => {
		res.render('user/profile', {
			user: user[0], 
			gists
		});
	});
});


module.exports = router;