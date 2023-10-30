const express = require('express');
const {check} = require('express-validator');
const loanController = require('./loanController');
const paramsValidator = require('../../middlewares/paramsValidator');

const router = express.Router();

router.get('/', paramsValidator, loanController.getLoan);

router.post('/',  [
    check('amount').not().isEmpty().isNumeric().withMessage('Valid Amount required'),
    check('interestRate').not().isEmpty().isFloat({min: 0, max: 99.99}).withMessage('Valid interestRate required'),
    check('payoutFrequency').notEmpty().isIn(['Monthly', 'Quaterly']).withMessage('valid payoutFrequency required'),
    check('emiStartDate').notEmpty().isDate({format: 'YYYY-MM-DD'}).withMessage('valid emiStartDate required in Y-m-d format'),
    check('tenureMonths').notEmpty().isNumeric({min: 1}).withMessage('valid tenureMonths required'),
    check('maturityDate').notEmpty().isDate({format: 'YYYY-MM-DD'}).withMessage('valid maturityDate required in Y-m-d format'),
    check('purpose').notEmpty().isString().withMessage('valid purposeId required'),
    check('expiryDate').notEmpty().isDate({format: 'YYYY-MM-DD'}).withMessage('valid expiryDate required in Y-m-d format'),
], paramsValidator, loanController.postLoan);

router.get('/:loanId', [
    check('loanId').notEmpty().withMessage("Loan id is missing"),
], paramsValidator, loanController.loanDetails)

router.post('/:loanId/invest', [
    check('loanId').notEmpty().withMessage("Loan id is missing"),
], paramsValidator, loanController.invest)


router.post('/:loanId/repayment/:installmentNo', [
    check('loanId').notEmpty().withMessage("Loan id is missing"),
    check('installmentNo').notEmpty().withMessage("installmentNo is missing"),
], paramsValidator, loanController.repayment)

router.get('/:loanId/agreement', [
    check('loanId').notEmpty().withMessage("Loan id is missing"),
], paramsValidator, loanController.agreement)


module.exports = router;