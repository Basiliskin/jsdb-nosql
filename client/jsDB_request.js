/*
script theatre_expire.js defined,expiration process :
	- how to delete product/items
	- how to update item
	- how to release cart seats
*/

// call script "cancel",register, with arguments
jsDB.call('cancel',{
	product_id : id
	seats : []
},function(err,json){
	//..
})
// call script "order",register, with arguments
jsDB.call('order',{id:cart_id},function(err,json){
	//..
})
// get item ,if exists
jsDB.send('get',{id:item_id},function(err,json){
//..
})
// check if item exists
jsDB.send('exists',{id:item_id},function(err,json){
	//..
})

// call script "cart",register, with arguments
jsDB.call('cart',{
	id : item_id,
	expire 	: 10,// seconds
	cart_id : cart_id,
	seats 	: []
},function(err,json){
	//..
})

// call script "save",register, with arguments
jsDB.call('save',{
	id : cart_id;
	cart : [],
	product_id : item_id
},function(err,json){
	//..
})

// call script "booking",register, with arguments
jsDB.call('booking',{
	id : item_id,
	seats : [] // booking only
},function(err,json){
	//..
})
// delete item
jsDB.send('expire',{
	delete_id : item_id, // delete after 60 seconds
	seconds : 60
},function(err,json){
	//..
})
// update item
jsDB.send('expire',{
	update_id : item_id, // update after 20 seconds
	seconds : 20
},function(err,json){
	//..
})
//release cart seats after 10 seconds
jsDB.send('expire',{
	id 	: item_id,
	data : [{
		product_id 	: item_id,
		seat_id 	: seat.id,
		cart_id 	: cart_id
	}],
	seconds : 10
},function(err,json){
	//..
})
// add item
jsDB.send('add',{
	id : item_id,
	....
},function(err,json){
	//..
})
