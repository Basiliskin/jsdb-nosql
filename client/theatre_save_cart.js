/* 
	expire cart function(pool,product,cb) 
	product.id - pool item id
	product.expire - cart expiration in seconds
	product.cart_id - cart_id
	product.seats - list of cart seats 
		- cb return custom object to client
*/
if(items && items.expire && items.cart_id){

	pool.setItem(items);
	pool.updateItem(items);
		
	pool.expire({
		delete_id 	: items.cart_id,
		seconds : 10
	},function(err,ret){
		cb(err,ret);
	});	
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