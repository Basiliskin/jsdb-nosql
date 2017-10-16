/* 
	expire cart function(pool,items,cb) 
		- cb return products which required update
*/
if(items){
	//pool.log('items',items);
	var products = {}; 
	var deleted = {};
	var updated = {};
	var arr = [];
	try{
		for(var i=0;i<items.length;i++){
			var item = items[i];
			if(!item) continue;
			//pool.log('item',i,item);
			if(item.product_id && !deleted[item.product_id]){
				if(item.seat_id){
					if(!products[item.product_id]) products[item.product_id] = {
						seats : []
					};
					products[item.product_id].seats.push(item);
				}			
			}
			else if(item.delete_id){//set expire for product
				if(!deleted[item.delete_id]){
					deleted[item.delete_id] = 1;
					products[item.delete_id] = { action : 'd' };
					if(updated[item.delete_id]) delete updated[item.delete_id];
				}
			}
			else if(item.update_id && !deleted[item.update_id]){//set expire for product
				if(!updated[item.update_id]){
					updated[item.update_id] = 1;
				}
			}
		}
	}catch(e){
		pool.log('deleteItem',e);
	}
	
	//pool.log('deleteItem',products,updated);
	for(var item_id in products){
		arr.push({
			id : item_id,
			data : products[item_id]
		});
	}
	for(var item_id in updated){
		arr.push({
			id : item_id,
			data : { action : 'u' }
		});
	}
	//pool.log('deleteItem[arr]',arr);
	function deleteItem(){
		if(arr.length){
			var data = arr.pop();
			pool.lockItem(data.id,function(unlock) {
				//pool.log('lockItem',data);
				var cart_id = data.id + '$cart';
				pool.lockItem(cart_id,function(unlock2){
					function finish(){
						unlock2();
						unlock();
						deleteItem();
					}
					var item = pool.item[data.id];
					
					//pool.log('deleteItem[cart_id]',data,cart_id);
					if(item)
					{
						var cart = pool.item[cart_id];
						
						var seats = data.data.seats;
						//pool.log('deleteItem[seats]',cart,seats);
						if(seats)
						{
							for(var i in seats){ 
								var seat = seats[i];
								//pool.log('deleteItem[cart]',i,seat,cart.seats[seat.seat_id],item.Booking[seat.seat_id]);
								if(cart.seats[seat.seat_id]){
									if(seat.cart_id==cart.seats[seat.seat_id]){
										if(item.Booking[seat.seat_id]==2/*cart*/) item.Booking[seat.seat_id] = 1;//return to booking
									}
									delete cart.seats[seat.seat_id];
								}
								//pool.log('deleteItem[cart]',i,seat,cart.seats[seat.seat_id],item.Booking[seat.seat_id]);
							}
							pool.setItem(cart);//save cart
							pool.setItem(item);//save booking
							pool.updateItem(item);
						}else if(data.data.action=='d'){
							delete pool.item[data.id];
							delete pool.itemCache[data.id];
						}else if(data.data.action=='u'){
							//pool.log('Booking',item.Booking);
							pool.updateItem(item);
						}
					}
					finish();
				});
			});
		}else{	
			//pool.log('deleteItem:done');
			cb(false,1);
		}
	}
	deleteItem();
}
else{
	cb('Nothing done');
}