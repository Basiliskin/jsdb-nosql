var 
	AsyncLock = require('./async.js'),
	lock = new AsyncLock({timeout : 5000 /* 5 seconds */}),//https://github.com/rogierschouten/async-lock/blob/master/test/test.js
	BinarySearchTree = require('./bst.js'),//used for expire functionality	
	crypto = require('crypto'),
	easysocket = require('./easysocket.js'),
	net = require('net');
	


function lock_Function(lock_key,cb){
	lock.acquire(lock_key, function(Done) {
		cb(Done);
	}, function(err, ret) {}, {});	
}
function log(){
	var args = Array.prototype.slice.call(arguments);
	args.unshift(new Date());
	args.unshift(__filename);
    console.log.apply(console, args);
}

log('jsDB library');

function Pool(key)
{
	this.key = key;
	this.item = {};
	this.itemCache = {};
	this.func = {};
	this.node = {};
	this.lock = 'pool$'+key+'$expire';
	this.expired = new BinarySearchTree();
	this.log = log;
}
Pool.prototype.setItem = function(item)
{
	if(item){
		this.item[item.id]=item;
	}	
}
Pool.prototype.updateItem = function(item)
{
	if(item){
		delete this.itemCache[item.id];
	}	
}

Pool.prototype.lockItem = function(item_id,cb)
{
	var lock_key = 'pool$'+this.key+'$'+item_id;
	lock_Function(lock_key,function(unlock) {
		cb(unlock);
	});
}
Pool.prototype.lockItems = function(items,cb)
{
	var that = this;
	var locks = [];
	for(var i=0;i<items.length;i++)
		locks.push('pool$'+that.key+'$'+items[i]);
	
	lock_Function(locks,function(unlock) {
		for(var i=0;i<items.length;i++)
			items[i] = that.item[items[i]]
		cb(items,unlock);
	});
}
Pool.prototype.randomID = function(desiredLength)
{
	desiredLength = desiredLength || 16;
	return crypto.randomBytes(Math.ceil(desiredLength/2)).toString('hex').slice(0,desiredLength);
}
Pool.prototype.callFunc = function(item,cb)
{
	if(!item || !item.data)
	{
		cb('Data undefined');
	}
	else if(item.func_id)
	{
		var that = this;
		var lock_key = 'pool$'+this.key+'$func';
		lock_Function(lock_key,function(unlock2) {
			var f = that.func[item.func_id];
			unlock2();
			if(f && f instanceof Function)
			{
				try{
					f(that,item.data,cb);
				}catch(e){
					cb('catch:'+e);
				}
			}else{
				cb('Function not found');
			}												
		});
	}else{
		cb('Function undefined');
	}				
}
Pool.prototype.expireList = function(item,cb)
{
	var that = this;
	lock_Function(that.lock,function(unlock) {
		var arr = [];
		var t = new Date().getTime();
		that.expired.InOrder(function(node){
			//log('expireList',node,node.value.val<t);
			if(node.value.val<t){
				arr.push(node);
			}
			else 
				return arr;//stop			
		},function(err,arr1){
			//log('expireList',err,arr,arr1);
			if(arr && arr.length){
				// clean up
				for(var i=0;i<arr.length;i++){
					that.expired.remove(arr[i]);
					arr[i] = arr[i].value.data;
				} 
				unlock();
				
				if(item && item.func_id){
					var lock_key = 'pool$'+that.key+'$func';
					lock_Function(lock_key,function(unlock2) {
						var f = that.func[item.func_id];
						unlock2();
						if(f && f instanceof Function)
						{
							log('expireList',arr);
							try{
								f(that,arr,cb);
							}catch(e){
								cb(e,arr);
							}
						}else{
							cb('Function not found',arr);
						}												
					});
				}else{
					cb(err,arr);
				}				
			}else{
				unlock();
				cb(err);
			}
			
		});
	});
}
Pool.prototype.unexpire = function(item,cb)
{
	if(!item.id)
	{
		cb('Invalid Message data.id.');
	}
	else{
		var that = this;
		lock_Function(that.lock,function(unlock) {
			var node = that.expired.get(item.id);
			if(node){
				that.expired.remove(node);
			}
			else
				cb(false,-1);
			unlock();			
		});
	}	
}
Pool.prototype.expire = function(item,cb)
{
	//log('item',item);
	if(!item)
	{
		cb('Invalid Message data.');
	}
	else if(!item.seconds)
	{
		cb('Invalid Message data.seconds.');
	}
	else{
		var that = this;
		var t = new Date();
		t.setSeconds(t.getSeconds() + item.seconds);
		lock_Function(that.lock,function(unlock) {
			var ret = [];
			//log('lock_Function',item);
			try{
				if(item.data && item.data instanceof Array){
					for(var i=0;i<item.data.length;i++){
						var node = that.expired.push({
							val : t.getTime(),
							data : item.data[i]
						});
						ret.push(node.id);
					}
				}else{
					var node = that.expired.push({
						val : t.getTime(),
						data : item
					});
					ret.push(node.id);
				}
				cb(false,ret);
			}catch(e){
				cb('catch:'+e);
			}
			unlock();
			//log('lock_Function',item,ret);
		});
	}	
}
Pool.prototype.register = function(item,cb)
{
	if(!item.body)
	{
		cb('Invalid Message data.body.');
	}
	else{
		var that = this;
		var lock_key = 'pool$'+this.key+'$func';
		lock_Function(lock_key,function(unlock) {
			try{
				var func_id = that.randomID();
				that.func[func_id] = new Function('pool','items','cb',item.body);
				cb(false,func_id);
			}catch(e){
				cb(e,item.body);
			}
			unlock()			
		});
	}	
}
Pool.prototype.unregister = function(item,cb)
{
	if(!item.func_id)
	{
		cb('Invalid Message data.body.');
	}
	else{
		var that = this;
		var lock_key = 'pool$'+this.key+'$func';
		lock_Function(lock_key,function(unlock) {
			if(that.func[item.func_id])
			{
				delete that.func[item.func_id];
				cb(false,item.func_id);
			}else{
				cb(false,-1);
			}
			unlock()
			
		});
	}	
}
Pool.prototype.add = function(item,cb)
{
	if(typeof(item)=='string') item = JSON.parse(item);
	if(!item.id)
	{
		log('item',typeof(item),item);
		cb('Invalid Message data.ID.');
	}else{
		var that = this;
		var lock_key = 'pool$'+this.key+'$'+item.id;
		lock_Function(lock_key,function(unlock) {
			that.setItem(item);
			unlock()
			cb(false,item.id);
		});
	}	
}
Pool.prototype.get = function(item,cb,json)
{
	var item_id = item ? (typeof(item)!='object' ? parseInt(item) : item.id) : 0;
	log('item',item_id,item ? typeof(item) : 'undefined');
	if(!item_id)
	{
		cb('Invalid Message data.ID.');
	}else{
		var that = this;
		var lock_key = 'pool$'+that.key+'$'+item_id;
		lock_Function(lock_key,function(unlock) {
			if(!json && !that.itemCache[item_id]){
				that.itemCache[item_id] = JSON.stringify(that.item[item_id]);
			}
			cb(false,json ? that.item[item_id] : that.itemCache[item_id],unlock);
		});
	}	
}
Pool.prototype.del = function(item,cb)
{
	if(!item.id)
	{
		cb('Invalid Message data.ID.');
	}
	else{
		var that = this;
		var lock_key = 'pool$'+this.key+'$'+item.id;
		lock_Function(lock_key,function(unlock) {			
			if(that.item[item.id]){
				delete that.item[item.id];
				delete that.itemCache[item.id];
				cb(false,item.id);
			}else{
				cb(false,-1);
			}
			unlock();
		});
	}	
}

