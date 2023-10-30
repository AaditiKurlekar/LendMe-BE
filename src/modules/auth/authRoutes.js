const express = require('express');
const {check} = require('express-validator');
const Auth = require('./authController');
const paramsValidator = require('../../middlewares/paramsValidator');

const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).json({message: "You are in the Auth Endpoint. Register or Login to test Authentication."})
});

router.post('/register', [
    check('email').not().isEmpty().isEmail().withMessage('Enter a valid email address'),
    check('password').not().isEmpty().isLength({min: 6}).withMessage('Must be at least 6 chars long'),
    check('aadhar').not().isEmpty().isNumeric().withMessage('Enter a valid aadhar number'),
    check('pan').not().isEmpty().isAlphanumeric().withMessage('Enter a valid pan number')
], paramsValidator, Auth.register);


router.post('/login', [
    check('email').isEmail().withMessage('Enter a valid email address'),
    check('password').not().isEmpty().withMessage('Password is required'),
], paramsValidator, Auth.login);

module.exports = router;