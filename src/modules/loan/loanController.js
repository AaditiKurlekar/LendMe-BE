
const db = require('../../models/index');
const fs = require('fs');
const path = require('path');
const User = db.sequelize.models.user;
const Wallet = db.sequelize.models.wallet;
const Loan = db.sequelize.models.loan;
const gatewayTransaction = db.sequelize.models.gatewayTransaction;
const walletTransaction = db.sequelize.models.walletTransaction;
const repaymentSchedule = db.sequelize.models.repaymentSchedule;


const { sendEmail, emailData } = require("../../config/mailer");
const { DEPOSIT, WITHDRAWAL, REPAYMENT, INVEST, BORROW, INCOME } = require('../../config/constants').walletTransactionTypes;
const { REQUESTED, ACTIVE, COMPLETED, EXPIRED, DISABLED } = require('../../config/constants').loanStatus;

const { Model, Op, where } = require('sequelize');
const { buildRes, errLogger, round, methodReturn } = require('../../utils');
const { generateAgreement, getDownloadUrl } = require('../../lib/agreementLib');

/**
 * @route GET api/loan
 * @desc Register user
 */
exports.getLoan = (req, res) => {
    let offset = req.query?.offset ?? 0;
    let limit = req.query?.limit ?? 10;

    const where = buildWhere(req);
    if(!where?.status){
        res.status(400).json(buildRes({message: where.message}));
    }

    Loan.findAll({limit: limit, offset: offset, where: where.data, include:[
        { model: User, as: 'borrower'}, { model: User, as: 'lender'}
    ]})
        .then(loans => {
            if (!loans instanceof Model){
                return res.status(200).json(buildRes({message: 'No loans found'}));
            } 
            return res.status(200).json(buildRes({success: true, loans: loans}));
        })
        .catch(err => {
            errLogger(err)
            res.status(500).json(buildRes({message: err.message}))
        });
};

/**
 * @route POST api/loan
 * @desc Create new loan
 */
exports.postLoan = (req, res) => {
    const data = { amount, interestRate, payoutFrequency, emiStartDate, tenureMonths, expiryDate, maturityDate, purpose, description } = req.body;
    data.borrowerUserId = req.user.id
    const newLoan = new Loan(data);

    newLoan.save()
        .then(loan => {
            //send email
            sendEmail({
                to: req.user.email,
                subject: emailData.subject.loanRequest,
                body: emailData.body.loanRequest,
            })
            res.status(200).json(buildRes({success: true, loan: loan}))
        })
        .catch(err => {
            errLogger(err)
            res.status(500).json(buildRes({message: err.message}))
        });
};

/**
 * @route GET api/loan/:loanId
 * @desc loan details with RPS
 */
 exports.loanDetails = (req, res) => {
    Loan.findOne({ where: {id: req.params.loanId}, include:[
        { association: 'rps'}, {association: 'lender'}, {association: 'borrower'}
    ]})
        .then(loansDetails => {
         if (!loansDetails){
                return res.status(200).json(buildRes({message: 'No loans found'}));
            } 
            return res.status(200).json(buildRes({success: true, loan: loansDetails}));   
        })
        .catch(err => {
            errLogger(err)
            res.status(500).json(buildRes({message: err.message}))
        });
};