function parseMessage(socket,buffer,cb){
	var textChunk = buffer.toString('utf8');
	try{
		var tmp = JSON.parse(textChunk);
		cb(false,tmp);
	}catch(e){
		cb(e);
	}	
}
function JsDbClient(Port,Key){
	var that = this;
	var Func = {};
	var port = Port;
	var apiKey = Key;
	
	function request(message,cb,disable_parse)
	{
		var client = new net.Socket();
		var done = 0;
		client.connect(port, '127.0.0.1', function() {
			easysocket.send(client, message, function(socket) {});
		});
		client.on('data', function(data) {
			easysocket.recieve(client,data,function(socket,buffer){
				if(!done){
					done = 1;
					if(disable_parse)
						cb(false,buffer.toString('utf8'));
					else
						parseMessage(socket,buffer,cb);
				}	
			});
		});
		client.on('close', function() {
			if(!done){
				done = 2;
				cb('Connection closed');
			}
		});
	};
	
	that.loadFunc = function(name,funcContent,cb)
	{
		request(JSON.stringify({
			key : apiKey,	//pool name
			cmd : 'register',	//pool command
			data : {
				body : funcContent
			}
		}),function(err,json){
			log('loadFunc',name,err,json);
			Func[name] = json.replay;
			cb(err,json);
		});	
	};

	that.send = function(cmd,data,cb,disable_parse)
	{
		request(JSON.stringify({
			key : apiKey,	//pool name
			cmd : cmd,	//pool command
			data :data
		}),cb,disable_parse);
	};
	
	that.expired = function(funcName,cb)
	{
		if(Func[funcName])
			that.send('expired',{ func_id : Func[funcName] },cb);
		else
			cb('Functoin not defined,'+funcName)
	};
	
	that.call = function(funcName,data,cb)
	{
		console.log('call',funcName,Func[funcName]);
		if(Func[funcName]){
			that.send('call',{
				func_id : Func[funcName],
				data 	: data
			},cb,true);	
		}else{
			cb('Function not registered');
		}
	};
}


