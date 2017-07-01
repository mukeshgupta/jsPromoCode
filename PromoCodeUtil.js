'use strict';
var couponCodeSrc = require('./prodPromoMapping');
var couponCodeProto = function couponCodeProto(inputCode, codesListDict, prodsBought, prodFutureDateInYMD) {
  // single promo code  
  this.inputCode = inputCode;
  /* json dictionary of mapping between promocodes and valid products with corresponding rules
  dictionary key = promo code name
  */
  this.codesListDict = codesListDict;
  
  /*object to store result of promo on bought products*/
  this.result = {
    valid: false,
    message: '',
    error: ''
  };
  /* those products which are bought*/
  this.products = prodsBought;
  /*calculated discount with provided promocode*/
  this.discountAmt = 0.0;

  this.prodFutureDate = prodFutureDateInYMD;

  if (typeof this.init !== 'function') {
    couponCodeProto.prototype.init = function() {
      //console.log("<START>init couponCodeProto");
      if (!!this.inputCode === false) {
        this.result.valid = false;
        this.result.message = 'Please input promo code.';
        this.result.error = 'BLANK_PROMO_CODE';
        this.result.promoCode =  undefined;
      } else if (!!this.codesListDict === false || Object.keys(this.codesListDict).length === 0) {
        this.result.valid = false;
        this.result.message = 'No promo codes are available.';
        this.result.error = 'NO_PROMOS';
        this.result.promoCode = this.inputCode;
      } else if (!!this.products === false || this.products.length === 0) {
        this.result.valid = false;
        this.result.message = 'No products are selected.';
        this.result.error = 'NO_PRODS';
        this.result.promoCode = this.inputCode;
      } else if (!!this.prodFutureDate === false && new Date(this.prodFutureDate)) {
        // code to check mandatory condition on prodFutureDate if any
      } else {
        this.result.valid = true;
        this.result.message = 'valid';
        this.result.error = '';
        this.result.promoCode = this.inputCode;
      }
      //console.log("<END>init couponCodeProto");
    };
  }
  if (typeof this.isCodeActive !== 'function') {
    couponCodeProto.prototype.isCodeActive = function() {
      //console.log("<START>isCodeActive");
      this.result.valid = isCodeActive(this.inputCode, this.codesListDict, this.prodFutureDate);
      this.result.message = this.result.valid ? 'Code is active' : 'Code is expired.';
      this.result.error = this.result.valid ? undefined : 'EXPIRED_PROMO_CODE';
      this.result.promoCode = this.inputCode;
     // console.log("<END>isCodeActive");
    };
  }

  if (typeof this.validateAgainstProduct !== 'function') {
    couponCodeProto.prototype.validateAgainstProduct = function() {
      console.log('<START>validateAgainstProduct');
      console.time('validateAgainstProduct');
      var prodsBoughtCount = this.products.length;
      var validProducts = this.codesListDict[this.inputCode].products;
      //currently rule is at promo code level, can be possible to make it on product level
      var rule = this.codesListDict[this.inputCode].rule;
      var validProdCount = validProducts.length;
      this.discountAmt = 0.00;
      var totalProdsBought = 0;
      var checkForException = false;
      for (var i = 0; i < prodsBoughtCount; i++) {
        for (var x = 0; x < validProdCount; x++) {
          //console.log("validProducts[x].product_id["+validProducts[x].product_id+']');
          //console.log("this.products[i].product_id["+this.products[i].product_id+']');
          if (parseInt(validProducts[x].product_id) === parseInt(this.products[i].product_id)) {
            // check for rules validation
            this.discountAmt += calDiscountAmt(parseFloat(this.products[i].cost_per), parseFloat(validProducts[x].discount), parseInt(this.products[i].quantity));
            //console.log('this.discountAmt['+this.discountAmt+']');
            if (validProducts[x].includeInMinQtyCal) {
              totalProdsBought += parseInt(this.products[i].quantity);  
            } else {
              checkForException = true;
            }
            //console.log('totalProdsBought['+totalProdsBought+'],discountAmt['+this.discountAmt+']');
          } //if -end
        } // for -2 -end
      } // for -1 -end
      this.discountAmt = this.discountAmt.toFixed(2);
      this.result.valid = !(parseFloat(this.discountAmt) <= 0);
      this.result.message = parseFloat(this.discountAmt) <= 0 ? 'Code is not applicable on products bought.' : undefined;
      this.result.error = parseFloat(this.discountAmt) <= 0 ? 'NOT_APPLICABLE_PROMO_CODE' : undefined;
      this.result.promoCode = this.inputCode;
      if (this.result.promoCode === 'FNF15') {
        this.result.promoCode = 'FNF10';
      }
      //rule validation - min qty
      if (this.result.valid) {
        // if- start -1
        //console.log("rule.minQtyExcl[" + rule.minQtyExcl + "]");
        //console.log("totalProdsBought[" + totalProdsBought + "]");
        if (!!rule.minQtyExcl) {
          if (parseInt(rule.minQtyExcl) < totalProdsBought) {
            //console.log('Min qty rule passed');
          } else {
            //console.log('Min qty rule unpassed.');
            this.discountAmt = 0.00;
            this.result.valid = false;
            this.result.message = 'Applicable only on products bought for more than ' + rule.minQtyExcl;
            if (checkForException) {
              this.result.message += ' Not applicable.';
            }
            this.result.error = 'MIN_QTY_ERROR';
          }
        }
      } // if- end -1
      // prior days product purchase
      if (this.result.valid) {
        // if- start -2
        //console.log("rule.prior_purchase_days[" + rule.prior_purchase_days + "]");
        //console.log("date of purchase today [" + new Date() + "]");
        if (!!rule.prior_purchase_days) {
          var second = new Date(this.prodFutureDate);
          var first = new Date(); 
          var daysDiff = Math.round((second-first)/(1000*60*60*24));
          //console.log('prodFutureDate['+this.prodFutureDate+'],PriorDays['+daysDiff+'],promo prior days['+rule.prior_purchase_days+']');
          if (daysDiff >= parseInt(rule.prior_purchase_days)) {
            //console.log('prior_purchase_days passed');
          } else {
            //console.log('prior_purchase_days unpassed.');
            this.discountAmt = 0.00;
            this.result.valid = false;
            this.result.message = 'Purchase to be made ' + rule.prior_purchase_days + ' Days prior the future date.';
            this.result.error = 'PRIOR_DAYS_BOOK_ERROR';
          }
        }
      } // if- end -2 

      //console.log('<END>validateAgainstProduct');
      //console.timeEnd('validateAgainstProduct');
    }; // func end
  }
};

