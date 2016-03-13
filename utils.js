"use strict";
var Utils;
(function (Utils) {
    // Gets the time string in the format YYYY-mm-dd
    function getCurrentDate() {
        var date = new Date();
        var year = date.getUTCFullYear();
        var month = padZeros(date.getUTCMonth(), 2);
        var day = padZeros(date.getUTCDate(), 2);
        return year + '-' + month + '-' + day;
    }
    Utils.getCurrentDate = getCurrentDate;
    // Gets the time string in the format YYYY-mm-ddThh:MM
    // the parameter minusMinutes subtracts that many minutes from the current time
    function getFullDateString(minusMinutes) {
        var date = new Date();
        if (minusMinutes != undefined && minusMinutes != 0) {
            var n = date.getTime();
            date = new Date(n - (minusMinutes * 60 * 1000));
        }
        var year = date.getUTCFullYear();
        var month = padZeros(date.getUTCMonth(), 2);
        var day = padZeros(date.getUTCDate(), 2);
        var hour = padZeros(date.getUTCHours(), 2);
        var minute = padZeros(date.getUTCMinutes(), 2);
        return year + '-' + month + '-' + day + 'T' + hour + ':' + minute;
    }
    Utils.getFullDateString = getFullDateString;
    // Pad zeros to the beginning of a number. Returns a string.
    // example: num = 7, pad = 3: returns 007
    function padZeros(num, length) {
        var s = '' + num;
        while (s.length < length) {
            s = '0' + s;
        }
        return s;
    }
})(Utils = exports.Utils || (exports.Utils = {}));
