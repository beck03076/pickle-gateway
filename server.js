// =================================================================
// get the packages we need ========================================
// =================================================================
var express 	= require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var Sequelize = require("sequelize");
var config = require('./config'); // get our config file
var db = require('./app/models');
var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var fs        = require("fs");
var path      = require("path");
var env       = process.env.NODE_ENV || "development";
var bcrypt = require('bcrypt-nodejs');
var speakeasy = require('speakeasy');
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.set('superSecret', config.secret); // secret variable

// dynamically include routes (Controller)
fs.readdirSync('./app/controllers').forEach(function (file) {
  if(file.substr(-3) == '.js') {
    route = require('./app/controllers/' + file);
    route.controller(app);
  }
});

// attaching models to the application
app.set('models', require('./app/models'));

// =================================================================
// configuration ===================================================
// =================================================================
var port = process.env.PORT || 8080; // used to create, sign, and verify tokens

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// =================================================================
// routes ==========================================================
// =================================================================
app.post('/_unsecured/register_user', function(req, res) {

  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(req.body.password, salt);
  db.User
  .build({ name: req.body.name,
         mobile: req.body.mobile,
         email: req.body.email,
         encrypted_password: hash,
         age: req.body.age,
         gender: req.body.gender}).save()
         .then(function(user) {
           if (!user) {
             res.json({ success: false, message: 'Could not register user.' });
           } else if (user) {
             var otp = speakeasy.hotp({key: user.id, counter: 582, length: 4});
             console.log(otp);
             user.otp = otp;
             user.save().then(function(){});
             res.json({
               success: true,
               message: 'User registered successfully!',
               user_id: user.id,
               timed_message: "Until you configure a SMS service, I will return the OTP here and be vulnerable",
               otp: user.otp
             });
           }
         }).catch(function(error) {
           res.json(error.errors);
         });
});

app.post('/_unsecured/verify_otp', function(req, res) {
  db.User
  .findOne({where: { id: req.body.user_id
  }}).then(function(user) {
    if (!user) {
      res.json({ success: false, message: 'Could not find this user.' });
    } else if (req.body.otp != user.otp){
      res.json({
        success: false,
        message: 'OTP Mismatch!',
      });
    }else if (req.body.otp == user.otp){
      user.otp_verified = 1;
      user.save();
      var token = jwt.sign(user, app.get('superSecret'), {
        expiresInMinutes: 1440 // expires in 24 hours
      });
      res.json({
        success: true,
        message: 'Enjoy your token!',
        token: token
      });
    }
  }).catch(function(error) {
    res.json(error.errors);
  });
});

app.post('/_unsecured/login_user', function(req, res) {

  console.log(req.body);
  // find the user
  db.User.findOne({
    where: Sequelize.or(
      { email: req.body.email},
      {mobile: req.body.mobile})
  }).then(function(user) {

    console.log(user);
    if (!user) {
      res.json({ success: false, message: 'Authentication failed. User not found.' });
    } else if(user.otp_verified != 1){
      res.json({ success: false, message: 'User OTP Not Verified!' });
    }
    else if (user) {
      // check if password matches
      if (bcrypt.compareSync(req.body.password, user.encrypted_password)) {
        // if user is found and password is right
        // create a token
        var token = jwt.sign(user, app.get('superSecret'), {
          expiresInMinutes: 1440 // expires in 24 hours
        });

        res.json({
          success: true,
          message: 'Enjoy your token!',
          token: token
        });
      }else
        {
          res.json({ success: false, message: 'Authentication failed. Wrong password.' });
        }
    }
  });
});

// =================================================================
// start the server ================================================
// =================================================================
app.listen(port);
console.log('Magic happens at http://localhost:' + port);
