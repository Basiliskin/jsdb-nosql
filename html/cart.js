angular.module('BlankApp', ['ngMaterial'])
	.controller('MainCtrl', MainCtrl)
	.directive('setHeight',setHeight)
	.service('AppFactory', appFactory);
	
Object.toparams = function ObjecttoParams(obj) {
    var p = [];
    for (var key in obj) {
        p.push(key + '=' + encodeURIComponent(obj[key]));
    }
    return p.join('&');
};


function setHeight($window)
{
  return{
    link: function(scope, element, attrs){
		//attr.ph
		var h = 0.01 * parseInt(attrs.ph);
		var w = 0.01 * parseInt(attrs.pw);
		element.css('width', Math.floor($window.innerWidth*w) + 'px');
		element.css('height', Math.floor($window.innerHeight*h) + 'px');
    }
  }
}

function appFactory($rootScope)
{
	var that = this;
	var Data = "";
	var new_map = true;
	var map = new TheatreMap();
	var json ;
	that.GetBooking = function(){
		var index = {};
		
		if(json){
			var booking = map.Booking;
			for(var seat_id in booking){
				var seat = json.data[seat_id];
				var region = json.data[seat.R].name;
				if(!index[region]) index[region]=1;
				else index[region]++;
			}
		}
		var arr = [];
		var total = 0;
		for(var name in index){
			arr.push({
				name : name,
				seats : index[name]
			});
			total += index[name];
		}
		arr.push({
			name : '$total',
			seats : total
		});
		$rootScope.$broadcast('booking:update',arr);
	}
	that.Move = function(pos)
	{
		map.Move(pos);
	}
	that.Zoom = function(mode){
		map.Zoom(mode);
	}
	that.getCart = function(){
		var arr = [];
		for(var id in map.Cart){
			var seat = json.data[id];
			arr.push({
				id : id,
				seat : seat.name,
				row : json.data[seat.r].name,
				region : json.data[seat.R].name
			});
		}
		return arr;
	}
	that.SetBooking = function(booking)
	{		
		if(booking.length==1){
			var row = json.data[booking[0]];
			if(row.t=='r'){
				for(var s=0;s<row.seat.length;s++){
					if(map.Cart[row.seat[s]]) continue;
					if(map.Booking[row.seat[s]]) delete map.Booking[row.seat[s]];
					else map.Booking[row.seat[s]] = true;
					map.updateSeat(row.seat[s]);
				}
				that.GetBooking();
			}
			else if(!map.cartMode && map.Cart[booking[0]]){
				return;
			}
			else if(!map.cartMode){
				if(map.Booking[booking[0]]) delete map.Booking[booking[0]];
				else map.Booking[booking[0]] = true;
				map.updateSeat(booking[0]);
				that.GetBooking();
				
			}else{
				if(map.Cart[booking[0]]) delete map.Cart[booking[0]];
				else map.Cart[booking[0]] = true;
				map.updateSeat(booking[0]);
				$rootScope.$broadcast('cart:update',that.getCart());
			}
		}else{
			for(var i=0;i<booking.length;i++){
				var seat = json.data[booking[i]];
				if(seat.t=='s'){
					if(map.Booking[booking[i]]) delete map.Booking[booking[i]];
					else map.Booking[booking[i]] = true;
					map.updateSeat(booking[i]);
				}				
			}
			that.GetBooking();
		}
	}
	that.GetMap = function(){
		return Data;
	}
	that.GetMapJson = function(){
		return json;
	}
	that.GetPoductMap = function(){
		var b = map.Booking;
		var booking = [];
		for(var i in b) booking.push(i);
		if(new_map)
			return {
				map : json,
				booking : booking
			};
		return {
			map : {},
			booking : booking
		};
	}
	that.SetMapData = function(data,cartMode){
		
		if(data){
			new_map = true;
			map.Booking = {};//reset booking
			map.Cart = {};//reset cart
			Data = data;
			try{
				if(typeof(data)=='string')
					json = map.parse(Data);
				else{
					json = data;
					map.Booking = json.Booking || {};
					new_map = false;
					console.log('json',json);
				}
			}catch(e){
				console.error(e);
			}
			
			$rootScope.$broadcast('map:update');
		}		
		map.cartMode = cartMode;
		if(json && json.region && json.region.length){
			that.region(json.data[json.region[0]]);
		}
	}
	that.region = function(region){
		map.drawRegion(json,region);
		$rootScope.$broadcast('region:update',region);
	}
}


