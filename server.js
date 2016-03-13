/// <reference path="./DefinitelyTyped/node/node.d.ts" />
/// <reference path="./DefinitelyTyped/express/express.d.ts" />
/// <reference path="./utils.ts" />
var q = require('q');
var fs = require('fs');
var http = require('http');
var express = require('express');
var azure = require('azure-storage');
var settings = require('mobileservice-config').appSettings;
var utils = require('./utils');
var app = express();
var home = encodeURI('23216 27th Dr SE Bothell WA 98021');
var work = encodeURI('City Center Bellevue WA');
// set up the azure table connection class
// http://azure.github.io/azure-storage-node/
// https://azure.microsoft.com/en-us/documentation/articles/storage-nodejs-how-to-use-table-storage/
var setupAzureTable = function () {
    var tableService;
    var file = fs.readFileSync('_private/azure.txt');
    if (file) {
        var creds = file.toString().split(',');
        var account = creds[0];
        var key = creds[1];
        tableService = azure.createTableService(account, key);
    }
    else {
        tableService = azure.createTableService();
    }
    return tableService;
};
// query bing maps api for traffic times
var queryBing = function (start, end, result) {
    var deferred = q.defer();
    var bingKey = fs.readFileSync('_private/bing.txt');
    if (!bingKey) {
        bingKey = settings.BING_KEY;
        if (!bingKey) {
            console.log("COULD NOT READ BING KEY");
        }
    }
    var options = {
        host: 'dev.virtualearth.net',
        path: `/REST/V1/Routes/Driving?wp.0=${start}&wp.1=${end}&key=${bingKey}`
    };
    var aggregatedData = "";
    http.get(options, function (res) {
        res.on('data', (chunk) => {
            aggregatedData += chunk;
        });
        res.on('end', () => {
            result.data = aggregatedData;
            deferred.resolve();
        });
    }).on('error', function (e) {
        console.log('error: ' + e);
        deferred.reject(e);
    });
    return deferred.promise;
};
// query google maps api for traffic times
var queryGoogle = function (start, end, result) {
    var deferred = q.defer();
    var googleKey = fs.readFileSync('_private/google.txt');
    if (!googleKey) {
        googleKey = settings.GOOGLE_KEY;
        if (!googleKey) {
            console.log("COULD NOT READ GOOGLE KEY");
        }
    }
    var options = {
        host: 'maps.googleapis.com',
        path: `/maps/api/directions/json?origin=${start}&destination=${end}&key=${googleKey}`
    };
    var aggregatedData = "";
    http.get(options, function (res) {
        res.on('data', (chunk) => {
            aggregatedData += chunk;
        });
        res.on('end', () => {
            result.data = aggregatedData;
            deferred.resolve();
        });
    }).on('error', function (e) {
        console.log('error: ' + e);
        deferred.reject(e);
    });
    return deferred.promise;
};
// Query the NOAA public weather API to retrieve weather at the zip code
// http://graphical.weather.gov/xml/rest.php#use_it
var queryNOAA = function (zip, begin, end, result) {
    //    var result = { data: "" };
    //    queryNOAA('98021', utils.Utils.getDateString(5), utils.Utils.getDateString(), result)
    //         .then(() => {
    //                 console.log(`Got Result: ${result.data}`);
    //                 res.send(200);
    //             });
    var deferred = q.defer();
    var options = {
        host: 'graphical.weather.gov',
        path: '/xml/sample_products/browser_interface/ndfdXMLclient.php?zipCodeList=' + zip + '&product=time-series&begin=' + begin + '&end=' + end + '&temp=temp&qpf=qpf'
    };
    var aggregatedData = "";
    http.get(options, function (res) {
        res.on('data', (chunk) => {
            aggregatedData += chunk;
        });
        res.on('end', () => {
            result.data = aggregatedData;
            deferred.resolve();
        });
    }).on('error', function (e) {
        console.log('error: ' + e);
        deferred.reject(e);
    });
    return deferred.promise;
};
// * * * * * * * * * * * * * * * * * * * * * * * * 
// URI: /ping
// ping the service to make sure it is up
// * * * * * * * * * * * * * * * * * * * * * * * * 
app.get("/ping", function (req, res) {
    console.log('ping');
    res.send('ping');
});
// * * * * * * * * * * * * * * * * * * * * * * * * 
// URI: /trafficmon?direction={towork|tohome}&store=true
// execute the traffic monitor service
//    1) query bing traffic API
//    2) query google traffic API
//    3) query NOAA public weather API
// store query results to azure table
// * * * * * * * * * * * * * * * * * * * * * * * * 
app.get("/trafficmon", function (req, res) {
    var direction = req.query.direction;
    var store = req.query.store;
    if (!direction || !store) {
        res.status(400);
        res.send('malformed request! requires direction and store flag');
        return;
    }
    var start;
    var end;
    switch (direction) {
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
    // this try-catch is a terrible way to debug...
    try {
        var bingResult = { data: "" };
        queryBing(start, end, bingResult)
            .then(() => {
            var obj = JSON.parse(bingResult.data);
            var resources = obj.resourceSets[0].resources[0];
            var distanceKm = resources.travelDistance;
            var distanceMi = distanceKm * 0.62137119;
            var estimateSec = resources.travelDuration;
            var estimateMin = estimateSec / 60.0;
            var estimateTrafficSec = resources.travelDurationTraffic;
            var estimateTrafficMin = estimateTrafficSec / 60.0;
            console.log(`distance: ${distanceKm} Km (${distanceMi} Miles)`);
            console.log(`time without traffic: ${estimateSec} Secs (${estimateMin} Mins)`);
            console.log(`time with traffic: ${estimateTrafficSec} Secs (${estimateTrafficMin} Mins)`);
            var trafficRow = {
                PartitionKey: { '_': utils.Utils.getCurrentDate() },
                RowKey: { '_': utils.Utils.getFullDateString() },
                distance: { '_': `${distanceMi}` },
                time: { '_': `${estimateMin}` },
                trafficTime: { '_': `${estimateTrafficMin}` }
            };
            // Store in Azure Table
            var tableService = setupAzureTable();
            tableService.createTableIfNotExists("traffictimes", function (error) {
                if (error) {
                    console.log(error);
                }
                tableService.insertEntity("traffictimes", trafficRow, function (error, result, response) {
                    console.log("Azure Table Result: " + result);
                    console.log("Azure Table Response: " + response);
                    if (error) {
                        console.log("Azure Table Error: " + error);
                        res.send(500);
                    }
                    res.send(200);
                });
            });
        })
            .catch((error) => {
            console.log(`Q sequence caught error ${error}`);
            res.send(500);
        });
    }
    catch (err) {
        res.send(err);
    }
});
// * * * * * * * * * * * * * * * * * * * * * * * * 
// Start running Express node.js application
var port = process.env.PORT || 1337;
app.listen(port);