/**
 * @route POST api/loan/:loanId/invest
 * @desc invest in a loan
 */
 exports.invest = async (req, res) => {
    const loan = await Loan.findOne({ where: {id: req.params.loanId}, include: [{ association: 'borrower'}]});
    if(!loan.id){
        return res.status(200).json(buildRes({message: 'No loan found'}));
    }

    if(loan.borrowerUserId == req.user.id){
        return res.status(200).json(buildRes({message: 'You cant invest in your own loan'}));
    }

    if(loan.lenderUserId){
        return res.status(200).json(buildRes({message: 'Loan is already invested, please try another'}));
    }

    const lenderWallet = await Wallet.findOne({where: {userId: req.user.id}});
    if(round(lenderWallet.amount - loan.amount, 2) < 0){
        return res.status(200).json(buildRes({message: 'Insufficent balance, please add money to invest'}));
    }

    const loanAmount = round(loan.amount, 2);
    const borrowerWallet = await Wallet.findOne({where: {userId: loan.borrowerUserId}});
    const t = await db.sequelize.transaction();
    
    try {
        //make invest money txn
        const lenderPostTxnBalance = round(lenderWallet.amount - loanAmount, 2);
        let lenderTxnData = {
            type: INVEST,
            amount: loanAmount,
            walletId: lenderWallet.id,
            postTransactionBalance: lenderPostTxnBalance,
            referanceId: loan.id,
        };
        let investTxn = new walletTransaction(lenderTxnData);
        await investTxn.save();

        //substract lender wallet
        await lenderWallet.update({amount: lenderPostTxnBalance});

        //make borrow money txn
        const borrowerPostTxnBalance = round(borrowerWallet.amount + loanAmount, 2);
        let borrowerTxnData = {
            type: BORROW,
            amount: loanAmount,
            walletId: borrowerWallet.id,
            postTransactionBalance: borrowerPostTxnBalance,
            referanceId: loan.id,
        };
        let borrowTxn = new walletTransaction(borrowerTxnData);
        await borrowTxn.save();
        
        //add borrowr wallet
        await borrowerWallet.update({amount: borrowerPostTxnBalance});

        //update loan
        await loan.update({lenderUserId: req.user.id, loanStatus: ACTIVE, investDate: new Date(loan.emiStartDate).toISOString().split('T')[0]});

        t.commit();

        //generate agreement
        // const agreement = await generateAgreement(loan.id);
        // await loan.update({agreementUrl: agreement.data.agreementUrl})
        
        // send email B
        sendEmail({
            to: loan.borrower.email,
            subject: emailData.subject.loanRequest,
            body: emailData.body.loanRequest,
        })
        // send email L
        sendEmail({
            to: req.user.email,
            subject: emailData.subject.investNowLender,
            body: emailData.body.investNowLender,
        })
        return res.status(200).json(buildRes({success: true, message: 'Hurray! Investment is done'}));
    } catch (err) {
        await t.rollback();
        errLogger(err);
        return res.status(500).json(buildRes({message: err.message}));
    }
};

/**
 * @route POST api/loan/:loanId/repayment/:installmentNo
 * @desc invest in a loan
 */
 exports.repayment = async (req, res) => {
    const {loanId, installmentNo} = req.params;
    const loan = await Loan.findOne({ where: {id: loanId}, include: [{ association: 'rps'}, { association: 'lender'}]});

    if(!loan?.id){
        return res.status(200).json(buildRes({message: 'No loan found'}));
    }

    if(loan.loanStatus != ACTIVE){
        return res.status(200).json(buildRes({message: "Loan is not in Active state"}));
    }

    if(loan.borrowerUserId != req.user.id){
        return res.status(200).json(buildRes({message: "You cant repay someone else loan"}));
    }

    const installment = loan.rps.find(r => r.installment == installmentNo);
    if(!installment){
        return res.status(404).json(buildRes({message: "Installment not found"}));
    }
    if(installment?.isPaid === true){
        return res.status(200).json(buildRes({message: "Installment already paid"}));
    }

    const installmentAmount = round(installment.amount, 2);
    const lenderWallet = await Wallet.findOne({where: {userId: loan.lenderUserId}});
    const borrowerWallet = await Wallet.findOne({where: {userId: loan.borrowerUserId}});

    if(round(borrowerWallet.amount - installmentAmount, 2) < 0){
        return res.status(200).json(buildRes({message: 'Insufficent balance, please add money to repay'}));
    }

    const t = await db.sequelize.transaction();

    try {
        //make repayment
        const lenderPostTxnBalance = round(lenderWallet.amount + installmentAmount, 2);
        let lenderTxnData = {
            type: INCOME,
            amount: installmentAmount,
            walletId: lenderWallet.id,
            postTransactionBalance: lenderPostTxnBalance,
            referanceId: installment.id,
        };
        let investTxn = new walletTransaction(lenderTxnData);
        await investTxn.save();

        //substract lender wallet
        await lenderWallet.update({amount: lenderPostTxnBalance});

        //make borrow money txn
        const borrowerPostTxnBalance = round(borrowerWallet.amount - installmentAmount, 2);
        let borrowerTxnData = {
            type: REPAYMENT,
            amount: installmentAmount,
            walletId: borrowerWallet.id,
            postTransactionBalance: borrowerPostTxnBalance,
            referanceId: installment.id,
        };
        let borrowTxn = new walletTransaction(borrowerTxnData);
        await borrowTxn.save();
        
        //add borrowr wallet
        await borrowerWallet.update({amount: borrowerPostTxnBalance});

        //update installment
        let paymentDate = new Date().toISOString().split('T')[0];
        await installment.update({isPaid: true, paymentDate: paymentDate});

        //update loan
        const paidAmount = round(installmentAmount + loan.paidAmount, 2);
        await loan.update({paidAmount: paidAmount});

        //loan closed?
        const totalDueAmount = round(loan.amount + loan.interest, 2);
        if(paidAmount >= totalDueAmount){
            await loan.update({loanStatus: COMPLETED});
        }

        t.commit();
        // send email B
        sendEmail({
            to: req.user.email,
            subject: emailData.subject.emiPayBorrower,
            body: emailData.body.emiPayBorrower,
        })
        // send email not working here L
        sendEmail({
            to: loan.lender.email,
            subject: emailData.subject.emiPayLender,
            body: emailData.body.emiPayLender,
        })
        return res.status(200).json(buildRes({success: true, message: 'Repayment done successfully'}));
    } catch (err) {
        await t.rollback();
        errLogger(err);
        return res.status(500).json(buildRes({message: err.message}));
    }
};

