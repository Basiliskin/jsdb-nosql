(function(String) {
if (!String.prototype.replaceAll) {
	String.prototype.replaceAll = function(searchStr, replaceStr) {
		var str = this;
		if(str.indexOf(searchStr) === -1) return ''+str;
		return '' + (str.replace(searchStr, replaceStr)).replaceAll(searchStr, replaceStr);
	}
}
}(String));

function TheatreMap(){
	this.colors = {
		'row' 		: '#7FBFEC',
		'cart' 		: '#40DA1A',
		'order' 	: '#A9A1B3',
		'booking' 	: '#A6EC7F',
		'seat' 		: '#ccffff'		
	};
	this.cartMode = false;
	this.Booking = {};
	this.Cart = {};
}
TheatreMap.prototype.Move = function(pos)
{
	var that = this;
	var divSeats = jQuery('#divSeats');
	that.x += pos.x;
	that.y += pos.y;
	console.log('pos',pos);
	divSeats.css('left', that.x+'px');
	divSeats.css('top', that.y+'px');
}
TheatreMap.prototype.Zoom = function(mode)
{
	var that = this;
	var divSeats = jQuery('#divSeats');
	if(!mode){
		that.zoomValue = 0;
		that.x = that.left;
		that.y = that.top;
		divSeats.css('transform', 'scale(' + that.zoom + ')');
		divSeats.css('left', that.x+'px');
		divSeats.css('top', that.y+'px');
	}else{
		that.zoomValue +=mode;
		if(that.zoomValue<0) that.zoomValue = 0;
		var step = that.zoom + that.zoomValue * that.zoom  * 0.5;
		divSeats.css('transform', 'scale(' + step + ')');
	}
}
TheatreMap.prototype.parse = function(txt,split)
{
	var json = {
		id 		: 1,
		region 	: [],
		data 	: {}
	};
	var region;
	var row;
	var seat_id = 1;
	var map = {};
	var LTR = true;
	function add_region(name){
		if(region){
			json.data[region.id] = region;
			json.region.push(region.id);
		} 
		
		if(name){
			if(map[name])
				region = map[name];
			else{
				region = {
					id 		: seat_id++,
					name 	: name,
					row  	: []
				}
				map[name] = region;
				
			}
		}
		add_row();
		row = null;
	}
	function add_row(config){
		if(config){
			var attr = config.split('|');
			var id = region.name +'.'+ attr[0];
			if(map[id])
				row = map[id];
			else{
				row = {
					t 		: 'r',
					id 		: seat_id++,
					name 	: attr[0],
					seat 	: []
				};
				var pos = attr[1].split(',');
				if(pos.length==2){
					if(pos[0]!='') row.x = parseInt(pos[0]);
					if(pos[1]!='') row.y = parseInt(pos[1]);
				}
				json.data[row.id] = row;
				region.row.push(row.id);
				map[id] = row;
			}
		}			
	}
	
	function insert_seat(seat){
		seat.t = 's';
		seat.r = row.id;
		seat.R = region.id;
		json.data[seat.id] = seat;
		if(LTR)
			row.seat.push(seat.id);
		else
			row.seat.unshift(seat.id);
	}
	function add_seat(config){
		if(config){
			var attr = config.split('|');
			if(attr.length==2){
				//map_config += 'SEAT:1|3'+'\r\n';
				var s  = parseInt(attr[0]);
				var e  = parseInt(attr[1]);
				while(s<=e){
					insert_seat({
						id : seat_id++,
						name : s++
					});
				}
			}else if(attr.length>2){
				//map_config += 'SEAT:20|10,1|456'+'\r\n';
				var seat = {
					id : seat_id++,
					name : attr[0]
				};
				var pos = attr[1].split(',');
				if(pos.length>=2){
					if(pos[0]!='') seat.x = parseInt(pos[0]);
					if(pos[1]!='') seat.y = parseInt(pos[1]);
					if(pos.length>2 && pos[2]=='1') seat.stop = true;
				}
				seat.tip = attr[2];
				insert_seat(seat);
			}
		}			
	}
	split = split ? split : '\r\n';
	
	//console.log("TXT",txt);
	var lines = txt.replaceAll('\r\n','\n').split('\n');
	//console.log("lines",lines);
	for(var i=0;i<lines.length;i++){
		var line = lines[i].split(':');
		if(line.length==2){
			switch(line[0]){
				case 'OPTION':
					LTR = line[1]=='LTR';
					break;
				case 'REGION':
					add_region(line[1])
					break;
				case 'ROW':
					add_row(line[1]);
					break;
				case 'SEAT':
					add_seat(line[1]);
					break;
			}
		}
	}
	add_row();
	add_region();

	return json;	
}
TheatreMap.prototype.updateSeat = function(seat_id){
	var that = this;
	var colors = that.colors;
	var cartMode = that.cartMode;
	var elm = $('#seat_'+seat_id).find('.mapSeat');
	if(that.Cart[seat_id])
		elm.css('background',colors.cart);
	else if(that.Booking[seat_id]==1)
		elm.css('background',colors.booking);
	else if(that.Booking[seat_id])
		elm.css('background',colors.order);
	else
		elm.css('background',colors.seat);
}
TheatreMap.prototype.checkCart = function(seats)
{
	// if not allow return false
	
	var that = this;
	function get_row(seat){
		var region = that.Regions[seat.region];
		return region ? region.row[seat.row_id] : null;
	}
	function get_status(row, i) {
		var  seat;
		var left = 0, right = 0, len = 1;
		var s = i;
		var n = row.seat.length;
		while (--s >= 0) {
			seat = row.seat[s];
			if (seat.cart || seat.taken) break;
			left++;
			if(seat.stop) break;
		}

		s = i;
		while (++s < n) {					
			seat = row.seat[s];
			if (seat.cart) {
				if (right) break;
				len++;
				continue;
			}
			if (seat.taken || seat.stop) break;
			right++;
		}

		return { left: left, right: right, length: len };
	};	
	for(var s in seats){
		var  row = get_row(seats[s]);
		if(row){
			var v = get_status(row,seats[s].s_id);
			if ((v.left == 1 && v.right > 0) || (v.right == 1 && v.left > 0)) {
				console.log('get_row',v,seats[s],row);
				alert('Single seat left - please move your selection');
				return false;
			}
		}
	}
	
	return true;
}
TheatreMap.prototype.drawRegion = function(map,region)
{
	var that = this;
	that.zoomValue = 0;
	var colors = that.colors;
	var cartMode = that.cartMode;
	var theatre = jQuery('.theatre');
	theatre.empty();
	//console.info('drawRegion',cartMode,that.Booking,region);
	if(region){
		var pos = {
			offset : 1,
			seat : 20,
			width : theatre.innerWidth(),
			height: theatre.innerHeight(),
			x : {
				max : -99999,
				min  : 99999
			},
			y : {
				max : -99999,
				min  : 99999
			},
			row : {
				x : 0,
				y : 0,
				h : 0,
				w : 0
			}
		};
		var x = 0,y = 0; // init
		var seats = [];
		seats.push('<div id="divSeats" style="position:absolute;margin:0px;padding:0px;">');
		function add_row(name,row,_x,_y){
			add_seat(name,row,_x,_y,true);
		}
		function add_seat(name,seat,_x,_y,is_row){
			if(pos.x.min>_x) pos.x.min = _x;
			if(pos.y.min>_y) pos.y.min = _y;
			
			if(name!=''){
				if(is_row){
					if(!cartMode){
						seats.push('<a href="javascript:void(0);" class="seatSelect" id="seat_'+seat.id+'" >');
						seats.push('<span class="mapSeat regionRow" style="left:' + _x + 'px; top:' + _y + 'px; background:'+colors.row+';" >' + name + '</span>');
						seats.push('</a>');
					}else
						seats.push('<span class="mapSeat regionRow" style="left:' + _x + 'px; top:' + _y + 'px; background:'+colors.row+';" >' + name + '</span>');
				}
				else if(cartMode && !that.Booking[seat.id]){
					seats.push('<span class="mapSeat regionSeat" style="left:' + _x + 'px; top:' + _y + 'px; background:'+colors.order+';" >' + name + '</span>');
				}				
				else if(cartMode && that.Cart[seat.id]){			
					seats.push('<a href="javascript:void(0);" class="seatSelect" id="seat_'+seat.id+'">');
					seats.push('<span class="mapSeat regionSeat seatCart" style="left:' + _x + 'px; top:' + _y + 'px; background:'+colors.cart+';" >' + name + '</span>');
					seats.push('</a>');
				}
				else if(!cartMode && that.Cart[seat.id]){
					seats.push('<span class="mapSeat regionSeat" style="left:' + _x + 'px; top:' + _y + 'px; background:'+colors.cart+';" >' + name + '</span>');
				}
				else if(that.Booking[seat.id] && that.Booking[seat.id]<3){
					seats.push('<a href="javascript:void(0);" class="seatSelect" id="seat_'+seat.id+'">');
					seats.push('<span class="mapSeat regionSeat seatCart" style="left:' + _x + 'px; top:' + _y + 'px; background:'+(that.Booking[seat.id]==2 ? colors.order : colors.booking)+';" >' + name + '</span>');
					seats.push('</a>');
				}
				else if(that.Booking[seat.id]){
					seats.push('<span class="mapSeat regionSeat" style="left:' + _x + 'px; top:' + _y + 'px; background:'+colors.order+';" >' + name + '</span>');
				}
				else{					
					seats.push('<a href="javascript:void(0);" class="seatSelect" id="seat_'+seat.id+'">');
					seats.push('<span class="mapSeat regionSeat" style="left:' + _x + 'px; top:' + _y + 'px; background:'+colors.seat+';" >' + name + '</span>');
					seats.push('</a>');
				}
			}
			x += pos.seat+pos.offset;

			if(pos.x.max<_x) pos.x.max = _x;
			if(pos.y.max<_y) pos.y.max = _y;
		};
		for(var r=0;r<region.row.length;r++){
			var row = map.data[region.row[r]];
			if(row.x) pos.row.x = row.x;
			if(row.y) pos.row.y = row.y+pos.seat+pos.offset;
			x = pos.row.x;
			y = pos.row.y;
			var f = true;
			
			for(var s=0;s<row.seat.length;s++){
				var seat = map.data[row.seat[s]];
				seat.row_id = r;
				seat.seat_id = s;
				if(seat.x) x += seat.x;
				if(seat.y) y += seat.y;
				if(f){
					add_row(row.name,row,x,y);
					f = false;
				}
				add_seat(seat.name,seat,x,y);				
			}
			
			add_row(row.name,row,x,y);
			pos.row.y += pos.seat+pos.offset;
		}
		add_row('',null,pos.row.x,pos.row.y);
		pos.row.h = (pos.y.max - pos.y.min);
		pos.row.w = (pos.x.max - pos.x.min);
		
		var scale = {
			h : pos.height / pos.row.h,
			w : pos.width  / pos.row.w
		};
		seats.push('</div>');
		
        jQuery('#divSeats').remove();
		jQuery(seats.join('')).appendTo(theatre);
		var divSeats = jQuery('#divSeats');
		
        divSeats.css({ 
			position: "absolute", 
			width: pos.row.w+'px', 
			height: pos.row.h+'px'
		});
		var realHeight = pos.y.min + divSeats.outerHeight();
		var realWidth  = pos.x.min + divSeats.outerWidth();
		var zh = pos.height / realHeight;
		var zw = pos.width / realWidth;
		that.zoom = Math.min(zh,zw) / 1.5;
		divSeats.css('transform', 'scale(' + that.zoom + ')');
		that.left = (pos.width - divSeats.outerWidth())/2 - pos.x.min/2;
		divSeats.css('left', that.left+'px');
		that.top = (pos.height - divSeats.outerHeight())/2  - pos.y.min/2;
		divSeats.css('top', that.top+'px');
		that.x = that.left;
		that.y = that.top;
	}

}
TheatreMap.prototype.setup = function(config)
{
	
	var that = this;
	try{

		var org = $.extend({},config);
		var theatreMap = '#theatreMap';
		jQuery(theatreMap).attr('unselectable', 'on').css('user-select', 'none').on('selectstart', false);
		var tm = Date.now();
		var divSeats = document.getElementById('divSeats');
		var step = config.zoom  * config.zoom_step;
		function restore(){
			config = $.extend({},org);
			 jQuery('#divSeats')
				.css('transform', 'scale(' + config.zoom + ')')
				.css({ left: config.paper_left, top: config.paper_top });
		};
		
		jQuery('#menuPlus').off('click');
		jQuery('#menuRestore').off('click');
		jQuery('#menuMinus').off('click');
		jQuery('#menuPlus').on('click',function(e){
			config.zoom += step;
			jQuery('#divSeats')
				.css('transform', 'scale(' + config.zoom + ')');
			e.preventDefault();
		});
		jQuery('#menuRestore').on('click',function(e){
			restore();
			e.preventDefault();
		});
		jQuery('#menuMinus').on('click',function(e){
			config.zoom -= step;
			if(config.zoom<=step) config.zoom = step;
			jQuery('#divSeats')
				.css('transform', 'scale(' + config.zoom + ')');
			e.preventDefault();
		});
		
		function panView( event) {
			var deltaX = event.clientX - config.pan_x;
            var deltaY = event.clientY - config.pan_y;
            config.pan_x = event.clientX;
            config.pan_y = event.clientY;
            config.paper_left += deltaX;
            config.paper_top += deltaY;
            jQuery('#divSeats').css({ left: config.paper_left, top: config.paper_top });
        }	
		function panStop( event){
            if (config.pan_x && config.pan_x >= 0) {
                config.pan_x = -1;
                jQuery(theatreMap).css({
					'cursor': 'default'
				});
                event.preventDefault();
                //return false;
            }
        };
		jQuery(theatreMap)
			.on('dblclick',function (event) {
				restore();
			})
			.on('mouseup mouseleave',function (event) {
				panStop(event);
			})
			.on('mousedown',function (event) {
				if (!config.pan_x || config.pan_x < 0) {
					config.pan_x = event.clientX;
					config.pan_y = event.clientY;
					tm = event.timeStamp || Date.now();
					jQuery(theatreMap).css({
						'cursor': 'move'
					});
					event.preventDefault();
					return false;
				}
			})
			.on('mousemove',function (event) {
				if (!tm) return;
				if (config.pan_x && config.pan_x >= 0) {
					if ((event.timeStamp || Date.now()) - tm > 100) {
						if (!event.which) {
							config.pan_x = -1;
							return;
						}
						tm = event.timeStamp || Date.now();
						panView( event);
						return false;
					}
				}

			});
	}catch(e){
	}
}
