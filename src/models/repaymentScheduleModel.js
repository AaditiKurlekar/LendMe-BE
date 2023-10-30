const DataTypes = require('sequelize').DataTypes;

const repaymentSchedule =  (sequelize) => {
    const repaymentSchedule = sequelize.define( "repaymentSchedule", {
        loanId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: sequelize.models.loan, 
                key: 'id'
            }
        },
        installment: {
            type: DataTypes.SMALLINT,
            allowNull: false,
        },
        dueDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        amount: {
            type: DataTypes.FLOAT.UNSIGNED,
            allowNull: false,
        },
        principal: {
            type: DataTypes.FLOAT.UNSIGNED,
            allowNull: false,
        },
        interest: {
            type: DataTypes.FLOAT.UNSIGNED,
            allowNull: false,
        },
        paymentDate : {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        isPaid: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
    }, {
        timestamps: true,
        indexes: [
            {
                fields: ['loanId'],
            },
            {
                fields: ['isPaid'],
            },
            {
                fields: ['dueDate'],
            },
        ],
        defaultScope: {
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
        },
    })
    
    repaymentSchedule.associate = function(models) {
        repaymentSchedule.belongsTo(models.loan, {foreignKey: 'loanId', as: 'rps'})
    };

    return repaymentSchedule;
}

module.exports = repaymentSchedule;
