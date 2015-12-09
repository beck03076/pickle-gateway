var Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('User', {
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    encrypted_password: DataTypes.STRING,
    mobile: DataTypes.STRING,
    age: DataTypes.STRING,
    gender: DataTypes.STRING,
    otp: DataTypes.STRING,
    otp_verified: DataTypes.BOOLEAN,
    email_verified: DataTypes.BOOLEAN
  });

  return User;
};
