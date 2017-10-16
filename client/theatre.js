const 
	fs = require('fs'),
	crypto = require('crypto'),
	_ = require("underscore"),
	inc = require('../../lib/include.js'),
	jsDB = require('./client.js'),
	spawn = require('child_process').spawn;

var lib = module.exports = {};

function log(){
	var args = Array.prototype.slice.call(arguments);
	args.unshift(new Date());
	args.unshift(__filename);
    console.log.apply(console, args);
}
log('Theatre Loaded');
function fs_valid(source,filename,cb ){
	var file_s = source+filename;
    fs.stat(file_s,function(err,s){
		//console.log('template_valid',file_s,err,s);
		if(err || !s.size){
			cb(1,filename);// template not exist
		}
		else{
			cb(0,filename); // ok
		}
	});
}
function fs_load(path,filename,cb){
	fs_valid(path,filename,function(err,filename,s){
		if(err)
			cb(err);
		else
			fs.readFile(path+filename, "utf-8",cb);
	});
}

var global_cart_id = 'cart$100';
var order;
lib.requests = {
	'cancel':function(self,redisClient,Body,req, res,main_cb){
		res.set({ 'content-type': 'application/json; charset=utf-8' });
		if(order){
			order = JSON.parse(order);
			log('cancel[order]',order);
			var data = order.replay;
			order = null;
			jsDB.call('cancel',data,function(err,json){
				log('cancel[order]',err,json);
				res.send(json);
			})
		}else{
			res.send(JSON.stringify({
				err : "Nothing to do"
			}));
		}
	},
	'order':function(self,redisClient,Body,req, res,main_cb){
		res.set({ 'content-type': 'application/json; charset=utf-8' });
		jsDB.call('order',{id:global_cart_id},function(err,json){
			log('save[order]',err,json);
			order = json;
			res.send(json);
		})
	},
	'show_cart':function(self,redisClient,Body,req, res,main_cb){
		res.set({ 'content-type': 'application/json; charset=utf-8' });
		jsDB.send('get',{id:global_cart_id},function(err,json){
			//log('send',err,json);
			if(json && json.indexOf('replay')>0)
				res.send(json);
			else
				res.send(JSON.stringify({
					err : "Cart is empty"
				}));
		},true);
	},
	'cart':function(self,redisClient,Body,req, res,main_cb){
		res.set({ 'content-type': 'application/json; charset=utf-8' });
		jsDB.send('exists',{id:req.query.product_id},function(err,json){
			log('exists',err,json);
			if(json && json.replay){
				var cart = unescape(Body['cart']);
				log('cart',cart);
				try{
					cart = JSON.parse(cart);
					var seats = [];
					for(var i=0;i<cart.length;i++){
						seats.push(cart[i].id);
					}
					var set = {
						id : req.query.product_id,
						expire 	: 10,
						cart_id : global_cart_id,
						seats 	: seats
					};
					log('set',set);
					jsDB.call('cart',set,function(err,json){
						log('cart[save]',err,json);
						if(json && json.indexOf('replay')>0){
							set.id = global_cart_id;
							set.cart = cart;
							set.product_id = req.query.product_id;
							log('save[cart]',set);
							jsDB.call('save',set,function(err,json){
								log('save[cart]',err,json);
								res.send(json);
							})
						}
						else
							res.send(JSON.stringify({
								err : err
							}));
					});	
				}catch(e){
					log('catch',e);
					res.send(JSON.stringify({
						err : 'catch:'+e
					}));
				}				
			}else{
				res.send(JSON.stringify({
					err : "Product not exist"
				}));
			}
		});
	},
	'save':function(self,redisClient,Body,req, res,main_cb){
		res.set({ 'content-type': 'application/json; charset=utf-8' });
		
		jsDB.send('exists',{id:req.query.product_id},function(err,json){
			var map = Body['map'] ? unescape(Body['map']) : '';
			var booking = unescape(Body['booking']);
			function save_booking(){
				log('save',booking);
				jsDB.call('booking',{
					id : req.query.product_id,
					seats : booking
				},function(err,json){
					log('call[booking]',err,json);
					// set expiration of product 
					jsDB.send('expire',{
						delete_id : req.query.product_id,
						seconds : 60
					},function(err,json){
						//log('call[expire]',err,json);
						res.send(json);
					});	
				});				
			}
			if(map.length && !json || !json.replay){
				//save
				//inc.debug(map);
				log('add',map.length);
				jsDB.send('add',map,function(err,json){
					err = err || json.err;
					if(err){
						log('add',err,json);
						res.send(JSON.stringify({
							err : err
						}));
					}else{
						save_booking();
					}					
				});
			}else{
				save_booking();
			}			
		});
	},
	'map':function(self,redisClient,Body,req, res,main_cb){
		res.set({ 'content-type': 'application/json; charset=utf-8' });
		jsDB.load(function(){
			jsDB.send('get',{id:req.query.product_id},function(err,json){
				//log('send',err,json);
				if(json && json.indexOf('replay')>0)
					res.send(json);
				else
					fs_load(Body['$path'],'map_'+req.query.name+'.txt',function(err, fileContent){
						res.send(JSON.stringify({
							err : err,
							data : fileContent
						}));
					});
			},true)
		});		
	},
	'tmpl':function(self,redisClient,Body,req, res,main_cb){
		self.RenderTemplate(req.query.name,Body,req, res);
		cb(true,true);	
	},
	'html':function(self,redisClient,Body,req, res,main_cb){
		self.RenderTemplate('index',Body,req, res);
		cb(true,true);	
	}
}

function handle_request(Body,req, res,cb){
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	var self = this;
	Body['$path'] = __dirname+'/';
	Body['$template$'] = "index";
	req.session.login_to = 'theatre';
	
	var mode = req.query.mode || Body['mode'];
	mode = mode || "html"; 
	log('mode',mode);
	mode = mode=="main" ? "html" : mode;
	if(lib.requests[mode]){
		lib.requests[mode](self,null,Body,req, res,cb);
	}else{	
		res.send(JSON.stringify({
			err : 'Action undefined'
		}));
		
		cb(true,true);			
	}
}

lib.register = function(name,Manager){
	jsDB.load(function(){
		Manager.requests[name] = handle_request.bind(Manager);
	});	
}