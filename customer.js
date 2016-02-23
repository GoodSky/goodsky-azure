"use strict";
var customer;
(function (customer) {
    var Customer = (function () {
        function Customer(arg) {
            if (arg === void 0) { arg = { firstName: "", lastName: "" }; }
            this.firstName = arg.firstName;
            this.lastName = arg.lastName;
        }
        Customer.prototype.fullName = function () {
            return this.lastName + ", " + this.firstName;
        };
        return Customer;
    }());
    customer.Customer = Customer;
})(customer = exports.customer || (exports.customer = {}));