var jsDB = 
{
	port : 52275,
	apiKey : '',
	Pool : {},
	client : function(port,apiKey)
	{
		return new JsDbClient(port,apiKey);
	},
	server : function()
	{
		log('jsDB server',jsDB.port);
		var server = net.createServer(function(socket) {
			function finish(err,replay){
				easysocket.send(socket, JSON.stringify({
					err : err,
					replay : replay
				}), function(socket) {
					//log("handle:Message  sent!");
				});
			}
			function handle(socket,cb){	
				socket.on('data', function(data){
					easysocket.recieve(socket,data,function(socket,buffer){
						parseMessage(socket,buffer,cb);
					});		
				});
			}
			handle(socket,function(err,json){
				if(!err){
					jsDB.handle(json,finish);
				}else{
					finish(err);
				}		
			});
		});
		server.listen(jsDB.port, '127.0.0.1');
	},
	handlePool : function(msg,cb)
	{
		if(!msg.data)
		{
			cb('Invalid Message data.');
		}
		else if(msg.cmd){
			
			var pool = this.Pool[msg.key];
			switch(msg.cmd){
				case 'call':
					pool.callFunc(msg.data,cb);
					break;
				case 'expired':
					pool.expireList(msg.data,cb);
					break;
				case 'expire':
					pool.expire(msg.data,cb);
					break;
				case 'unexpire':
					pool.expire(msg.data,cb);
					break;
				case 'add':
					pool.add(msg.data,cb);
					break;
				case 'get':
					pool.get(msg.data,function(err,data,unlock){
						unlock();
						cb(err,data);
					});
					break;
				case 'exists':
					pool.get(msg.data,function(err,data,unlock){
						unlock();
						cb(err,data ? data.length : 0);
					});
					break;
				case 'del':
					pool.del(msg.data,cb);
					break;
				case 'register':
					pool.register(msg.data,cb);
					break;
				case 'unregister':
					pool.unregister(msg.data,cb);
					break;
				default:
					cb('Invalid Pool cmd.');
					break;
			}
		}
		else
			cb('Invalid Pool cmd.');
	},
	handle : function(msg,cb)
	{		
		//log('handle',msg.length);
		var that = this;
		if(msg.key)
		{
			var lock_key = 'pool$'+msg.key;
			lock_Function(lock_key,function(unlock) {
				if(!that.Pool[msg.key]) that.Pool[msg.key] = new Pool(msg.key);
				unlock();
				that.handlePool(msg,cb);				
			});			
		}else{
			cb('Invalid Pool key.');
		}
	}
};



module.exports = jsDB;