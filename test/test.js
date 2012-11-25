var should     = require("should"),
    flickr_api = require('../flickr_api.js');

describe('Flickr Scope', function(){
	
	it('Flickr scope should exist', function() {
		should.exist(F);
	});
	
	it('Flickr api should should exist inside Flickr scope', function() {
		F.should.have.property('FlickrAPI');
	});

});