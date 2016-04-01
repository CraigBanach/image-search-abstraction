'use strict';

require('dotenv').config();
var express = require('express');
var Search = require("bing.search");
var MongoClient = require('mongodb').MongoClient;

var app = express();
var search = new Search(process.env.BING_KEY);

app.get("/*", function(request, response) {
	
	var queryString = request.params[0];
	
	if (queryString === "") {
		
		// display most recent searches
		MongoClient.connect("mongodb://localhost:27017/image_search", function(err, db) {
			
			if (err) throw err;
			
			var collection = db.collection("searches");
			collection.find().sort({_id: -1}).limit(10).toArray( function(err, docs) {
				if (err) throw err;
				response.end(JSON.stringify(docs));
			})
		});
	} else {
		
		var offset = 0;
		
		if (Object.keys(request.query).length !== 0) {
			offset = request.query["offset"];
		}
		
		bingSearch(queryString, Number(offset)).then(function(results) {
			
			// add results to db
			MongoClient.connect("mongodb://localhost:27017/image_search", function(err, db) {
				
				if (err) throw err;
				
				let search = {
					term: queryString,
					when: new Date().toDateString()
				}
				console.log(search);
				var collection = db.collection("searches");
				collection.insert(search);
				db.close();
			});
			
			let output = results.map(function(result) {
				return {
					URL: result.url,
					alt_text: result.title,
					page_url: result.sourceUrl
				};
			});
			console.log(output);
			response.end(JSON.stringify(output));
		});
	}

});
function bingSearch(query, offset) {

	var options = {
		top: 10,
		skip: offset * 10
	};

	return new Promise(function (resolve, reject) {

		search.images(query, options, function (err, results) {
			
			if (err) {
				console.log(err);
				reject(err);
			} else {
				resolve(results);
			}
		});
	});
}

var port = process.env.PORT || 8080;
app.listen(port,  function () {
	console.log('Node.js listening on port ' + port + '...');
});