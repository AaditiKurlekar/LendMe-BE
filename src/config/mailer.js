const nodemailer = require("nodemailer");
const { object } = require("webidl-conversions");
require("dotenv").config();

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
    clientId: process.env.OAUTH_CLIENTID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
  },
});

exports.sendEmail = ({ to, subject, body }) => {
  let mailOptions = {
    from: "lendme.p2p@gmail.com",
    to: to,
    subject: subject,
    text: body,
  };

  transporter.sendMail(mailOptions, function (err, data) {
    console.log(mailOptions);
    if (err) {
      console.log("Error " + err);
    } else {
      console.log("Email sent successfully");
    }
  });
};

exports.emailData = {
  subject: {
    login: "Login successful",
    registration: "Registration successful",
    loanRequest: "Loan requested",
    editProfile: "Profile has been updated",
    changePassword: "Password has been updated",
    investNowLender: "Invested in a loan",
    investNowBorrower: "Loan request accepted",
    addMoney: "Wallet is updated",
    emiPayLender: "EMI has been received",
    emiPayBorrower: "EMI has been paid",
  
  },
  body: {
    login:
      "Great news! \n You have successfully logged into your account. By logging in, you now have access to a range of features and functionalities specific to your account.",
    registration:
      "Congratulations!!! \n You have successfully registered on LendMe. LendMe is a platform that connects borrowers with lenders, providing a streamlined process for accessing loans. As a registered user, you now have the opportunity to explore various loan options. Have a great journey ahead!!",
    loanRequest:
      "Hello! \n Thank you for the update. Your loan request has been raised, and you will be notified shortly once the lender accepts it. Your loan application has been submitted and is currently being reviewed by a lender. The lender will assess your request and determine whether they can approve and provide the loan you are seeking. Once a decision is made, you will be promptly notified about the outcome. Please stay tuned for further updates.",
    editProfile:
      "Hey, \n your profile details have been successfully updated. Its important to keep your profile information accurate and up to date, as it helps ensure that the provided information is current and relevant. If you have any other questions or need further assistance, feel free to let us know.",
    changePassword: "Hi, \n your password has been updated successfully",
    investNowLender:
      "Hey, \n You have invested in a loan, you will absolutely get good returns through this investment.",
    investNowBorrower:
      "Congratulations! \n Your loan request has been accepted.",
    addMoney: "Hello, \n Your wallet amount has been updated. ",
    emiPayLender:
      "Hey, \n Thats great news! The EMI (Equated Monthly Installment) has been received. This means that the specified monthly installment amount has been successfully paid towards your wallet. If you have any further queries or need assistance with anything else, please feel free to ask.",
    emiPayBorrower:
      "Hello, \n Wonderful news! Your EMI (Equated Monthly Installment) has been successfully paid. This means that you have fulfilled your monthly payment obligation towards your lender. Regular and timely payment of EMIs is important to maintain a good repayment track record and ensure the progress of your loan is on track. If you have any further questions or require assistance with anything else, please dont hesitate to let us know.",
  },
};
