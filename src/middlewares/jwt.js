const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/index').user;
const { errLogger } = require('../utils');

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
};

module.exports = passport => {
    passport.use(
        new JwtStrategy(opts, (jwt_payload, done) => {

            //jwt token is valid, now lets add user details to req
            return done(null, jwt_payload);

            //fetch more info fron db
            User.findOne({where: {id: jwt_payload.id}})
                .then(user => {
                    if (user) return done(null, user);
                    return done(null, false);
                })
                .catch(err => {
                    errLogger(err)
                    return done(err, false, {message: 'Internal Server Error'});
                });
        })
    );
};