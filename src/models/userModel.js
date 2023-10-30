const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { encryptData } = require('../lib/encryptionLib');
const DataTypes = require('sequelize').DataTypes;

const User =  (sequelize) => {
    const User = sequelize.define( "user", {
        lastName: {
            type: DataTypes.STRING,
        },
        firstName: {
            type: DataTypes.STRING,
        },
        email: {
            type: DataTypes.STRING,
            unique: true,
            isEmail: true,
            allowNull: false
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        pan: {
            type: DataTypes.STRING,
            allowNull: true
        },
        aadhar: {
            type: DataTypes.STRING,
            allowNull: true
        },
        mobile: {
            type: DataTypes.BIGINT,
            allowNull: true
        },

    }, {
        timestamps: true,
        defaultScope: {
            attributes: {
                exclude: ['password', 'createdAt', 'updatedAt']
            },
            order: [['id', 'DESC']]
         },
         scopes: {
            all: {
                attributes: {}
            }
         }
    })

    User.associate = models => {
        User.hasMany(models.loan , {foreignKey: 'borrowerUserId', as: 'borrowed'});
        User.hasMany(models.loan , {foreignKey: 'lenderUserId', as: 'lent'});
        User.hasOne(models.wallet, {foreignKey: 'userId', as: 'wallet'});
    }
    User.addHook('beforeCreate', async function(user) {
        if (user.password) {
            const salt = bcrypt.genSaltSync(10, 'a');
            user.password = bcrypt.hashSync(user.password, salt);
        }
        if (user.aadhar) {
            user.aadhar = await encryptData(user.aadhar);
        }
        if (user.pan) {
            user.pan = await encryptData(user.pan);
        }
    });

    User.prototype.encryptNewPassword = function (user) {
        if (user.password) {
            const salt = bcrypt.genSaltSync(10, 'a');
            user.password = bcrypt.hashSync(user.password, salt);
        }
    };
    
    //create wallet
    User.addHook('afterCreate', async function(user) {
        new sequelize.models.wallet({balance:0, userId: user.id}).save();
    });
    
    User.prototype.comparePassword = function(pass) {
        return bcrypt.compareSync(pass, this.password);
    }

    User.prototype.generateJWT = function() {
        let payload = {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
        };
        return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '6h'});
    }

    return User;
}
module.exports = User;