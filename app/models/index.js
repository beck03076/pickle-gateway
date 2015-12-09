var Sequelize = require('sequelize');

// initialize database connection
var sequelize = new Sequelize(
  "gateway",
  "root",
  "password",{
    host: "localhost"
  }
);

// load models
var models = [
  'User'
];
models.forEach(function(model) {
  module.exports[model] = sequelize.import(__dirname + '/' + model);
});

// export connection
module.exports.sequelize = sequelize;

