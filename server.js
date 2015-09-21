var http = require('http');
var geocoder = require('geocoder');
var Parse = require('parse/node').Parse;
var Q = require('q');

Parse.initialize('nxkxfDhpFQBXOReTPFIPhGIaYowmT5uuscj3w3Kb'
  , 'R9euE24i4CNDknBOLb8ugPCmufnRa1oGazRzZAgp');

var tempTableName = process.argv[2];

var ParseObjectSTG = Parse.Object.extend(tempTableName);
var ParseObjectPRD = Parse.Object.extend('RealTime');
var countSource = 0, countSTGRecordSuccess = 0, countSTGRecordError = 0;

Q.fcall(deleteRecords(tempTableName, function(response){
      console.log(response);
      httpService();
}))
 .then(setTimeout(function() {
                cloneRecord();
              }, 330000))
 .catch(function(error){
    console.log('error = ' + error);
 })
 .done();



function deleteRecords(objectName, callback) {

  var query = new Parse.Query(objectName);
    query.limit(1000); 
    query.find().then(function(results) {
        return Parse.Object.destroyAll(results);
    }).then(function() {        
        //console.log('Step1: deleteRecords is done');
        return callback('Step1: deleteRecords is done');
    }, function(error) {        
        //console.log('Step1: Error in delete query');
        return callback('Step1: Error in delete query');
    });

}


function cloneRecord() {
  
  deleteRecords('RealTime', function(response){
      console.log(response);
      var parseObjSTG = new ParseObjectSTG();
      var parseObjPRD = new ParseObjectPRD();

      var query = new Parse.Query(parseObjSTG);
      query.limit(1000); 

      query.find({
      success: function(results) {

        for (var i = 0; i < results.length; i++) {

          var parseObjPRD = new ParseObjectPRD();
          
          parseObjPRD.set('lineid', results[i].get('lineid'));
          parseObjPRD.set('carno', results[i].get('carno'));
          parseObjPRD.set('cartime', results[i].get('cartime'));
          parseObjPRD.set('address', results[i].get('address'));
          parseObjPRD.set('location', results[i].get('location'));
          parseObjPRD.save(null, {
              success: function(parseObjPRD) {
                // Execute any logic that should take place after the object is saved.
                //console.log('New object created');
                //console.log('New object created with objectId: ' + parseObjPRD.id);
              },
              error: function(parseObjPRD, error) {
                // Execute any logic that should take place if the save fails.
                // error is a Parse.Error with an error code and message.
                console.log('Failed to create new object, with error code: ' + error.message);
              }
            });

        }

        console.log('Step3: cloneRecord is done');
      },
      error: function(error) {
        console.log("Error: " + error.code + " " + error.message);
      }
      });

  });
  

}



var jsonObj;


function httpService() {

  var options = {
    host: 'data.ntpc.gov.tw',
    path: '/od/data/api/28AB4122-60E1-4065-98E5-ABCCB69AACA6?$format=json'
  };

  callback = function(response) {
    var str = '';

    response.on('data', function (chunk) {
      str += chunk;
    });

    response.on('end', function () {

      jsonObj = JSON.parse(str);

      delayLooping(jsonObj);

    });
  }

  http.request(options, callback).end();

}


function delayLooping(jsonObj) {
  
  var timeout = 0;

  console.log('count = ' + jsonObj.length);

  for (var i = 0; i < jsonObj.length; i++) {

      (function(i) {
              setTimeout(function() {
                //console.log(i);
                geoCoding(jsonObj[i]);
              }, timeout);
              timeout += 1000;
      })(i);

  }


}

function geoCoding(obj) {

      geocoder.geocode(obj.location, function (err, data) {

        if (err) throw err;
        
        var parseObj = new ParseObjectSTG();

        parseObj.set('lineid', obj.lineid);
        parseObj.set('carno', obj.car);
        parseObj.set('cartime', obj.time);
        parseObj.set('address', obj.location);

        var lat = 0;
        var lng = 0;
        if (data.status == 'OK') {
            lat = data.results[0].geometry.location.lat;
            lng = data.results[0].geometry.location.lng;
        }

        var point = new Parse.GeoPoint({latitude: lat, longitude: lng});
        parseObj.set('location', point);

        parseObj.save(null, {
          success: function(parseObj) {
            // Execute any logic that should take place after the object is saved.
            //console.log('New object created with objectId: ' + parseObj.id);
            //countSTGRecordSuccess = countSTGRecordSuccess + 1;
            //return callback('success');
          },
          error: function(parseObj, error) {
            // Execute any logic that should take place if the save fails.
            // error is a Parse.Error with an error code and message.
            console.log('Failed to create new object, with error code: ' + error.message);
            //countSTGRecordError = countSTGRecordError + 1;
            //return callback('error');
          }
        });

      });

}