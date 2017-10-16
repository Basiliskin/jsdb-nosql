angular.module('BlankApp', ['ngMaterial'])
	.controller('MainCtrl', MainCtrl);
	

function MainCtrl($scope,$http) 
{
    var self = this;
	self.Cart = [];
	self.CartInfo = false;
	self.DeleteOrder = function(){
		$http.get('http://m8s.nsupdate.info/lucky/theatre?mode=cancel').then(function(response) {
			if(response.status!=200){
				return;
			}
			
			var data = response.data ? response.data : false;
			console.info('data',data);
			if(data.err)
				alert(data.err);
			else{
				alert('Order deleted');
			}
		});
	}
	self.LoadCart = function(){
		$http.get('http://m8s.nsupdate.info/lucky/theatre?mode=show_cart').then(function(response) {
			if(response.status!=200){
				return;
			}
			var data = response.data ? response.data : false;
			if(data.err){
				alert(data.err);
				self.DeleteOrder();
			}
			else{
				console.info('response.data',data.replay);
				if(!$scope.$$phase) {
					$scope.$apply(function () {
						self.CartInfo = JSON.parse(data.replay);
						self.Cart = self.CartInfo.cart;
					});
				}else{
					self.CartInfo = JSON.parse(data.replay);
					self.Cart = self.CartInfo.cart;
				}
			}
		});
	}
	self.MakeOrder = function(){
		$http.get('http://m8s.nsupdate.info/lucky/theatre?mode=order').then(function(response) {
			if(response.status!=200){
				return;
			}
			var data = response.data ? response.data : false;
			if(data.err)
				alert(data.err);
			else{
				window.location.reload();
			}
		});
	}
	self.LoadCart();
	
}
