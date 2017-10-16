/* 
	expire cart function(pool,product,cb) 
	product.id - pool item id
	product.expire - cart expiration in seconds
	product.cart_id - cart_id
	product.seats - list of cart seats 
		- cb return custom object to client
*/
if(items && items.expire && items.cart_id){
	pool.get(items,function(err,item,unlock){
		if(err){
			cb(err);
			return;
		}
		// still in lock!!
		var cart_id = items.id + '$cart';
		pool.get({id:cart_id},function(err2,cart,unlock2){
			if(err2){
				cb(err2);
				return;
			}
			function done(err,ret){
				unlock2();
				unlock();
				cb(err,ret);
			}
			function finish(err,ret){
				// save 
				if(!err){
					// save cart 
					//pool.log('cart',cart);
					if(cart) pool.setItem(cart);
					pool.setItem(item);
					//pool.log('Booking',item.Booking);
					//send update cache
					pool.expire({
						id 	: item.id,
						data : [{ update_id 	: item.id }],
						seconds : 1
					},function(err,ret){
						done(err,ret);
					});					
				} 
				else
					done(err,ret);
			}
			var arr = [];
			if(item && !cart){
				cart = {
					id		: cart_id,
					seats 	: {}
				};
			}
			if(item && item.Booking)
				for(var i=0;i<items.seats.length;i++){
					var seat_id = items.seats[i];
					if(!cart.seats[seat_id] && item.Booking[seat_id]){
						arr.push(seat_id);
					}
				}
			if(arr.length==items.seats.length){
				var e = [];
				for(var i=0;i<arr.length;i++){				
					e.push({
						product_id 	: item.id,
						seat_id 	: arr[i],
						cart_id 	: items.cart_id
					});
					item.Booking[arr[i]] = 2;//taken
				}
				pool.expire({
					id 	: item.id,
					data : e,
					seconds : items.expire
				},function(err,ret){
					if(!err){
						if(ret.length==arr.length){
							for(var i=0;i<arr.length;i++){
								cart.seats[arr[i]]=items.cart_id;
							}
						}else{
							err = 'Failed to save data to BST.';
						}
					}
					
					finish(err,ret);
				});
			}else{
				finish('1)Some seats already taken');
			}
		},true)	;
	},true)	;
}
else if(items  && items.expire){
	cb('4)Nothing done,cart_id not defined');
}
else if(items){
	cb('3)Nothing done,expire not defined');
}
else{
	cb('2)Nothing done');
}