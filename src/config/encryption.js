require('dotenv').config({path: '../.env'});

const { SECRET_KEY, SECRET_IV, ECNRYPTION_METHOD } = process.env

module.exports = {
    secret_key: SECRET_KEY,
    secret_iv: SECRET_IV,
    encryption_method: ECNRYPTION_METHOD,
}