exports.agreement = async (req, res) => {
    const loan = await Loan.findOne({ where: {id: req.params.loanId}});

    //only borrower & lender can see agreement
    if(loan.borrowerUserId != req.user.id && loan.lenderUserId != req.user.id){
        return res.status(200).json(buildRes({message: 'You are Unauthorized to access agreement'}));
    }

    // if(!loan.agreementUrl){
    //     return res.status(200).json(buildRes({message: 'Agreement not generated'}));
    // }

    const agreement = await generateAgreement(loan.id);
    const pdf = fs.readFileSync(agreement.data.agreementUrl, 'utf-8');
        
    //render?
    if(req.query.render == 1){
        res.contentType("application/pdf");
        return res.sendFile(agreement.data.agreementUrl);
    }
    return res.status(200).json(buildRes({success: true, pdf: pdf}));
};


//Build query for getLoan()
const buildWhere = (req) => {
    if(req.query?.amountLte < req.query?.amountGte){
        return methodReturn(false, 'amountGte cannot be greater than amountLte');
    }
    if(req.query?.interestLte < req.query?.interestGte){
        return methodReturn(false, 'interestGte cannot be greater than interestLte');
    }
    if(req.query?.tenureLte < req.query?.tenureGte){
        return methodReturn(false, 'tenureGte cannot be greater than tenureLte');
    }

    const amountFilter = {};
    if(req.query?.amountLte) {
        amountFilter[Op.lte] = req.query?.amountLte ?? 0
    }
    if(req.query?.amountGte) {
        amountFilter[Op.gte] = req.query?.amountGte ?? 0
    }
    
    const interestFilter = {};
    if(req.query?.interestLte) {
        interestFilter[Op.lte] = req.query?.interestLte ?? 0
    }
    if(req.query?.interestGte) {
        interestFilter[Op.gte] = req.query?.interestGte ?? 0
    }

    const tenureFilter = {};
    if(req.query?.tenureLte) {
        tenureFilter[Op.lte] = req.query?.tenureLte ?? 0
    }
    if(req.query?.tenureGte) {
        tenureFilter[Op.gte] = req.query?.tenureGte ?? 0
    }

    const where = {
        amount: {
            [Op.and]: amountFilter
        },
        interestRate: {
            [Op.and]: interestFilter
        },
        tenureMonths: {
            [Op.and]: tenureFilter
        },
        // loanStatus: {
        //    [Op.eq]: REQUESTED
        // }
    }

    return methodReturn(true, 'Query build', where);
}