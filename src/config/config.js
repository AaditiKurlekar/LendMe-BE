require('dotenv').config({path: '../.env'});

const connDetails = {
  "username": process.env.DB_USERNAME,
  "password": process.env.DB_PASSWORD,
  "database": process.env.DB_DATABASE,
  "host": process.env.DB_HOST,
  "dialect": process.env.DB_CONNECTION,
  dialectOptions: {
    ssl: {
      require: true,
    },
    quoteIdentifiers: true,
  }
}

module.exports = {
  "development": connDetails,
  "test": connDetails,
  "production": connDetails
};