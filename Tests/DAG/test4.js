
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
		data: {"$direction":["root","part_no_children"]},
		nodeTo: "part_no_children"
	},
	{
		data: {"$direction":["root","part_with_children"]},
		nodeTo: "part_with_children"
	}
	]
},
{
	id:"part_no_children"
},
{
	id:"part_with_children",
	adjacencies: [
	{
		data: {"$direction":["part_with_children","appliance1"]},
		nodeTo: "appliance1"
	},
	{
		data: {"$direction":["part_with_children","appliance2"]},
		nodeTo: "appliance2"
	}]
},
{
	id:"appliance1",
	adjacencies: [
	{
		data: {"$direction":["appliance1","vm1"]},
		nodeTo: "vm1"
	}
	]
},
{
	id:"appliance2",
	adjacencies: [
	{
		data: {"$direction":["appliance2","vm2"]},
		nodeTo: "vm2"
	}]
},
{
	id: "vm1"
},
{
	id: "vm2"
}
];
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
