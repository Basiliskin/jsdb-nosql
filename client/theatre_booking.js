/* 
	expire cart function(pool,product,cb) 
	product.id - pool item id
	product.booking - list of booked seats 
	product.mode - add/remove
		- cb return custom object to client
*/
if(items){
	pool.get(items,function(err,item,unlock){
		// still in lock!!
		if(err){
			cb(err);
			return;
		}
		var arr = [];
		var booking = {};
		try{
			if(typeof(items.seats)=='string') items.seats = JSON.parse(items.seats);
		}catch(e){
			
		}
		if(items && items.seats)
			for(var i=0;i<items.seats.length;i++){
				var seat_id = items.seats[i];
				booking[seat_id] = 1;
			}
		
		item.Booking = booking;
		pool.setItem(item);
		unlock();
		
		cb(false,arr);
		
				
	},true)	
}
else{
	cb('2)Nothing done');
}