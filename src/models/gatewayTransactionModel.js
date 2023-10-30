const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { round } = require('../utils');
const DataTypes = require('sequelize').DataTypes;
const {CREATED, FAILED, SUCCESS} = require('../config/constants').gatewayTransaction.status;
const roundColumns = ['amount'];

const gatewayTransaction =  (sequelize) => {
    const gatewayTransaction = sequelize.define( "gatewayTransaction", {
        orderId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(CREATED, FAILED, SUCCESS),
            allowNull:false,
            defaultValue: CREATED
        },
        walletId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: sequelize.models.wallet,
                key: 'id'
            }
        },
        amount: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            allowNull: false,
        },
       requestJson: {
           type: DataTypes.JSON,
           allowNull: false,
       },
       responseJson: {
           type: DataTypes.JSON,
           allowNull: true,
           defaultValue: null
       },
       verifyAttemptCount: {
           type: DataTypes.SMALLINT,
           allowNull: false,
           defaultValue: 0,
           comment: "no of time order upadate fetched from payment gateway",
       }
       
    }, {
        timestamps: true,
        indexes: [
            {fields: ['orderId']},
            {fields: ['status']},
            {fields: ['walletId']}
        ],
        defaultScope: {
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
        },
    })

    gatewayTransaction.associate = models => {
        gatewayTransaction.belongsTo(models.wallet, {foreignKey: 'id', as: 'gatewayTransaction'});
    }

    gatewayTransaction.addHook('beforeCreate', function(gatewayTransaction) {
        Object.keys(gatewayTransaction).forEach(key => {
            if(roundColumns.includes(key) && gatewayTransaction[key]) gatewayTransaction[key] = round(gatewayTransaction[key], 2);
        });
    });

    gatewayTransaction.addHook('beforeUpdate', function(gatewayTransaction) {
        Object.keys(gatewayTransaction).forEach(key => {
            if(roundColumns.includes(key) && gatewayTransaction[key]) gatewayTransaction[key] = round(gatewayTransaction[key], 2);
        });
    });
    
    return gatewayTransaction;
}
module.exports = gatewayTransaction;