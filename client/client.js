const 
	jsDB = require('../../../include/jsDB/jsDB.js');

	
var lib = module.exports = {};

var client = jsDB.client(52275,'theatre');

function log(){
	var args = Array.prototype.slice.call(arguments);
	args.unshift(new Date());
	args.unshift(__filename);
    console.log.apply(console, args);
}
log('jsDB client');


/*

booking
http://m8s.nsupdate.info/lucky/proj/theatre/index.html
cart
http://m8s.nsupdate.info/lucky/proj/theatre/cart.html
order + delete[auto]
http://m8s.nsupdate.info/lucky/proj/theatre/order.html


*/
var dbFunc = {
	'expire':{
		file : 'theatre_expire.js',// handle item expiration
		id : 0
	},'cart':{
		file : 'theatre_add_cart.js',// handle add to cart
		id : 0
	},'save':{
		file : 'theatre_save_cart.js',// handle add to cart
		id : 0
	},'booking':{
		file : 'theatre_booking.js', // handle booking
		id : 0
	},'order':{
		file : 'theatre_order.js', // handle order
		id : 0
	}
	,'cancel':{
		file : 'theatre_order_cancel.js', // handle order
		id : 0
	}
};
var timer;


function load_dbFunc(cb){
	var item = [];
	for(var f in dbFunc){
		if(!dbFunc[f].id) item.push(f);
	}
	function get_next(){
		if(item.length){
			var f = item.pop();
			fs.readFile(__dirname+'/'+dbFunc[f].file, "utf-8", (err, fileContent) => {
				if(fileContent)
					client.loadFunc(f,fileContent,function(err,json){
						log('load file',f,dbFunc[f].file,err,json);
						dbFunc[f].id = json.replay;
						get_next();
					})
				else{
					log('Failed to load file',f,dbFunc[f].file);
					get_next();
				}					
			});
		}
		else{
			if(!timer){
				timer = setInterval(function(){
					//log('call[setInterval]',dbFunc['expire']);
					client.expired('expire',function(err,json){
						//log('call[expired]',err,json);
					});
				},10000/* 10 sconds */);
			}
			cb();
		}
	}
	get_next();
}
lib.send = client.send;
lib.call = client.call;	
lib.load = load_dbFunc;



