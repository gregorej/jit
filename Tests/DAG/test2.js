
var dagData = [
{
	id:"root",
	name:"Root",
	data: {
		"$color":"green",
		"$type":"circle",
	},
	adjacencies: [
	{
		data: {"$direction":["root","child1"]},
		nodeTo: "child1"
	},
	{
		data: {"$direction":["root","child2"]},
		nodeTo: "child2"
	},
	{
		data: {"$direction":["root","child3"]},
		nodeTo: "child3"
	},
	{
		data: {"$direction":["root","child4"]},
		nodeTo: "child4"
	},
	{
		data: {"$direction":["root","child5"]},
		nodeTo: "child5"
	}
	]
},
{
	id:"child1"
},
{
	id:"child2"
},
{
	id:"child3"
},
{
	id:"child4"
},
{
	id:"child5"
}
]
var dag;

function init() {

	dag = new $jit.DAG({
//id of the visualization container
      injectInto: "infovis",
      Node: {
          dim: 9,
          overridable: true
      },
      Edge: {
          lineWidth: 1,
		overridable: true,
          color: "#088",
		type: "arrow"
      },
      onBeforeCompute: function(node){
          Log.write("centering");
      },
	Navigation: {
      enable: true,
      //Enable panning events only if we're dragging the empty
      //canvas (and not a node).
      panning: 'avoid nodes',
      zooming: 200 //zoom speed. higher is more sensible
    },
	// Add node events
    Events: {
      enable: true,
      type: 'Native',
      //Change cursor style when hovering a node
      onMouseEnter: function() {
        dag.canvas.getElement().style.cursor = 'move';
      },
      onMouseLeave: function() {
        dag.canvas.getElement().style.cursor = '';
      },
      //Update node positions when dragged
      onDragMove: function(node, eventInfo, e) {
        var pos = eventInfo.getPos();
		Log.write(e);
        node.pos.setc(pos.x, pos.y);
        dag.plot();
      },

      //Implement the same handler for touchscreens
      onTouchMove: function(node, eventInfo, e) {
        $jit.util.event.stop(e); //stop default touchmove event
        this.onDragMove(node, eventInfo, e);
      }
    },
	
	
	levelDistance: 70,
     // This method is only triggered
    // on label creation and only for DOM labels (not native canvas ones).
      // Change node styles when DOM labels are placed
    // or moved.
    onPlaceLabel: function(domElement, node){
      var style = domElement.style;
      var left = parseInt(style.left);
      var top = parseInt(style.top);
      var w = domElement.offsetWidth;
      style.left = (left - w / 2) + 'px';
      style.top = (top + 10) + 'px';
      style.display = '';
    }

    });

	dag.loadJSON(dagData);

	dag.compute();
	dag.plot();
}
