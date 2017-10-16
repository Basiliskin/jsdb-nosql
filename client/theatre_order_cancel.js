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
	pool.lockItems([items.product_id],function(obj,unlock){
		pool.log('cancel[1]',items.product_id,obj.length);
		var product 	= obj[0];
		var order 		= items;
		
		function done(err,ret){
			unlock();
			cb(err,ret);
		}
		if(!product){
			done('Product not exists')
		}
		else{
			var arr = [];
			for(var i in order.seats){ 
				var seat_id = order.seats[i].id;
				if(product.Booking[seat_id]==3/* order */){
					arr.push(seat_id);
					product.Booking[seat_id] = 1;
				} 
			}
			//pool.log('cart[match]',arr.length==cart.seats.length);
			if(arr.length){
				pool.setItem(product);
				done(false,{
					seats : arr
				});
			}else
				done('3)Nothing done');
		}
	});
}
else{
	cb('2)Nothing done');
}