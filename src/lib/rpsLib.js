const monthMultiplier = {
    'Monthly' : 1,
    'Quaterly': 3,
};

exports.generateRPS = function(data) {
    let amount = round(parseFloat(data.amount), 2);
    let interestRate = round(parseFloat(data.interestRate), 2);
    let monthlyInterestRate = round(interestRate/12/100, 2);
    let payoutFrequency = data.payoutFrequency;
    let emiStartDate = data.emiStartDate;
    let tenureMonths = data.tenureMonths;
    
    let rps = [];
    let installmentNo = 1;
    let installmentMultiplier = monthMultiplier[payoutFrequency];
    let totalInstallments = tenureMonths / installmentMultiplier;
    let pos = amount;
    let monthlyEmi = round(PMT(monthlyInterestRate, tenureMonths, amount * -1), 2);
    
    while(installmentNo <= totalInstallments) {
        let interest = round(pos * monthlyInterestRate, 2);
        let principal = round(monthlyEmi - interest, 2);

        //last installment, pricipal should be remaining pos
        if(installmentNo == totalInstallments){
            principal = round(pos, 2);
            interest = round(monthlyEmi - principal, 2)
        }else {
            pos -= principal;
        }

        let emiAmount = round(interest + principal, 2);
        let dueDate = new Date(emiStartDate);
        dueDate.setMonth(dueDate.getMonth() + (installmentNo - 1) * installmentMultiplier);
        rps.push({
            installment:    installmentNo,
            dueDate:        dueDate.toISOString().split('T')[0],        
            amount:         emiAmount,
            principal:      principal,
            interest :      interest,
        }) 

        installmentNo++;
    }
    
    return rps;
}

/* 
* Calculate Montly EMI Amount, standard PMT function used in Excel
* rate   - interest rate per month
* nper   - number of periods (months)
* pv   - present value
* fv   - future value
* type - when the payments are due:
*        0: end of the period, e.g. end of month (default)
*        1: beginning of period
*/
const PMT = (rate, nper, pv, fv, type) => {

    let pmt, pvif;

    fv || (fv = 0);
    type || (type = 0);

    if (rate === 0)
      return -(pv + fv) / nper;

    pvif = Math.pow(1 + rate, nper);
    pmt = - rate * (pv * pvif + fv) / (pvif - 1);

    if (type === 1)
      pmt /= (1 + rate);
    return pmt;
}

const round = (num, precision = 2) => {
    return Number(parseFloat(num).toFixed(precision))
}