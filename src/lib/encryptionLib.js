const crypto = require('crypto');
const encryption = require('../config/encryption');

const { secret_key, secret_iv} = encryption

const ecnryption_method = 'aes-256-cbc';
if (!secret_key || !secret_iv) {
  throw new Error('secretKey, secretIV are required')
}
if(!ecnryption_method){
    throw new Error('ecnryptionMethod are required')
}

// Generate secret hash with crypto to use for encryption
const key = crypto
  .createHash('sha512')
  .update(secret_key)
  .digest('hex')
  .substring(0, 32)
const encryptionIV = crypto
  .createHash('sha512')
  .update(secret_iv)
  .digest('hex')
  .substring(0, 16)

// Encrypt data
exports.encryptData = async function(data) {
  const cipher = crypto.createCipheriv(ecnryption_method, key, encryptionIV)
  return Buffer.from(
    cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
  ).toString('base64') // Encrypts data and converts to hex and base64
}

// Decrypt data
exports.decryptData = async function(encryptedData) {
  const buff = Buffer.from(encryptedData, 'base64')
  const decipher = crypto.createDecipheriv(ecnryption_method, key, encryptionIV)
  return (
    decipher.update(buff.toString('utf8'), 'hex', 'utf8') +
    decipher.final('utf8')
  ) // Decrypts data and converts to utf8
}