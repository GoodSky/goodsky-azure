/// <reference path="./DefinitelyTyped/node/node.d.ts" />
/// <reference path="./DefinitelyTyped/express/express.d.ts" />
/// <reference path="./DefinitelyTyped/azure-storage/azure-storage.d.ts" />
var fs = require('fs');
var http = require('http');

var express = require('express');
var azure = require('azure-storage');

var app = express();

var home = encodeURI('23216 27th Dr SE Bothell WA 98021');
var work = encodeURI('City Center Bellevue WA 98004');

// set up the azure table connection class
// http://azure.github.io/azure-storage-node/
// https://azure.microsoft.com/en-us/documentation/articles/storage-nodejs-how-to-use-table-storage/
var setupAzureTable = function()
{
    var tableService;
    
    var file = fs.readFileSync('_private/azure.txt');
    if (file)
    {
        var creds = file.toString().split(',');
        var account = creds[0];
        var key = creds[1];
        
        tableService = azure.createTableService(account, key);
    }
    else
    {
        tableService = azure.createTableService();
    }
    
    return tableService;
}

// query bing maps api for traffic times
var queryBing = function(start, end)
{
    
}

// query google maps api for traffic times
var queryGoogle = function(start, end)
{
    
}

// Query the NOAA public weather API to retrieve weather at the zip code
var queryNOAA = function(zip)
{
    var options = {
        host: 'graphical.weather.gov',
        path: '/xml/sample_products/browser_interface/ndfdXMLclient.php?zipCodeList=' + zip + '&product=time-series&begin=2016-02-25T22:00:00&end=2016-02-25T22:15:00&temp=temp&qpf=qpf'
    }
    
    http.get(options, function(res) {
       res.on('data', function(chunk) {
           console.log("data: " + chunk);
       }) 
    }).on('error', function(e) {
        console.log('error: ' + e);
    });
}

// verify server is up
app.get("/ping", function(req, res) {
   console.log('ping');
   res.send('ping'); 
});

// url/trafficmon?direction={towork|tohome}&store=true
app.get("/trafficmon", function(req, res) {
   var direction = req.query.direction;
   var store = req.query.store;
   
   if (!direction || !store)
   {
       res.status(400);
       res.send('malformed request! requires direction and store flag');
       return;
   }
   
   var start;
   var end;
   switch (direction)
   {
       case 'towork':
          start = home;
          end = work;
          break;
       
       case 'tohome':
          start = work;
          end = home;
          break;
          
       default:
          res.status(400);
          res.send('unrecognized direction');
          return;
   }

   console.log('going from ' + start + ' to ' + end + '.');
   
   var tableService = setupAzureTable();
   tableService.deleteTableIfExists("traffictimes", function(error) { if (error) console.log(error); });
   
   queryNOAA('98021');
   
   res.send(200);
});

var port = process.env.PORT || 1337;
app.listen(port);