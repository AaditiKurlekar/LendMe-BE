const Sentry = require('./config/sentry');

exports.buildRes = function(data) {
    data.success = data.success ?? false;
    return data;
}

exports.errLogger = function (err){
    console.error(err);
    Sentry.captureException(err);
}

exports.round = (num, precision = 2) => {
    return Number(parseFloat(num).toFixed(precision));
}

exports.methodReturn = (status, message, data) => {
    return {
        status: status ?? false,
        message: message ?? null,
        data: data?? null
    };
}