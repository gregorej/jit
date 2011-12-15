/*
 *
 * Author: Grzegorz Dyk
 * Class: Layouts.DAG
 * 
 * Implements a DAG Layout.
 * 
 * Implemented By:
 * 
 * <DAG>
 * 
 */

Layouts.DAG = new Class({

  /*
   * Method: compute
   * 
   * Computes nodes' positions.
   * 
   * Parameters:
   * 
   * property - _optional_ A <Graph.Node> position property to store the new
   * positions. Possible values are 'pos', 'end' or 'start'.
   * 
   */
  compute : function(property) {
    var prop = $.splat(property || [ 'current', 'start', 'end' ]);
    NodeDim.compute(this.graph, prop, this.config);
    this.graph.computeLevels(this.root, 0, "ignore");
    var lengthFunc = this.createLevelDistanceFunc(); 
    this.computePositions(prop, lengthFunc);
  },

/*
	copySubtree: function(root) {
		var i = 0; 
		var newRoot = {
			children: [],
			node: root.node
		};
		var newChild;
		for (i = 0; i < root.children.length; i++) {
			newChild = copySubtree(root.children[i]);
			newChild.parent = newRoot;
			newRoot.children.push(newChild);
		}
		return newRoot;
	},
*/
	innerSpace: 1,

	__ACCURACY: 10000,
	
	computePositions: function(property, getLength) {
		var propArray = property;
	    var graph = this.graph;
	    var root = graph.getNode(this.root);
	    var parent = this.parent;
	    var config = this.config;
		var dim = config.Node.dim;
		Log.write("Computing positions");
		var sortedGraph = this.op.topologicalSort(this.graph);
		var tree = this.createTreeCopy(sortedGraph);
		var steps = 2;
		var length, i, l, pi;
		for (i= 1; i <= steps; i++) {
			this.computeSpanForTreeCopy(tree);
			this.reduceEdgeCrossings(sortedGraph, tree);
			$.log("After step " + i);
		}
		this.straightenLevels(sortedGraph);
		
		var scale = this.config.levelDistance;
		var width = tree.width * scale;
		var height = scale * sortedGraph[sortedGraph.length-1].dag.level;
		$.each(sortedGraph, function(n) {
			$.log(n.id+" x="+n.dag.x+", y="+n._depth +", orderWeight = " + n.dag.orderWeight);
			length = getLength(n);
			for (i=0, l = propArray.length; i < l; i++) {
            	pi = propArray[i];
				n.setPos($C(length*n.dag.x - width / 2, length*n._depth - height / 2), pi);
         	}
		});
		
	},

	getNodesByLevel: function(sortedGraph, level) {
		var out = [];
		$.each(sortedGraph, function(n) { if (n.dag.level == level) out.push(n)});
		return out;
	},

	straightenLevels: function(sortedGraph) {
		var levelNum = sortedGraph[sortedGraph.length-1].dag.level;
		//we want to straighten all but the last level
		for (var i = 0; i < levelNum; i++) {
			this.straightenLevel(sortedGraph, i);
		}
	},

	straightenLevel: function(sortedGraph, level) {
		var sc = 3;//Slot count
		var nodes = this.getNodesByLevel(sortedGraph, level);
		var slots = {};
		var optValue = {};
		var pos, sum, count, parentMed, childMed, parentCount, childrenCount;
		var slotSpan = this.innerSpace;
		var accuracy = 10000.0;
		
		//sort nodes by their x position
		nodes.sort(function(n1,n2) { return n1.dag.x - n2.dag.x});
		$.log(nodes);
	
		var that = this;
		//compute slots values
		$.each(nodes, function(n) {
			sum = 0;
			parentCount = 0;
			childrenCount = 0;
			
			slots[n.id] = new Array(sc);
			//compute parent median slot
			n.eachInAdjacency(function(inAdj) {
				sum += n.getNeighbourAlong(inAdj).dag.x;
				parentCount++;
			});
			parentMed = (parentCount > 0)?$.round(sum/parentCount, that.__ACCURACY):n.dag.x;
			$.log("parentMed = " + parentMed +", parentCount = " + parentCount +", sum = " + sum +", normal div = " + (sum/parentCount));
			slots[n.id][1] = {value: (parentCount > 0)?1:0, pos: parentMed};
			
			sum = 0;
			//compute children median slot
			n.eachOutAdjacency(function(outAdj) {
				sum += n.getNeighbourAlong(outAdj).dag.x;
				childrenCount ++;
			});
			childMed = (childrenCount > 0)?$.round(sum/childrenCount, that.__ACCURACY):n.dag.x;
			slots[n.id][2] = {value: (childrenCount > 0)?1:0, pos: childMed};

			slots[n.id][0] = {value: ((parentCount > 0 && n.dag.x == parentMed) || (childrenCount > 0 && n.dag.x == childMed))?1:0, pos:n.dag.x};
		});

		var l = nodes.length;
		var lastNode = nodes[l-1];
		var optValues = new Array(l);
		optValues[l-1] = new Array(sc);
		for (var i = 0; i < sc; i++) {
			optValues[l-1][i] = slots[lastNode.id][i].value;
		}

		$.log("slots");
		$.log(slots);
		var otherNode, node, best,i,m,s;
		for (m = nodes.length-2; m >=0; m--) {
			optValues[m] = new Array(sc);
			otherNode = nodes[m+1];
			node = nodes[m];
			for (s =0; s < sc; s++) {
				best = -1;
				//find best suiting slot for otherNode if node is at slot s
				for (i = 0; i < sc; i++) {
					if (slots[otherNode.id][i].pos > slots[node.id][s].pos) {
						if (best == -1 || optValues[m+1][i] > optValues[m+1][best]) {
							best = i;
						}
					}
				}
				//we may have not found a best slot on the right (s'th slot may be too far to the right)
				optValues[m][s] = ((best > -1)?optValues[m+1][best]+slots[node.id][s].value:0);
			}
		}

		$.log(slots);
		$.log("optValues");
		$.log(optValues);
		best = 0;
		var previousBest = -1;
		for (m=0; m < l; m++) {
			best = 0;
			for (i = 0; i < sc; i++) {
				if (previousBest == -1 || slots[nodes[m-1].id][previousBest].pos < slots[nodes[m].id][i].pos) {
					if (optValues[m][i] > optValues[m][best]) {
						best = i;
					}
				}
			}
			node = nodes[m];
			node.dag.slot = slots[node.id][best];
			node.dag.x = slots[node.id][best].pos;
			previousBest = best;
		}
		$.log(nodes);
		
	},

	createTreeCopyFromNode: function(n) {
		var treeNode = {
			node: n,
			children: [],
		};
		if (!n.dag.copies) {
			n.dag.copies = [];
		}
		n.dag.copies.push(treeNode);
		var otherTreeNode, other;
		var that = this;
		n.eachOutAdjacency(function(adj) {
			other = n.getNeighbourAlong(adj);
			otherTreeNode = that.createTreeCopyFromNode(other);
			otherTreeNode.parent = treeNode;
			treeNode.children.push(otherTreeNode);
		});
		return treeNode;
	},

	createTreeCopy: function(sortedGraph) {
		var i, n;
		//gather top level vertices
		var topLevel = [];
		var n = null;
		for (i = 0; i < sortedGraph.length && (n == null || sortedGraph[i]._depth == n._depth); i++) {
			n = sortedGraph[i];
			topLevel.push(n);
		}
		var root, tn;
		/* add virtual root if needed */
		if (topLevel.length > 1) {
			root = {
				children: [],
				node: null
			}
			for (i = 0; i < topLevel.length; i++) {
				tn = this.createTreeCopyFromNode(topLevel[i]);
				tn.parent = root;
				root.children.push(tn);
			}
		}
		else if (topLevel.length == 1) {
			root = this.createTreeCopyFromNode(topLevel[0]);
		}
		else {
			root = null;
		}
		return root;
	},

	reduceEdgeCrossings: function(sortedGraph, tree) {
		// compute X positions of all nodes
		var i,j,n,m, sum, count;
		for (i = 0; i < sortedGraph.length; i++) {
			n = sortedGraph[i];
			//n's x position is equal to average of x position of all copies
			sum = 0;
			$.each(n.dag.copies, function(tn) { sum += tn.x});
			console.log(n.id+" sum = " + sum);
			n.dag.x = $.round(sum/n.dag.copies.length,this.__ACCURACY);
		}
		
		var currentDepth = 0;
		var count = 0;
		//compute orderWeight for each node
		for (i = 0; i < sortedGraph.length; i++) {
			n = sortedGraph[i];
			if (n._depth > currentDepth) {
				count = i;
				currentDepth = n._depth;
			}
			sum = 0;
			j = 0;
			while ((m = sortedGraph[j])._depth < currentDepth) { j++; sum += m.dag.x};
			n.dag.orderWeight = (count > 0)?sum/count:0;
		};
		//sort all tree copy nodes by order weights
		var tnCompare = function(tn1,tn2) { return tn1.node.orderWeight - tn2.node.orderWeight};
		this.treePreorder(tree, function(n) { n.children.sort(tnCompare)});
	},

	treePreorder: function(treeRoot, fn) {
		fn(treeRoot);
		var i,l;
		for (i = 0, l = treeRoot.children.length; i < l; i++) {
			fn(treeRoot.children[i]);
		}
	},

	computeWidthsForTreeCopy: function(subtree) {
		var i;
		var sum = 0;
		for (i = 0; i < subtree.children.length; i++) {
			this.computeWidthsForTreeCopy(subtree.children[i]);
			sum += subtree.children[i].width;
		}
		//we are assuming self-width to be 1
		subtree.width = Math.max(sum + this.innerSpace * (subtree.children.length-1), 1);
	},

	computeSpanForTreeCopy: function(treeRoot) {
		this.computeWidthsForTreeCopy(treeRoot);
		var that = this;
		if (!treeRoot.span) {
			treeRoot.span = {left:0, right: treeRoot.width};
		}
		treeRoot.x = (treeRoot.span.left + treeRoot.span.right)/2;
		this.treePreorder(treeRoot, function(node) {
			var i;
			var leftOffset = node.span.left;
			var tn;
			for (i = 0; i < node.children.length; i++) {
				tn = node.children[i];
				tn.span = {left: leftOffset, right: leftOffset + tn.width}
				leftOffset += tn.width + that.innerSpace;
				tn.x = (tn.span.right + tn.span.left)/2;
				$.log("id = " + tn.node.id + " x = " + tn.x +", span.left = " + tn.span.left +", span.right = " + tn.span.right +" width = " + tn.width + " leftOffset=" + leftOffset);
			}
		})
	}

});

