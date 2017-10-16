function node(val,id,parent_id)
{
  this.value = val;
  this.left = null;
  this.right = null;
  this.id = id;
  this.parent_id = parent_id;
}

function BinarySearchTree()
{
  this.root = null;
  this.map = {};
  this.id = 1;
}
BinarySearchTree.prototype.get = function(node_id){
	return this.map[node_id];
}
BinarySearchTree.prototype.add = function(val,parent_id)
{
	var n = new node(val,this.id++,parent_id);
	this.map[n.id] = n;
	return n;
}
BinarySearchTree.prototype.remove = function(node)
{
	var parent = this.map[node.parent_id];
	if(parent){
		if(parent.left && parent.left.id==node.id)
		{
			parent.left = null;
			if(node.left) this.move(parent,node.left);
			if(node.right) this.move(parent,node.right);
		}
		else if(parent.right && parent.right.id==node.id)
		{				
			parent.right = null;
			if(node.right) this.move(parent,node.right);
		}
	}else{
		if(this.root.id==node.id){
			if(node.left){
				this.root = node.left;
				node.left.parent_id = 0;
				
				if(node.right) this.move(this.root,node.right);
			}
			else if(node.right){
				this.root = node.right;
				node.right.parent_id = 0;
			}
			else{
				this.root = null;
			}				
		}
	}
	delete this.map[node.id];
}
BinarySearchTree.prototype.Depth = function(filter,cb)
{
	var found;
	function dfs(node){
		found = filter(node);
		if(found) return;
		if(node.left) 	dfs(node.left);
		if(node.right) 	dfs(node.right);
	}
	if(this.root) dfs(this.root);
	if(!found) 
		cb('Empty');
	else
		cb(false,found);
}
BinarySearchTree.prototype.InOrder = function (filter,cb)
{
	var found;
	function inOrder(node){
		if(node.left) 	inOrder(node.left);
		found = found || filter(node);
		if(found) return;
		if(node.right) 	inOrder(node.right);
	}
	if(this.root) inOrder(this.root);
	if(!found) 
		cb('Empty');
	else
		cb(false,found);
}
BinarySearchTree.prototype.push = function(item)
{
	if(this.root){
		return this.insert(this.root,item);
	}else{
		this.root = this.add(item,0); 
		return this.root;
	}
}
BinarySearchTree.prototype.insert = function(currentNode,item)
{
	while(currentNode){
		if(item.val < currentNode.value.val){
			if(!currentNode.left){
				currentNode.left = this.add(item,currentNode.id); 
				return currentNode.left;
			}
			else{
				currentNode = currentNode.left;
			}
		}
		else{
			if(!currentNode.right){
				currentNode.right = this.add(item,currentNode.id); 
				return currentNode.right;
			}
			else{
				currentNode = currentNode.right;
			}
		}
	}
}
BinarySearchTree.prototype.move = function(currentNode,Node)
{
	while(currentNode){
		if(Node.value.val < currentNode.value.val){
			if(!currentNode.left){
				currentNode.left = Node; 
				Node.parent_id = currentNode.id;
				break;
			}
			else{
				currentNode = currentNode.left;
			}
		}
		else{
			if(!currentNode.right){
				currentNode.right = Node; 
				Node.parent_id = currentNode.id;
				break;
			}
			else{
				currentNode = currentNode.right;
			}
		}
	}
}

module.exports = BinarySearchTree;

/*
var tree = new BinarySearchTree();
	tree.push({
		val : 100,
		title : 'item 1'
	});
	tree.push({
		val : 60,
		title : 'item 2'
	});
	tree.push({
		val : 75,
		title : 'item 3'
	});
	tree.push({
		val : 175,
		title : 'item 13'
	});
	tree.push({
		val : 275,
		title : 'item 31'
	});
	tree.push({
		val : 34,
		title : 'item 4'
	});
	tree.push({
		val : 3,
		title : 'item 5'
	});
	
	function debug(){
		var arr = [];
		tree.InOrder(function(node){
			if(node.value.val<100){
				arr.push(node);
			}
			else 
				return arr;
			
		},function(err,arr){
			if(arr){
				if(arr.length)
					console.info('InOrder',arr);
				else
					console.error('InOrder:Nothing found');
			}
			else
				console.error('InOrder',err);
		});
	}
	debug();
	for(var i=1;i<8;i++)
		tree.remove(tree.get(i));
	
	debug();
	tree.push({
		val : 275,
		title : 'item 31'
	});
	debug();
	
	tree.push({
		val : 275,
		title : 'item 31'
	});
	debug();
	console.error('tree',tree);

*/