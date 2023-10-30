require('dotenv').config();
const db = require('../../models/index');
const User = db.sequelize.models.user;
const Wallet = db.sequelize.models.wallet;
const gatewayTransaction = db.sequelize.models.gatewayTransaction;
const razorpay = require('../../config/razorpay');
const { buildRes, errLogger, round } = require('../../utils');
const {CREATED, FAILED, SUCCESS} = require('../../config/constants').gatewayTransaction.status;
const {maxVerifyAttemptCount} = require('../../config/constants').razorpay;
const { sendEmail, emailData } = require("../../config/mailer");

/**
 * @route GET api/user/wallet
 * @desc Get wallet details
 */
exports.getWallet = (req, res) => {
    Wallet.findOne({
        where: {userId: req.user.id},
         include:[
             { association: 'walletTransactions'}
        ]
    })
    .then(wallet => {
        return res.status(200).json(buildRes({success: true, wallet: wallet}));
    })
    .catch(err => {
        errLogger(err)
        res.status(500).json(buildRes({message: err.message, user: req.user}))
    });
};

/**
 * @route POST api/user/wallet/deposit
 * @desc create new deposit request
 */
 exports.postDeposit = async (req, res) => {

    const wallet = await Wallet.findOne({where: {userId: req.user.id}});
    const walletId = wallet.id; 
    if(!walletId || !wallet.isActive){
        return res.status(200).json(buildRes({message: 'Wallet not found or inactive'}));
    }

    const orderReq = {
        amount: round(req.body.amount, 2) * 100,
        currency: 'INR',
        // receipt: '',
        notes: {
            userId: req.user.id,
            walletId: walletId,
            userFirstName: req.user.firstName,
            userLastName: req.user.firstName
        }
    } 

    const order = await razorpay.orders.create(orderReq);
    
    if(!order.id || order.error) {
        return res.status(200).json(buildRes({message: order.error.description}));
    }

    //store order
    const txn = {
        orderId: order.id,
        walletId: walletId,
        status: CREATED,
        amount: round(order.amount),
        requestJson: orderReq,
    }
    let gatewayTxn = new gatewayTransaction(txn);
    gatewayTxn = await gatewayTxn.save().catch(err => {
        errLogger(err)
        res.status(500).json(buildRes({message: err.message}))
    });

    const resObj = {
        key: process.env.RAZORPAY_KEY_ID,
        name: 'LendMe',
        orderId: order.id,
        prefill: {
            name: req.user.firstName + ' ' + req.user.lastName,
            email: req.user.email,
        }
    }

    // send email
    sendEmail({
        to: req.user.email,
        subject: emailData.subject.addMoney,
        body: emailData.body.addMoney,
    })
    return res.status(200).json(buildRes({success: true, order: resObj}));
};


/**
 * @route GET api/user/wallet/deposit/status/:orderId
 * @desc verify deposit order status
 */
 exports.getDepositStatus = async (req, res) => {

    const orderId = req.params.orderId;
    //check order update available 
    const gatewayTxn = await gatewayTransaction.findOne({where: {orderId}});
    if(!gatewayTxn.id){
        return res.status(200).json(buildRes({message: 'Deposit request not found'}));
    }
    if(gatewayTxn.status == FAILED){
        return res.status(200).json(buildRes({message: 'Deposit has been Failed'}));
    }
    if(gatewayTxn.status == SUCCESS){
        return res.status(200).json(buildRes({success: true, message: 'Deposit Has been successful'}));
    }

    //try verifying payment from gateway
    if(gatewayTxn.verifyAttemptCount >= maxVerifyAttemptCount){
        await gatewayTxn.update({status: FAILED});
        return res.status(200).json(buildRes({message: 'Deposit has been Failed'}));
    }

    let order = await razorpay.orders.fetch(orderId);
    if(!order.id || order.error) {
        return res.status(200).json(buildRes({message: order.error.description}));
    }

    let verifyAttemptCount = Number.parseInt(gatewayTxn.verifyAttemptCount) + 1;
    const orderAmount = round(order.amount/100, 2);
    const orderAmountPaid = round(order.amount_paid/100, 2);
    if(orderAmountPaid >= orderAmount) {
        // const t = await db.sequelize.transaction();
        try {
                const wallet = await Wallet.findOne({where: {id: gatewayTxn.walletId}});
                let addMoneyRes = await wallet.depositMoney(gatewayTxn.id, order);
                // await t.commit();
                return res.status(200).json(buildRes({success: addMoneyRes.status, message: addMoneyRes.message}));
        } catch (err) {
            // await t.rollback();
            errLogger(err);
            return res.status(500).json(buildRes({message: err.message}));
        }
    }
    
    await gatewayTxn.update({responseJson: order, verifyAttemptCount: verifyAttemptCount});
    
    return res.status(200).json(buildRes({message: 'Deposit order has not been fullfilled!'}));
};


/**
 * @route POST /api/user/wallet/deposit/make-me-millionaire 
 * @desc demo add million ruppes
 */
 exports.millionaire = async (req, res) => {
    const wallet = await Wallet.findOne({where: {userId: req.user.id}});
    const amount = round(wallet.amount + 1000000, 2);
    await wallet.update({amount: amount});
    return res.status(200).json(buildRes({success: true, message: 'Million added!'}));
};
