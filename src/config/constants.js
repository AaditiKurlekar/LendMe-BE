exports.loanStatus = {
    REQUESTED: 'REQUESTED',
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
    EXPIRED: 'EXPIRED',
    DISABLED: 'DISABLED',
}

exports.walletTransactionTypes = {
    DEPOSIT: 'DEPOSIT',
    WITHDRAWAL: 'WITHDRAWAL',
    REPAYMENT: 'REPAYMENT',
    INVEST: 'INVEST',
    BORROW: 'BORROW',
    INCOME: 'INCOME',
}

exports.gatewayTransaction = {
    status: {
        CREATED: 'CREATED',
        FAILED: 'FAILED',
        SUCCESS: 'SUCCESS',
    }
}

exports.razorpay = {
    maxVerifyAttemptCount: 5, //no of time order update should be fetched from gateway
}