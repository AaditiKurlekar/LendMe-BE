const { REQUESTED, ACTIVE, COMPLETED, EXPIRED, DISABLED } = require('../config/constants').loanStatus;
const { generateRPS } = require('../lib/rpsLib');
const { errLogger, round } = require('../utils');
const User = require('./index').user;
const DataTypes = require('sequelize').DataTypes;
const roundColumns = ['amount', 'interest', 'interestRate'];

const Loan =  (sequelize) => {
    const Loan = sequelize.define( "loan", {
        borrowerUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: sequelize.models.user,
                key: 'id'
            }
        },
        lenderUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: sequelize.models.user, // 'Movies' would also work
                key: 'id'
            }
        },
        loanStatus: {
            type: DataTypes.ENUM(REQUESTED, ACTIVE, COMPLETED, EXPIRED, DISABLED),
            defaultValue: REQUESTED,
            allowNull: false,
        },
        amount: {
            type: DataTypes.FLOAT.UNSIGNED,
            allowNull: false,
        },
        interest: {
            type: DataTypes.FLOAT.UNSIGNED,
            default: null,
            allowNull: true,
        },
        paidAmount: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            allowNull: false,
        },
        interestRate: {
            type: DataTypes.FLOAT(4, 2).UNSIGNED,
            allowNull: false,
        },
        payoutFrequency : {
            type: DataTypes.ENUM('Monthly', 'Quaterly'),
            allowNull: false,
        },
        emiStartDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        investDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            defaultValue: null,
        },
        tenureMonths: {
            type: DataTypes.SMALLINT.UNSIGNED,
            allowNull: false,
        },
        expiryDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        maturityDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        purpose: {
            type: DataTypes.STRING,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            default: null,
        },
        agreementUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            default: null,
        }
    }, {
        timestamps: true,
        indexes: [
            {
                fields: ['borrowerUserId'],
            },
            {
                fields: ['lenderUserId'],
            },
            {
                fields: ['loanStatus'],
            },
        ],
        defaultScope: {
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
        },
    })
    
    Loan.associate = function(models) {
        Loan.belongsTo(models.user, {foreignKey: 'borrowerUserId', as: 'borrower'})
        Loan.belongsTo(models.user, {foreignKey: 'lenderUserId', as: 'lender'})
        Loan.hasMany(models.repaymentSchedule , {foreignKey: 'loanId', as: 'rps'});
    };

    Loan.addHook('beforeCreate', async function(loan) {
        Object.keys(loan).forEach(key => {
            if(roundColumns.includes(key) && loan[key]) loan[key] = round(loan[key], 2);
        });
        loan.emiStartDate = new Date(loan.emiStartDate).toISOString().split('T')[0];
        loan.maturityDate = new Date(loan.maturityDate).toISOString().split('T')[0];
        loan.expiryDate = new Date(loan.expiryDate).toISOString().split('T')[0];      
        if (loan.purpose) loan.purpose = loan.purpose.toLowerCase().split(" ").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
    });

    Loan.addHook('beforeUpdate', async function(loan) {
        Object.keys(loan).forEach(key => {
            if(roundColumns.includes(key) && loan[key]) loan[key] = round(loan[key], 2);
        });
        loan.emiStartDate = new Date(loan.emiStartDate).toISOString().split('T')[0];
        loan.maturityDate = new Date(loan.maturityDate).toISOString().split('T')[0];
        loan.expiryDate = new Date(loan.expiryDate).toISOString().split('T')[0];      
        if (loan.purpose) loan.purpose = loan.purpose.toLowerCase().split(" ").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
    });

    //generate RPS
    Loan.addHook('afterCreate', async function(loan) {
        let rps = generateRPS(loan);
        rps = rps.map(installment => ({ ...installment, loanId: loan.id, is_paid: false }));
        rps.forEach(async rpsInstallment => {
            installment = new sequelize.models.repaymentSchedule(rpsInstallment);
            await installment.save().catch(err => {
                errLogger(err)
            });;
        });

        //update interest amount
        let interest = rps.reduce(function(a, b){
            return a + round(b.interest, 2);
        }, 0);
        await loan.update({interest: round(interest, 2)});

    });

    return Loan;
}
module.exports = Loan;