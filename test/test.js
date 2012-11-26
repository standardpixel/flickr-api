var should     = require("should"),
    FlickrAPI  = require('../flickr_api.js'),
	flickr_api;

describe('Making sure the Flickr API', function(){
	
	it('is loaded', function() {
		FlickrAPI.should.be.a('function');
	});
	
	it('instantiates', function() {
		flickr_api = new FlickrAPI({
			flickr_api : '6ded95f2901a334b25f2b058751c5012' //Api key for tests only
		});
		
		flickr_api.should.be.a('object'); 
	});

});