function MainCtrl($scope,$http,$mdBottomSheet, $mdSidenav,$mdDialog,AppFactory) 
{
    var self = this;
	self.mapName = '';
	self.regionName = '';
	self.selectedRegionName = '';
	self.CartMode = true;
	self.SelectMode = false;
	self.Booking = [];
	self.Cart = [];
	self.zoom = function($event,mode){
		AppFactory.Zoom(mode);
	}
	var selection_area = {};
	
	
	var SelectionMode = {
		Booking : {
			start : function( ev, dd,elm ){				
				selection_area = {};
				return $('<div class="selection" />').css({	'opacity' : .65	} )
					.appendTo( document.body );
			},
			drag : function( ev, dd ,elm){			
				selection_area = {
					top: Math.min( ev.pageY, dd.startY ),
					left: Math.min( ev.pageX, dd.startX ),
					height: Math.abs( ev.pageY - dd.startY ),
					width: Math.abs( ev.pageX - dd.startX )
				};
				$( dd.proxy ).css(selection_area);				
			},
			end : function( ev, dd ,elm){
				var offset = $( dd.proxy ).offset();
				offset.right = offset.left + $( dd.proxy ).width();
				offset.bottom = offset.top + $( dd.proxy ).height();

				var n = 0;
				var booking = [];
				$(".seatSelect").each(function () {
					var seat_id = $(this).attr('id').split('_');
					if(seat_id.length<2) return;
					var prms = $(this).find('.mapSeat').offset();
					
					var x = prms.left;
					var y = prms.top;
					//if(n++<10) console.log('prms',seat_id[1],x,y,prms);
					if(offset.left<=x && offset.right>=x && offset.top<=y && offset.bottom>=y){	
						booking.push(seat_id[1]);
						//console.log('seat_id',seat_id[1]);
					}
				});
				$( dd.proxy ).remove();
				AppFactory.SetBooking(booking);
				if(!$scope.$$phase) {
					$scope.$apply(function () {
						self.SelectMode = false;
					});
				}else{
					self.SelectMode = false;
				}				
			}
		},
		Map :  {
			start : function( ev, dd ){			
				selection_area = {
					X : ev.pageX,
					Y : ev.pageY,
					x : 0 ,
					y : 0
				};				
			},
			drag : function( ev, dd ,elm){			
				selection_area.x = ev.pageX - selection_area.X;
				selection_area.y = ev.pageY - selection_area.Y;
				selection_area.X = ev.pageX;
				selection_area.Y = ev.pageY;
				
				AppFactory.Move(selection_area);
			}
		}
	};
	
	$("#theatreMap").drag("start",function( ev, dd ){
		if(!self.SelectMode) 
			SelectionMode.Map.start(ev, dd,this);
		else
			return SelectionMode.Booking.start(ev, dd,this);
	}).drag(function( ev, dd ){
		if(!self.SelectMode) 
			SelectionMode.Map.drag(ev, dd,this);
		else
			return SelectionMode.Booking.drag(ev, dd,this);
	}).drag("end",function( ev, dd ){
		if(!self.SelectMode) return;
		return SelectionMode.Booking.end(ev, dd,this);
	});
	self.selectMode = function(){
		
	}
	self.changeMode = function(){		
		AppFactory.SetMapData(false,self.CartMode);
	}
	self.maps = [{
		name : 'amphi',
		product_id : 1
	},{
		name : 'gesher',
		product_id : 2
	}];
	self.Region = [];
	
	$scope.$on('booking:update', function(event,booking)
	{
		if(!$scope.$$phase) {
			$scope.$apply(function () {
				self.Booking = booking;
			});
		}else{
			self.Booking = booking;
		}
	});
	$scope.$on('cart:update', function(event,cart) 
	{
		if(!$scope.$$phase) {
			$scope.$apply(function () {
				self.Cart = cart;
			});
		}else{
			self.Cart = cart;
		}
		
	});
	$scope.$on('map:update', function(event) 
	{
		var map = AppFactory.GetMapJson();
		//console.info('map',map);
		var arr = [];
		for(var i=0;i<map.region.length;i++) arr.push(map.data[map.region[i]]);
		self.Region = arr;
		self.CartMode = true;
		self.SelectMode = false;
	});
	$scope.$on('region:update', function(event,region) 
	{
		self.selectedRegionName = region.name;
		if(self.CartMode){
			$('.seatSelect').on('click',function(){
				var id = $(this).attr('id').split('_')[1];
				AppFactory.SetBooking([id]);
			});
		}else{
			$('.seatSelect').on('click',function(){				
				var id = $(this).attr('id').split('_')[1];
				AppFactory.SetBooking([id]);
			});
		}
		
	});
	self.showRegion = function(region){
		AppFactory.region(region);
	}
	self.LoadMap = function(){
		self.selectedRegionName = '';
		console.log('self.mapName',self.mapName);
		if(self.mapName.name)
			$http.get('http://m8s.nsupdate.info/lucky/theatre?mode=map&name='+self.mapName.name+'&product_id='+self.mapName.product_id).then(function(response) {
				if(response.status!=200){
					return;
				}
				var data = response.data ? response.data.data : false;
				if(!data && response.data){
					data = response.data.replay;
					if(data){
						data = JSON.parse(data);
					}
				}
				//console.info('response.data',data);

				if(data){
					if(!$scope.$$phase) {
						$scope.$apply(function () {
							self.CartMode = true;
							self.SelectMode = false;
						});
					}else{
						self.CartMode = true;
						self.SelectMode = false;
					}
					
					AppFactory.SetMapData(data,self.CartMode);
				}
			});
	}
	self.AddToCart = function(){
		var cart = self.Cart;
		var payload = new FormData();
		payload.append("cart", JSON.stringify(cart));
		console.log('cart',cart);
		$http({
			method: 'POST',
			url: 'http://m8s.nsupdate.info/lucky/theatre?mode=cart&name='+self.mapName.name+'&product_id='+self.mapName.product_id,
			data: payload,
			headers: { 'Content-Type': undefined},
			transformRequest: angular.identity
		}).then(function(response) {
			console.info('response',response.data.err);
			if(response.data.err)
				alert(response.data.err);
			else
				window.location.reload();
			
		});
	}
	
	
}
