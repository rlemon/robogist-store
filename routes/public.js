const express = require('express');
const router = express.Router();
const query = require('../modules/db-promise');
const fs = require('fs');
const passport = require('passport');
const page_limit = 25;

function clampInt(num, high, low = 0) {
	if( isNaN(num) ) return 0;
	return Math.max(low, Math.min(num, high));
}

router.get('/', (req, res, next) => {
	res.render('public/home', { 
		user: req.user
	});
});

router.get('/browse', (req, res, next) => {
	let {start = 0, limit = 10} = req.query;
	limit = clampInt(limit, page_limit, 0);
	start = clampInt(start, Number.MAX_SAFE_INTEGER);
	console.log( limit, start );
	const params = {
		text: `
			SELECT store.*, profile.login as username
			FROM gist_store store
			LEFT OUTER JOIN profile_details profile
			ON (CAST(profile.userid AS VARCHAR(255)) = store.userid)
			ORDER BY store.id ASC LIMIT $2 OFFSET $1 
		`,
		values: [start, limit]
	}
	query(params).then(rows => {
		res.render('public/browse', {
			user: req.user, 
			gists: rows
		});
	}).catch(err => console.error(err));
});

router.get('/login', (req, res, next) => {
	if( req.user ) return res.redirect('/');
	res.render('public/login');
});

router.get('/login/github', passport.authenticate('github'));
router.get('/login/github/return', passport.authenticate('github', {failureRedirect: '/login'}), (req, res, next) => {
	let path = '/';
	if( req.session && req.session.redirectTo ) {
		path = req.session.redirectTo;
		delete req.session.redirectTo;
	}
	res.redirect(path);
});

router.post('/logout', (req, res, next) => {
	req.session.destroy();
	res.redirect('/');
});

router.get('/user-images/:hash', (req, res, next) => {
	const {hash} = req.params;
	
	if( !/\w+/.test(hash) ) {
		return next();
	}
	fs.readFile(`uploads/${hash}`, (err, data) => {
		if( err ) return next();
		res.writeHead(200, {'Content-Type': 'image/png'});
		res.end(data, 'binary');
	});
});

module.exports = router;