
var dagData = [
{
	id:"ews",
	name:"sample_ews",
	data: {
		"$color":"green",
		"$type":"square",
	},
	adjacencies: [{
		data: {"$direction":["ews","ews_part1"]},
		nodeTo: "ews_part1"
	},
	{
		data: {"$direction":["ews","ews_part2"]},
		nodeTo: "ews_part2"
	},
	{
		data: {"$direction":["ews","ews_part3"]},
		nodeTo: "ews_part3"
	}
	]
},
{
	id:"ews_part1",
	name:"sample_ews_part1",
	data: {
		"$color":"green",
		"$type":"triangle",
	},
	adjacencies: [{
		data: {"$direction":["ews_part1", "appliance1"]},
		nodeTo: "appliance1"
	}]
},
{
	id:"ews_part2",
	name:"sample_ews_part2",
	data: {
		"$color":"green",
		"$type":"triangle",
	},
	adjacencies: [{
		data: {"$direction":["ews_part2", "appliance1"]},
		nodeTo: "appliance1"
	}]
},
{
	id:"ews_part3",
	name:"sample_ews_part3",
	data: {
		"$color":"green",
		"$type":"triangle",
	},
	adjacencies: [
		{
			data: {"$direction":["ews_part3", "appliance2"]},
			nodeTo: "appliance2"
		},
		{
			data: {"$direction":["ews_part3", "appliance1"]},
			nodeTo: "appliance1"
		},
	]
},

{
	id:"appliance1",
	name:"sample_appliance1",
	data: {
		"$color":"green",
		"$type":"circle",
	},
	adjacencies: []
},
{
	id:"appliance2",
	name:"sample_appliance2",
	data: {
		"$color":"green",
		"$type":"circle",
	},
	adjacencies: []
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
