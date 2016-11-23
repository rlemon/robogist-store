const path = require('path');
const express = require('express');
const passport = require('passport');
const Strategy = require('passport-github');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const query = require('./modules/db-promise');
const publicRouter = require('./routes/public');
const gistRouter = require('./routes/gist');
const userRouter = require('./routes/user');
const config = require('./config.json');
const app = express();

passport.use(new Strategy({clientID, clientSecret, callbackURL} = config, authHandler));

passport.serializeUser((user, cb) => {
	cb(null, user);
});
passport.deserializeUser((obj, cb) => {
	if( !( 'oauthid' in obj ) ) return cb('invalid object', obj);
	const params = {
		text: `
			SELECT 
				userid, oauthid ,login, gravatar_id, avatar_url, html_url, gists_url, email, blog, location,
				CAST(joined as TEXT) as joined
			FROM profile_details WHERE oauthid = $1
		`,
		values: [obj.oauthid]
	};
	query(params).then(rows => cb(null, rows )).catch(err => cb(err, null));
});

function authHandler(accessToken, refreshToken, profile, cb) {
	return findOrCreate(profile._json, cb);
}

function findOrCreate(profile, cb) {
	const params = {
		text: `
			SELECT * FROM profile_details WHERE oauthid = $1
		`,
		values: [profile.id]
	};
	query(params).then(rows => {
		if( rows.length === 0 ) {
			return createUser(profile, cb);
		}
		cb(null, rows[0]);
	}).catch(err => cb(err, profile));
}

function createUser(profile, cb) {
	const {id, login, gravatar_id, avatar_url, html_url, gists_url, email, blog, location} = profile;
	const params = {
		text: `
			INSERT INTO profile_details
				(oauthid ,login, gravatar_id, avatar_url, html_url, gists_url, email, blog, location)
			VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9 )
		`,
		values: [id, login, gravatar_id, avatar_url, html_url, gists_url, email, blog, location]
	};
	query(params).then( _ => cb(null, profile)).catch(err => cb(err, profile));
}

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser({ extended: true }));
app.use(session({ secret: config.sessionKey, resave: true, saveUninitialized: true }));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', publicRouter);
app.use('/gist', gistRouter);
app.use('/user', userRouter);

app.use(function (req, res, next) {
  res.status(404).render('error', {code: 404, message: 'page not found'});
});

app.use(function(err, req, res, next) {
  if( err.code === 'LIMIT_FILE_SIZE' ) {
  	return res.redirect('/add?file_limit_exceeded');
  }
  
  res.status(500).render('error', {code: 500, message: (err.message || '<generic error message #47>')});
});

app.listen(7321, console.log.bind(console, 'app listening on 7321'));