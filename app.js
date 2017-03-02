/**
 * @purpose : get data from randomuser.me REST API and process to calculate user statistics like 
 * user M/F percentage, age group, top postal codes  
 * 
 * Module dependencies.
 *  - express
 *  - node-rest-client
 * To run - node app.js
 * Put the count at last in URI like (By default it will take 3500)- 
 *  - http://localhost:3000/
 *  - http://localhost:3000/nodeapi/user-stats?count=3500
 *  - http://localhost:3000/nodeapi/user-stats?count=4
 *  - http://localhost:3000/nodeapi/user-stats?count=ten
 */
 
'use strict';
var app = require('express')();
var fs = require("fs");
//var JSONStream = require('JSONStream');

/**
 * @purpose : to process routing request starts with /nodeapi/user-stats
 * @param : request, response object
 * @return : JSON object with user statistic 
 */
app.get('/nodeapi/user-stats*', function(req, res){
	var count = 3500;
   var query = require('url').parse(req.url,true).query; /** get query string from url */
   if(query && query.count ) count = query.count;  /** get users count */
   var Client = require('node-rest-client').Client;
   var client = new Client();
   console.time("executionTime");
   var num = parseInt(count);
   if( num.toString() == 'NaN'){ count = 3500; }; /** check count is number or string  */
   
   client.get("https://randomuser.me/api/?results="+count+"&nat=us", function (userData, response) {
    	 fs.writeFile('dataFromRestAPI.txt', JSON.stringify(userData)); /** store users object on file*/
      
   	 userDataProcessor(userData, function(error, finalUserData){  /** call API to process users data */   	
           if(finalUserData){
               res.write(JSON.stringify(finalUserData)); /** send final object to browser */
               fs.writeFile('result.txt', JSON.stringify(finalUserData)); /** store result on file */           
           }else{
           	   res.write('something went wrong on the request');
           } 
           res.end();
           console.timeEnd("executionTime");
       });
   }).on('error', function (err) {
       console.log('in app.js : /nodeapi/user-stats get() : Error - ', err.request.options);
       res.write('something went wrong on the request');
       res.end();
   });
});

/**
 * @purpose : to process default routing request
 * @param : request, response object
 * @return : hyper-link of user-stats 
 */
app.get('/*', function(req, res){
   res.writeHead(200,{"inputtype":"text/html"});
   res.write('<a href = "http://localhost:3000/nodeapi/user-stats">Go to user-status page</a>');
   res.end();
});
app.listen(3000);

/**
 * @purpose : to process all user objects from rest api
 * @param : all users data object
 * @return : JSON object of user statistics  
 */
var userDataProcessor = function(userData, iUserDataProcessorCB){
	
   try{
       userPercentageCalculator(userData, function(error, sexDistributionObject){      	
      	  if(sexDistributionObject){
      		   userAgeGrouper(sexDistributionObject.ageArray, function(error, ageGroupObject){
      			    if(ageGroupObject){
      				     topPostalcodeFinder(sexDistributionObject.locationsObject, function(error, topPostalcodesObject){
      					      if(topPostalcodesObject){
      						       var usersProcessedDataObject = { "status": "success"};
      						       usersProcessedDataObject.userCount = userData.results.length;
      						       usersProcessedDataObject.sexDistribution = sexDistributionObject.sexDistribution;
      						       usersProcessedDataObject.ageDistribution = ageGroupObject;
      						       usersProcessedDataObject.topLocation = topPostalcodesObject;
      						
      						       if(iUserDataProcessorCB) iUserDataProcessorCB(null,usersProcessedDataObject);
      					      }else{ if(iUserDataProcessorCB) iUserDataProcessorCB("Error ", null); }            
                       });
      			    }else{ if(iUserDataProcessorCB) iUserDataProcessorCB("Error ", null); }          
               });
      	  }else{ if(iUserDataProcessorCB) iUserDataProcessorCB("Error ", null); }
       });      
   } catch(error){
      console.error("in app.js : userDataProcessor() : Error - "+error);
      if(iUserDataProcessorCB) iUserDataProcessorCB(error, null);
   }
};

/**
 * @purpose : calculate the male-female percentage 
 * @param : all users data object
 * @return : JSON object of users percentage  
 */
