"use strict";
/// <reference path="./DefinitelyTyped/node/node.d.ts" />
/// <reference path="./DefinitelyTyped/express/express.d.ts" />
/// <reference path="./customer.ts" />
var express = require('express');
var crm = require('./customer');
var app = express();
app.get("/customer/:id", function (req, resp) {
    var customerId = req.params.id;
    var c = new crm.customer.Customer({ firstName: "Max" + customerId.toString(), lastName: "Muster" });
    console.log(c.fullName());
    resp.send(JSON.stringify(c));
});
app.get("/customer", function (req, resp) {
    var customers;
    customers = new Array();
    for (var i = 0; i < 10; ++i) {
        customers.push(new crm.customer.Customer({ firstName: "Max" + i.toString(), lastName: "Muster" }));
    }
    resp.send(JSON.stringify(customers));
});
var port = process.env.PORT || 1337;
app.listen(port);
