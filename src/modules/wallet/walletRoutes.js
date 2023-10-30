const express = require('express');
const {check} = require('express-validator');
const walletController = require('./walletController');
const paramsValidator = require('../../middlewares/paramsValidator');

const router = express.Router();

router.get('/', paramsValidator, walletController.getWallet);

router.post('/deposit',  [
    check('amount').not().isEmpty().isNumeric().withMessage('Valid Amount required'),
], paramsValidator, walletController.postDeposit);

router.get('/deposit/status/:orderId', [
    check('orderId').notEmpty().withMessage("order id is missing"),
], paramsValidator, walletController.getDepositStatus)

router.post('/deposit/make-me-millionaire', [
], paramsValidator, walletController.millionaire)


module.exports = router;