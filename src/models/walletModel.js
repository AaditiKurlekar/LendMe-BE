const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { round, methodReturn, errLogger } = require('../utils');
const { DEPOSIT, WITHDRAWAL, REPAYMENT, INVEST, BORROW } = require('../config/constants').walletTransactionTypes;
const {CREATED, FAILED, SUCCESS} = require('../config/constants').gatewayTransaction.status;
const DataTypes = require('sequelize').DataTypes;
const roundColumns = ['amount'];

const Wallet =  (sequelize) => {
    const Wallet = sequelize.define( "wallet", {
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: sequelize.models.user,
                key: 'id'
            }
        },
        amount: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        },
    }, {
        timestamps: true,
        indexes: [
            {fields: ['userId']}
        ],
        defaultScope: {
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
        },
    })

    Wallet.associate = models => {
        Wallet.belongsTo(models.user, {foreignKey: 'userId', as: 'wallet'});
        Wallet.hasMany(models.walletTransaction, {foreignKey: 'id', as: 'walletTransactions'});
    }

    Wallet.addHook('beforeCreate', function(wallet) {
        Object.keys(wallet).forEach(key => {
            if(roundColumns.includes(key) && wallet[key]) wallet[key] = round(wallet[key], 2);
        });
    });

    Wallet.addHook('beforeUpdate', function(wallet) {
        Object.keys(wallet).forEach(key => {
            if(roundColumns.includes(key) && wallet[key]) wallet[key] = round(wallet[key], 2);
        });
    });
    
    //make a deposit 
    Wallet.prototype.depositMoney = async function(gatewayTransactionId, gatewayResponse = null) {

        let t = await sequelize.transaction();
        try {
            let gatewayTxn = await sequelize.models.gatewayTransaction.findOne({where:{id: gatewayTransactionId}});
            if(!gatewayTxn.id){
                return methodReturn(false, 'Gateway transaction not found');
            }

            //save txn log
            const amount = round(gatewayTxn.amount/100, 2)
            const postTxnBalance = round(this.amount + amount, 2);
            let txnData = {
                type: DEPOSIT,
                amount: amount,
                walletId: this.id,
                postTransactionBalance: postTxnBalance,
                referanceId: gatewayTransactionId,
            };
            let walletTxn = new sequelize.models.walletTransaction(txnData);
            await walletTxn.save();

            //update wallet
            await this.update({amount: postTxnBalance});

            //update gatewat txn
            const verifyAttemptCount = gatewayTxn.verifyAttemptCount + 1;
            gatewayTxn.update({status: SUCCESS, responseJson: gatewayResponse, verifyAttemptCount: verifyAttemptCount});

            await t.commit();
            return methodReturn(true, 'Deposit Has been successful');

        } catch (err) {
            await t.rollback();
            errLogger(err);
            return methodReturn(false, err.message);
        }

        await t.rollback();
        return methodReturn(false, 'Unknown error occured');
    }

    return Wallet;
}
module.exports = Wallet;