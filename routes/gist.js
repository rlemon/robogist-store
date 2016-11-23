const express = require('express');
const router = express.Router();
const multer = require('multer');
const request = require('../modules/request-promise');
const query = require('../modules/db-promise');

const upload = multer({
	dest: 'uploads/',
	limits: {
		fileSize: 1024 * 1024
	}
});

const addEventMessages = {
	file_limit_exceeded: {
		type: 'danger',
		message: 'file has exceeded the allowed limit'
	},
	mimetype_invalid: {
		type: 'danger',
		message: 'file must be either PNG or JPEG'
	},
	upload_complete: {
		type: 'success',
		message: 'your gist has been added to the store'
	},
	gist_404: {
		type: 'warning',
		message: 'unable to locate your gist'
	}
};

const allowedMimeTypes = ['image/png', 'image/jpeg'];

function loggedIn(req, res, next) {
	if( !( 'user' in req ) ) {
		req.session.redirectTo = req.url;
		return res.redirect('/login');
	}
	next();
}

router.get('/', (req, res, next) => {
	res.redirect('/browse'); // maybe make a landing page for this.
});

router.get('/add', loggedIn, (req, res, next) => {
	const errors = Object.keys(addEventMessages).map(key => {
		if( key in req.query ) {
			return addEventMessages[key];
		}
	}).filter(Boolean);
	res.render('gist/add', {
		user: req.user, 
		errors
	});
});

router.post('/save', loggedIn, upload.single('screenshot'), (req, res, next) => {
	const {file} = req;
	let failed = false;
	let path = '/gist/add?error';
	if( file ) {
		if( !allowedMimeTypes.includes(file.mimetype) ) {
			path += '&mimetype_invalid';
			remove = true;
		}
	}
	const [,gistId = req.body.id] = req.body.id.match(/https:\/\/gist\.github\.com\/.*\/(\w+)/);
	request({
		url: `https://api.github.com/gists/${gistID}/commits`,
		headers: {'User-Agent': 'RoboGistStore/0.1'}
	}).then(body => {
		const obj = JSON.parse(body);
		if( 'message' in obj ) {
			path += '&gist_404';
			return res.redirect(path);
		}
	}).then(_ => {
		const params = {
			text: `
				INSERT INTO gist_store
					(userid, gistid, name, description, screenshot, matches, updated, total_installs)
				VALUES ( $1, $2, $3, $4, $5, $6, $7, $8 )
				RETURNING id
			`,
			values: [
				req.user.userid, 
				gistId, 
				req.body.name, 
				req.body.description, 
				file ? file.filename : '', 
				req.body.matches, 
				Date.now(), 
				0
			]
		};
		query(params).then(rows => {
			const {id} = rows[0];
			res.redirect(`/gist/view/${id}`);
		});
	});
});

router.get('/view/:id', (req, res, next) => {
	const {id} = req.query;
	const params = {
		text: `
			SELECT store.*, profile.login as username
				FROM gist_store store
				LEFT OUTER JOIN profile_details profile
				ON (CAST(profile.userid AS VARCHAR(255)) = store.userid)
				WHERE store.gistid = $1	
		`,
		values: [id]
	};
	query(params).then(rows => {
		if( rows.length === 0 ) {
			return next();
		}
		res.render('gist/view', {
			user: req.user,
			gist: rows[0]
		});
	});
});

router.get('/edit/:id', loggedIn, (req, res, next) => {
	res.end('not yet');
});

module.exports = router;