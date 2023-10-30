const {validationResult} = require('express-validator');
const { buildRes } = require('../utils');

module.exports = (req, res, next) => {
    const errorsResultset = validationResult(req);
    if (!errorsResultset.isEmpty()) {
        let errors = {};
        errorsResultset.array().forEach(err => {
            errors[err.path]  = err.msg;
        })
        return res.status(400).json(buildRes({errors}));
    }

    next();
};