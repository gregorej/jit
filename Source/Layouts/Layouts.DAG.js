/*
 * Class: Layouts.DAG
 * 
 * Implements a Radial Layout.
 * 
 * Implemented By:
 * 
 * <RGraph>, <Hypertree>
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
    this.computeAngularWidths(prop);
    this.computePositions(prop, lengthFunc);
  },

  /*
   * computePositions
   * 
   * Performs the main algorithm for computing node positions.
   */
  _computePositions : function(property, getLength) {
    var propArray = property;
    var graph = this.graph;
    var root = graph.getNode(this.root);
    var parent = this.parent;
    var config = this.config;
	Log.write("Computing positions");
	
	

    for ( var i=0, l=propArray.length; i < l; i++) {
      var pi = propArray[i];
      root.setPos($P(0, 0), pi);
      root.setData('span', Math.PI * 2, pi);
    }

    root.angleSpan = {
      begin : 0,
      end : 2 * Math.PI
    };

    graph.eachBFS(this.root, function(elem) {
      var angleSpan = elem.angleSpan.end - elem.angleSpan.begin;
      var angleInit = elem.angleSpan.begin;
      var len = getLength(elem);
      //Calculate the sum of all angular widths
      var totalAngularWidths = 0, subnodes = [], maxDim = {};
      elem.eachSubnode(function(sib) {
        totalAngularWidths += sib._treeAngularWidth;
        //get max dim
        for ( var i=0, l=propArray.length; i < l; i++) {
          var pi = propArray[i], dim = sib.getData('dim', pi);
          maxDim[pi] = (pi in maxDim)? (dim > maxDim[pi]? dim : maxDim[pi]) : dim;
        }
        subnodes.push(sib);
      }, "ignore");
      //Maintain children order
      //Second constraint for <http://bailando.sims.berkeley.edu/papers/infovis01.htm>
      if (parent && parent.id == elem.id && subnodes.length > 0
          && subnodes[0].dist) {
        subnodes.sort(function(a, b) {
          return (a.dist >= b.dist) - (a.dist <= b.dist);
        });
      }
      //Calculate nodes positions.
      for (var k = 0, ls=subnodes.length; k < ls; k++) {
        var child = subnodes[k];
        if (!child._flag) {
          var angleProportion = child._treeAngularWidth / totalAngularWidths * angleSpan;
          var theta = angleInit + angleProportion / 2;

          for ( var i=0, l=propArray.length; i < l; i++) {
            var pi = propArray[i];
            child.setPos($P(theta, len), pi);
            child.setData('span', angleProportion, pi);
            child.setData('dim-quotient', child.getData('dim', pi) / maxDim[pi], pi);
          }

          child.angleSpan = {
            begin : angleInit,
            end : angleInit + angleProportion
          };
          angleInit += angleProportion;
        }
      }
    }, "ignore");
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
		var length;
		for (var i= 1; i <= steps; i++) {
			this.computeSpanForTreeCopy(tree);
			this.computeOrderWeights(sortedGraph, tree);
			console.log("After step " + i);
		}

		$.each(sortedGraph, function(n) {
			console.log(n.id+" x="+n.dag.x+", y="+n._depth +", orderWeight = " + n.dag.orderWeight);
			length = getLength(n);
			n.setPos($C(length*n.dag.x, length*n._depth));
		});
		
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
		for (i = 0; i < sortedGraph.length; i++) {
			sortedGraph[i].dag = {};
		}
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

	computeOrderWeights: function(sortedGraph, tree) {
		// compute X positions of all nodes
		var i,j,n,m, sum, count;
		for (i = 0; i < sortedGraph.length; i++) {
			n = sortedGraph[i];
			//n's x position is equal to average of x position of all copies
			sum = 0;
			$.each(n.dag.copies, function(tn) { sum += tn.x});
			console.log(n.id+" sum = " + sum);
			n.dag.x = sum/n.dag.copies.length;
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
				console.log("id = " + tn.node.id + " x = " + tn.x +", span.left = " + tn.span.left +", span.right = " + tn.span.right +" width = " + tn.width + " leftOffset=" + leftOffset);
			}
		})
	},

  /*
   * Method: setAngularWidthForNodes
   * 
   * Sets nodes angular widths.
   */
  setAngularWidthForNodes : function(prop) {
    this.graph.eachBFS(this.root, function(elem, i) {
      var diamValue = elem.getData('angularWidth', prop[0]) || 5;
      elem._angularWidth = diamValue / i;
    }, "ignore");
  },

  /*
   * Method: setSubtreesAngularWidth
   * 
   * Sets subtrees angular widths.
   */
  setSubtreesAngularWidth : function() {
    var that = this;
    this.graph.eachNode(function(elem) {
      that.setSubtreeAngularWidth(elem);
    }, "ignore");
  },

  /*
   * Method: setSubtreeAngularWidth
   * 
   * Sets the angular width for a subtree.
   */
  setSubtreeAngularWidth : function(elem) {
    var that = this, nodeAW = elem._angularWidth, sumAW = 0;
    elem.eachSubnode(function(child) {
      that.setSubtreeAngularWidth(child);
      sumAW += child._treeAngularWidth;
    }, "ignore");
    elem._treeAngularWidth = Math.max(nodeAW, sumAW);
  },

  /*
   * Method: computeAngularWidths
   * 
   * Computes nodes and subtrees angular widths.
   */
  computeAngularWidths : function(prop) {
    this.setAngularWidthForNodes(prop);
    this.setSubtreesAngularWidth();
  }

});

