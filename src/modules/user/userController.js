const User = require('../../models/index').user;
const { decryptData, encryptData } = require('../../lib/encryptionLib');
const { buildRes, errLogger } = require('../../utils');
const bcrypt = require('bcrypt');
const { sendEmail, emailData } = require("../../config/mailer");

/**
 * @route GET api/user
 * @desc Register user
 */
exports.getUser = (req, res) => { 
    User.findOne({ where: {id: req.user.id}})
        .then(async userDetails => {
            if (!userDetails){
                return res.status(200).json(buildRes({message: 'No user found'}));
            } 

            if(userDetails.pan){
                userDetails.pan = await decryptData(userDetails.pan);
            }
            if(userDetails.aadhar){
                userDetails.aadhar = await decryptData(userDetails.aadhar);
            }

            return res.status(200).json(buildRes({success: true, user: userDetails}));
        })
        .catch(error => {
            errLogger(error)
            return res.status(500).json(buildRes({message: error.message}))
        })
}

exports.updateUserData = (req, res) => {     
    User.scope('all').findOne({ where: {id: req.user.id}})
        .then(async userDetails => {
            if (!userDetails){
                return res.status(200).json(buildRes({message: 'No user found'}));
            } 

            const { firstName, lastName, email, mobile } = req.body;

            userDetails.lastName= lastName;  
            userDetails.firstName= firstName; 
            userDetails.email= email; 
            userDetails.mobile= mobile; 

            await userDetails.save();

            //send email
            sendEmail({
                to: req.user.email,
                subject: emailData.subject.editProfile,
                body: emailData.body.editProfile,
            })
            return res.status(200).json(buildRes({success: true, user: userDetails}));
        })
        .catch(error => {
            errLogger(error)
            return res.status(500).json(buildRes({message: error.message}))
        })
}

exports.updatePassword = (req, res) => {
    User.scope('all').findOne({ where: {id: req.user.id}})
        .then(async userDetails => {
            if (!userDetails){
                return res.status(200).json(buildRes({message: 'No user found'}));
            } 

            const { newPassword, password } = req.body;

            if (!userDetails.comparePassword(password)) return res.status(200).json(buildRes({message: 'Password is not matching the existing password'}));

            userDetails.password = newPassword;
            userDetails.encryptNewPassword(userDetails);
            await userDetails.save();

            //send email
            sendEmail({
                to: req.user.email,
                subject: emailData.subject.changePassword,
                body: emailData.body.changePassword,
            })

            return res.status(200).json(buildRes({success: true, user: userDetails}));
        })
        .catch(error => {
            errLogger(error)
            return res.status(500).json(buildRes({message: error.message}))
        })
}

exports.portfolio = async (req, res) => { 
    const user = await User.findOne({ where: {id: req.user.id},
            include: [
                {association: 'lent',  separate: true, foreignKeyConstraint:true, include: [{association: 'rps', separate: true, foreignKeyConstraint:true,}, {association: 'borrower'}, {association: 'lender'}]},
                {association: 'borrowed', separate: true, foreignKeyConstraint:true, include: [{association: 'rps', separate: true, foreignKeyConstraint:true,}, {association: 'borrower'}, {association: 'lender'}]},
            ],
    })
    .catch(error => {
        errLogger(error)
       return  res.status(500).json(buildRes({message: error.message}))
    });

    return res.status(200).json(buildRes({success: true, user: user}));
}
