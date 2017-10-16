# jsDB

NoSQL nodejs in-memory data structure store.

# Features  :
	 - multiple data store pools.
	 - add - add new item to store.
	 - del - remove item from store.
	 - exists - check if item exists.
	 - expired - call specific function with expired items.
	 - expire - set item expiration, in seconds.
	 - unexpire - remove previously registered expiration node.
	 - get - get stored item.
	 - register - register JS function.
	 - unregister - unregister JS function.
	 - call - call register JS function with arguments.
	 
	$ support custom JavaScript script functions.
	$ trigger special function on store item expiration.
# Installation :
    $ npm install jsdb-nosql -save
    
# Sample Client  :
  - client.js and theatre.js
  
#  jsDB Server :
```sh
$ const jsDB = require('jsdb-nosql')
$ //jsDB.port = xxxxx; // same should be for client
$ jsDB.server();
```

# request samples :
    jsDB_request.js
    
# Demo :
     - booking :
     http://m8s.nsupdate.info/lucky/proj/theatre/index.html
     - cart :
     http://m8s.nsupdate.info/lucky/proj/theatre/cart.html
     - order :
     http://m8s.nsupdate.info/lucky/proj/theatre/order.html
      


