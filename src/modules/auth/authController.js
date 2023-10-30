// const User = require('../../models/index2').users;
const User = require("../../models/index").sequelize.models.user;

const { sendEmail, emailData } = require("../../config/mailer");
// const User = db.users;
const { buildRes, errLogger } = require("../../utils");

/**
 * @route POST api/auth/register
 * @desc Register user
 */
exports.register = (req, res) => {
  if (!req.body.email) {
    return res
      .status(400)
      .json(buildRes({ message: "Email address cannot be empty" }));
  }

  User.scope('all').findOne({where: {email: req.body.email}})
        .then(user => {
            if (user){
                return res.status(400).json(buildRes({message: 'The email address you have entered is already used.'}));
            } 
            // Create and save the user
            const data = { firstName, lastName, email, password, mobile, aadhar, pan } = req.body;
            const newUser = new User(data);
            newUser.save()
                .then(user => {
                  sendEmail({
                    to: user.email,
                    subject: emailData.subject.registration,
                    body: emailData.body.registration,
                  })
                  res.status(200).json(buildRes({success: true, token: user.generateJWT(), user: newUser}))
                })
                .catch(err => {
                    errLogger(err)
                    res.status(500).json(buildRes({message: err.message}))
                });
        })
        .catch(err => {
            errLogger(err)
            res.status(500).json(buildRes({message: err.message}))
        });
};

/**
 *
 * @route POST api/auth/login
 * @desc Login user and return JWT token
 */
exports.login = (req, res) => {
    User.scope('all').findOne({where: {email: req.body.email}})
        .then(user => {
            if (!user) return res.status(401).json(buildRes({msg: 'The email address ' + req.body.email + ' is not associated with any account. Double-check your email address and try again.'}));

            //validate password
            if (!user.comparePassword(req.body.password)) return res.status(401).json(buildRes({message: 'Invalid email or password'}));

            // Login successful, write token
            const token = user.generateJWT()
            user = user.dataValues;
            delete user['password']

            //send email
            sendEmail({
              to: user.email,
              subject: emailData.subject.login,
              body: emailData.body.login,
            })
            res.status(200).json(buildRes({success: true, token, user: user}));
        })
        .catch(err => {
            errLogger(err)
            res.status(500).json(buildRes({message: err.message}))
        });
};