function checkCodeRules(ruleObj, ticketObj) {}

function calDiscountAmt(rate, discPer, qty) {
  var value = (rate * (discPer / 100) * qty).toFixed(2);
  return +value;
}

function isCodeActive(code, codesListDict, prodFutureDate) {
  var isCodeAvailable = codesListDict.hasOwnProperty(code);
  if (isCodeAvailable && codesListDict[code].rule.hasOwnProperty('expiryDate')) {
    var second = new Date(codesListDict[code].rule.expiryDate);
    var first = new Date(prodFutureDate);
    var daysDiff = Math.round((second-first)/(1000*60*60*24));
    return (daysDiff >= 0)
  } else {
    return isCodeAvailable;  
  }
}

var applyPromoRecursion = function(data_promocode, prodsBought, source, prodFutureDate) {
  var applyCurrentPromo = false;
  var newCodeResultObj = new couponCodeProto(data_promocode, couponCodeSrc[source], prodsBought, prodFutureDate);
  newCodeResultObj.init();
  applyCurrentPromo = newCodeResultObj.result.valid;
  if (applyCurrentPromo) {
    newCodeResultObj.isCodeActive();
    applyCurrentPromo = newCodeResultObj.result.valid;
    if (applyCurrentPromo) {
      newCodeResultObj.validateAgainstProduct();
      applyCurrentPromo = newCodeResultObj.result.valid;
      if (applyCurrentPromo) {
        return {codeApplied: true, discountAmt: newCodeResultObj.discountAmt, result: newCodeResultObj.result};
      }
    }
  }
      
  if (!applyCurrentPromo) {
    return {codeApplied: false, discountAmt: 0.0, result: newCodeResultObj.result};
  }
}

// source -> string value can indicate source of purchase
// resolveFunc -> callback function 
function applyPromoCode(data_promocode, prodsBought, source, prodFutureDate, resolveFunc) {
    var promoResult = applyPromoRecursion(data_promocode, prodsBought, source, prodFutureDate);
    if (promoResult.codeApplied) {
      resolveFunc(promoResult.discountAmt);
    } else {
       resolveFunc(promoResult.result);
    }
}

function dateCompare(xInYMD, yInYMD) {
  // new Date(2017,4,23).getTime() >= new Date(2017,4,24).getTime()
  if (xInYMD) {
    var xDateObj = new Date(xInYMD);
    var xDate = xDateObj.getDate();
    var xMonth = xDateObj.getMonth(); // 0 based
    var xYear = xDateObj.getFullYear();
  }

  if (yInYMD) {
    var yDateObj = new Date(yInYMD);
    var yDate = yDateObj.getDate();
    var yMonth = yDateObj.getMonth(); // 0 based
    var yYear = yDateObj.getFullYear();
  }
}

module.exports = {
  applyPromoCode: applyPromoCode
};