var userPercentageCalculator = function(userData, iUserPercentageCalculatorCB){

   try{
   	 if(userData){
   		  var sexDistributionObject = {};
   	     var usersArray = userData.results;
   		  var male=0, female=0;
           var ageArray = new Array();
           var locationsObject = {};
           for(var i=0; i < usersArray.length; i++ ){
         	
               if(usersArray[i].gender == 'male'){
                   male++;
               }else{
                   female++;
               }
               if(usersArray[i].dob) ageArray.push(2016 - usersArray[i].dob.substring(0,4));
               if(usersArray[i].location && usersArray[i].location.postcode ){
            	
                   if(locationsObject[usersArray[i].location.postcode]) { /** if postal code was already present then increment count */
                       locationsObject[usersArray[i].location.postcode] = locationsObject[usersArray[i].location.postcode] + 1 ; 
                   }else{ /** else make new entry of postal code */
                       locationsObject[usersArray[i].location.postcode] = 1;          
                   }
               }           
           }
           var sexDistribution = {};
           sexDistribution.male = Math.round((male/usersArray.length)*100);/** calculate the male percentage */
           sexDistribution.female = Math.round((female/usersArray.length)*100); /** calculate the female percentage */
         
           sexDistributionObject.sexDistribution = sexDistribution;
           sexDistributionObject.ageArray = ageArray;
           sexDistributionObject.locationsObject = locationsObject;
         
           if(iUserPercentageCalculatorCB) iUserPercentageCalculatorCB(null,sexDistributionObject);   		
   	 }else{
   		  if(iUserPercentageCalculatorCB) iUserPercentageCalculatorCB("in app.js : userDataProcessor() Error-userData is null ",null);
   	 }
   }catch(error){
       console.error("in app.js : userPercentageCalculator() : Error - "+error);
       if(iUserPercentageCalculatorCB) iUserPercentageCalculatorCB(error, null);
   }
};

/**
 * @purpose : group all users by age
 * @param : array all users age
 * @return : JSON object of user age groups  
 */
var userAgeGrouper = function(ageArray, iUserAgeGrouperCB){
	
   try{
  	    if(ageArray.length > 0){
  		     var ageDistribution = { "A": 0, "B": 0, "C": 0, "D": 0  };
  		
           for (var j=0; j<ageArray.length; j++ ) {
      	
               if(ageArray[j] > 0 && ageArray[j] <= 15) {
    	             ageDistribution.A = ageDistribution.A +1;
               }else if (ageArray[j] > 15 && ageArray[j] <= 30) {
    	             ageDistribution.B = ageDistribution.B +1;
               }else if (ageArray[j] > 30 && ageArray[j] <= 60) {
    	             ageDistribution.C = ageDistribution.C +1;
               }else{
    	             ageDistribution.D = ageDistribution.D +1;
               }
           }
           if(iUserAgeGrouperCB) iUserAgeGrouperCB(null, ageDistribution);
  	    } else {
  	    if(iUserAgeGrouperCB) iUserAgeGrouperCB("in app.js : userAgeGrouper() : Error -  ageArray is empty ",null);
  	   }  	
   }catch (error) {
  	    console.error("in app.js : userAgeGrouper() : Error - "+error);
       if(iUserAgeGrouperCB) iUserAgeGrouperCB(error, null);
   }
}

/**
 * @purpose : find top 5 postal codes
 * @param : all users location object
 * @return : JSON object of top 5 postal codes with number   
 */
var topPostalcodeFinder = function(locationsObject, iTopPostalcodeFinderCB){
	
   try{
  	    if(locationsObject!= null){
  		     var topLocation= {};
  		     var locationArray = new Array();  		
  		     var keys = Object.keys(locationsObject); /** get JSON array of unique postal codes */
  		
           for(var k=0; k<keys.length; k++){
      	      locationArray.push([locationsObject[keys[k]],keys[k] ]);  /** push postal code with its count like [3, '415110'] */
           }            
           locationArray = locationArray.sort(); /** sort array on postal code count */
           var length = locationArray.length;
           var arraySize = length > 5 ? 5 : length; /** if locationArray size is less than 5 then take arraySize size = length*/
           
           for(var l =1; l<= arraySize; l++ ){ /** get bottom 5 entries from JSON array */
				   topLocation[locationArray[length-l][1]]= locationArray[length-l][0];           
           }                 
           if(iTopPostalcodeFinderCB) iTopPostalcodeFinderCB(null, topLocation);
  	    } else {
  	        if(iTopPostalcodeFinderCB) iTopPostalcodeFinderCB("in app.js : topPostalcodeFinder() : Error - locationArray is empty ",null);
  	    }  	
   }catch (error) {
  	    console.error("in app.js : topPostalcodeFinder() : Error - "+error);
       if(iTopPostalcodeFinderCB) iTopPostalcodeFinderCB(error, null);
   }
}