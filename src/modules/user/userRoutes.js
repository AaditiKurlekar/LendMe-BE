const express = require('express');
const {check} = require('express-validator');
const userController = require('./userController');
const paramsValidator = require('../../middlewares/paramsValidator');

const router = express.Router();

router.get('/',paramsValidator, userController.getUser)

router.put('/', paramsValidator, userController.updateUserData)

router.put('/updatePassword/',[
    check('password').notEmpty().withMessage('New password cannot be empty'),
], paramsValidator, userController.updatePassword)

router.get('/portfolio', paramsValidator, userController.portfolio)

module.exports = router;    