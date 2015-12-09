var db = require('../models');
var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./../../config'); // get our config file
var http = require('http');
var querystring = require('querystring');
module.exports.controller = function(router) {

  /**
   * a home page route
   */
  // ---------------------------------------------------------
  // get an instance of the router for api routes
  // ---------------------------------------------------------

  // ---------------------------------------------------------
  // authentication (no middleware necessary since this isnt authenticated)
  // ---------------------------------------------------------
  // http://localhost:8080/api/authenticate


  // ---------------------------------------------------------
  // route middleware to authenticate and check token
  // ---------------------------------------------------------
  function auth(req, res, next) {

    // check header or url parameters or post parameters for token
    var token = req.headers['x-access-token'];

    // decode token
    if (token) {
      console.log(token);
      console.log(req.app.get('superSecret'));

      // verifies secret and checks exp
      jwt.verify(token, req.app.get('superSecret'), function(err, decoded) {
        if (err) {
          return res.json({ success: false, message: 'Failed to authenticate token.' });
        } else {
          // if everything is good, save to request for use in other routes
          req.decoded = decoded;
          next();
        }
      });

    } else {

      // if there is no token
      // return an error
      return res.status(403).send({
        success: false,
        message: 'No token provided.'
      });

    }
  }

  // ---------------------------------------------------------
  // authenticated routes
  // ---------------------------------------------------------
  router.get('/',auth, function(req, res) {
    res.json({ message: 'Welcome to the coolest API on earth!' });
  });

  router.get('/api/users',auth, function(req, res) {
    db.User.findAll().then(function(users) {
      res.json(users);
    });
  });

  router.get('/api/check',auth, function(req, res) {
    res.json(req.decoded);
  });

  // ---------------------------------------------------------
  // authenticated deals apis
  // ---------------------------------------------------------
  router.get('/api/deals/:id',auth, function(req, res) {
    get_from_service("deals","GET","deals/" + req.params.id,res);
  });

  router.get('/api/deals',auth, function(req, res) {
    get_from_service("deals","GET","deals",res);
  });

  router.post('/api/deals',auth, function(req, res) {
    post_to_service("deals","POST","deals",req.body,res);
  });

  router.put('/api/deals/:id',auth, function(req, res) {
    post_to_service("deals","PUT","deals" + "/" + req.params.id,req.body,res);
  });

  router.get('/api/businesses/:id/deals',auth, function(req, res) {
    get_from_service("deals","GET","businesses/" + req.params.id + "/deals",res);
  });

  // ---------------------------------------------------------
  // authenticated businesses apis
  // ---------------------------------------------------------
  router.get('/api/businesses/:id',auth, function(req, res) {
    get_from_service("businesses","GET","businesses/" + req.params.id,res);
  });

  router.get('/api/businesses',auth, function(req, res) {
    get_from_service("businesses","GET","businesses",res);
  });

  router.post('/api/businesses',auth, function(req, res) {
    post_to_service("businesses","POST","businesses",req.body,res);
  });

  router.put('/api/businesses/:id',auth, function(req, res) {
    post_to_service("businesses","PUT","businesses" + "/" + req.params.id,req.body,res);
  });
  // ---------------------------------------------------------
  // functions used to hit the endpoints, get, post, put
  // ---------------------------------------------------------

  function post_to_service(service,method,tail,params,res){
    var host = config.endpoints[service].host;
    var port = config.endpoints[service].port;
    var prefix_path = config.endpoints[service].prefix_path;
    contact_internal_post(method,host,port,"/" + prefix_path + "/" + tail,params,res);
  }


  function get_from_service(service,method,tail,res){
    var host = config.endpoints[service].host;
    var port = config.endpoints[service].port;
    var prefix_path = config.endpoints[service].prefix_path;
    contact_internal_get(method,host,port,"/" + prefix_path + "/" + tail,res);
  }

  function contact_internal_get(method,host,port,path,response_object){

    var options = {
      host: host,
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    console.log(options);

    var req = http.get(options, function(res) {

      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));

      // Buffer the body entirely for processing as a whole.
      var body = '';
      res.on('data', function(chunk) {

        // You can process streamed parts here...
        body += chunk;
      }).on('end', function() {
        body = JSON.parse(body);
        response_object.json({response: body});
      })
    });

    req.on('error', function(e) {
      console.log('ERROR: ' + e.message);
    });

  }

  function contact_internal_post(method,host,port,path,params,response_object) {
    var post_data = JSON.stringify(params);

    // An object of options to indicate where to post to
    var post_options = {
      host: host,
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(post_data)
      }
    };

    // Set up the request
    var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        response_object.json({response: chunk});
      });
    });

    // post the data
    post_req.write(post_data);
    post_req.end();

  }


}
