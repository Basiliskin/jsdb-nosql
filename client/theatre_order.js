/* 
	expire cart function(pool,product,cb) 
	product.id - pool item id
	product.seats - list of booked seats 
	product.cart_id 
		- cb return custom object to client
		
	remove from cart
		- if all ok - return seats
		- else error
		
	delete order:
		- return booking to 1 - if booked
*/
if(items){
	pool.get(items,function(err,cart,unlock){
		if(err){
			done('Cart is empty')
			return;
		}
		pool.lockItems([cart.product_id,cart.product_id+ '$cart'],function(obj,unlock2){
			pool.log('order[1]',cart.id,cart.product_id,obj.length);
			var product 	= obj[0];
			var productCart = obj[1];
			
			function done(err,ret){
				unlock2();
				unlock();
				cb(err,ret);
			}
			if(!product){
				done('Product not exists')
			}
			else if(!productCart){
				done('Product has no booking')
			}else{
				var arr = [];
				for(var i in cart.seats){ 
					var seat_id = cart.seats[i];
					//pool.log('cart[seat_id]',seat_id,product.Booking[seat_id],productCart.seats[seat_id],cart.id);
					if(product.Booking[seat_id]==2/* cart */ && productCart.seats[seat_id]==cart.id/* cart match */) arr.push(seat_id);
				}
				//pool.log('cart[match]',arr.length==cart.seats.length);
				if(arr.length==cart.seats.length){
					for(var i in cart.seats){ 
						var seat_id = cart.seats[i];
						product.Booking[seat_id]=3/* order */;
						delete productCart.seats[seat_id];
					}
					delete pool.item[cart.id];
					delete pool.itemCache[cart.id];
					pool.setItem(product);
					pool.setItem(productCart);
					done(false,{
						product_id 	: product.id,
						seats		: cart.cart
					});
				}else
					done('Some seats already released');
			}
		});
	},true);
}
else if(items && items.cart_id){
	cb('3)Nothing done,seats not defined');
}
else if(items && items.seats){
	cb('3)Nothing done,cart_id not defined');
}
else{
	cb('2)Nothing done');
}