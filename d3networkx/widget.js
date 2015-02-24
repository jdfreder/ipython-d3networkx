define(function(require) {
    var d3 = require('https://cdnjs.cloudflare.com/ajax/libs/d3/3.4.1/d3.min.js');
    var utils = require('base/js/utils');
    var widget = require('widgets/js/widget');

    // Define the D3ForceDirectedGraphView
    var D3ForceDirectedGraphView = widget.DOMWidgetView.extend({
        
        /**
         * Render the widget content
         */
        render: function(){
            this.guid = 'd3force' + utils.uuid();
            this.setElement($('<div />', {id: this.guid}));
            
            this.model.on('msg:custom', this.on_msg, this);
            this.has_drawn = false;
            
            // Wait for element to be added to the DOM
            this.once('displayed', this.update, this);
        },
        
        /**
         * Adds a node if it doesn't exist yet
         * @param  {string} id - node id
         * @return {object} node, either the new node or the node that already
         *                  existed with the id specified.
         */
        try_add_node: function(id){
            var index = this.find_node(id);
            if (index == -1) {
                var node = {id: id};
                this.nodes.push(node);
                return node;
            } else {
                return this.nodes[index];
            }
        },
        
        /**
         * Update a node's attributes
         * @param  {object} node
         * @param  {object} attributes - dictionary of attribute key/values
         */
        update_node: function(node, attributes) {
            if (node !== null) {
                for (var key in attributes) {
                    if (attributes.hasOwnProperty(key)) {
                        node[key] = attributes[key];
                    }
                }
                this._update_circle(d3.select('#' + this.guid + node.id));
                this._update_text(d3.select('#' + this.guid + node.id + '-text'));
            }
        },
        
        /**
         * Remove a node by id
         * @param  {string} id
         */
        remove_node: function(id){
            this.remove_links_to(id);
            
            var found_index = this.find_node(id);
            if (found_index != -1) {
                this.nodes.splice(found_index, 1);
            }
        },
        
        /**
         * Find a node's index by id
         * @param  {string} id
         * @return {integer} node index or -1 if not found
         */
        find_node: function(id){
            for (var i = 0; i < this.nodes.length; i++) {
                if (this.nodes[i].id == id) return i;
            }
            return -1;
        },
        
        /**
         * Find a link's index by source and destination node ids.
         * @param  {string} source_id - source node id
         * @param  {string} target_id - destination node id
         * @return {integer} link index or -1 if not found
         */
        find_link: function(source_id, target_id){
            for (var i = 0; i < this.links.length; i++) {
                var link = this.links[i];
                if (link.source.id == source_id && link.target.id == target_id) {
                    return i;
                }
            }
            return -1;
        },
        
        /**
         * Adds a link if the link could not be found.
         * @param  {string} source_id - source node id
         * @param  {string} target_id - destination node id
         * @return {object} link
         */
        try_add_link: function(source_id, target_id){
            var index = this.find_link(source_id, target_id);
            if (index == -1) {
                var source_node = this.try_add_node(source_id);
                var target_node = this.try_add_node(target_id);
                var new_link = {source: source_node, target: target_node};
                this.links.push(new_link);
                return new_link;
            } else {
                return this.links[index];
            }
        },
        
        /**
         * Updates a link with attributes
         * @param  {object} link
         * @param  {object} attributes - dictionary of attribute key/value pairs
         */
        update_link: function(link, attributes){
            if (link) {
                for (var key in attributes) {
                    if (attributes.hasOwnProperty(key)) {
                        link[key] = attributes[key];
                    }
                }
                this._update_edge(d3.select('#' + this.guid + link.source.id + "-" + link.target.id));
            }
        },
        
        /**
         * Remove links with a given source node id.
         * @param  {string} source_id - source node id
         */
        remove_links: function(source_id){
            var found_indicies = [];
            var i;
            for (i = 0; i < this.links.length; i++) {
                if (this.links[i].source.id == source_id) {
                    found_indicies.push(i);
                }
            }

            // Remove the indicies in reverse order.
            found_indicies.reverse();
            for (i = 0; i < found_indicies.length; i++) {
                this.links.splice(found_indicies[i], 1);
            }
        },
        
        /**
         * Remove links to or from a given node id.
         * @param  {string} id - node id
         */
        remove_links_to: function(id){
            var found_indicies = [];
            var i;
            for (i = 0; i < this.links.length; i++) {
                if (this.links[i].source.id == id || this.links[i].target.id == id) {
                    found_indicies.push(i);
                }
            }

            // Remove the indicies in reverse order.
            found_indicies.reverse();
            for (i = 0; i < found_indicies.length; i++) {
                this.links.splice(found_indicies[i], 1);
            }
        },
        
        /**
         * Handles custom widget messages
         * @param  {object} content - msg content
         */
        on_msg: function(content){
            this.update();
            
            var dict = content.dict;
            var action = content.action;
            var key = content.key;
            
            if (dict=='node') {
                if (action=='add' || action=='set') {
                    this.update_node(this.try_add_node(key), content.value);
                } else if (action=='del') {
                    this.remove_node(key);
                }
                
            } else if (dict=='adj') {
                if (action=='add' || action=='set') {
                    var links = content.value;
                    for (var target_id in links) {
                        if (links.hasOwnProperty(target_id)) {
                            this.update_link(this.try_add_link(key, target_id), links[target_id]);
                        }
                    }
                } else if (action=='del') {
                    this.remove_links(key);
                }
            }
            this.render_d3();
        },
        
        /**
         * Render the d3 graph
         */
        render_d3: function() {
            var node = this.svg.selectAll(".gnode"),
                link = this.svg.selectAll(".link");
            
            link = link.data(this.force.links(), function(d) { return d.source.id + "-" + d.target.id; });
            this._update_edge(link.enter().insert("line", ".gnode"));
            link.exit().remove();
            
            node = node.data(this.force.nodes(), function(d) { return d.id;});

            var gnode = node.enter()
                .append("g")
                .attr('class', 'gnode')
                .call(this.force.drag);
            this._update_circle(gnode.append("circle"));
            this._update_text(gnode.append("text"));
            node.exit().remove();
            
            this.force.start();
        },

        /**
         * Updates a d3 rendered circle
         * @param  {D3Node} circle
         */
        _update_circle: function(circle) {
            var that = this;

            circle
                .attr("id", function(d) { return that.guid + d.id; })
                .attr("class", function(d) { return "node " + d.id; })
                .attr("r", function(d) {
                    if (d.r === undefined) {
                        return 8; 
                    } else {
                        return d.r;
                    }
                    
                })
                .style("fill", function(d) {
                    if (d.fill === undefined) {
                        return that.color(d.group); 
                    } else {
                        return d.fill;
                    }
                    
                })
                .style("stroke", function(d) {
                    if (d.stroke === undefined) {
                        return "#FFF"; 
                    } else {
                        return d.stroke;
                    }
                    
                })
                .style("stroke-width", function(d) {
                    if (d.strokewidth === undefined) {
                        return "#FFF"; 
                    } else {
                        return d.strokewidth;
                    }
                    
                })
                .attr('dx', 0)
                .attr('dy', 0);
        },
        
        /**
         * Updates a d3 rendered fragment of text
         * @param  {D3Node} text
         */
        _update_text: function(text) {
            var that = this;

            text
                .attr("id", function(d) { return that.guid + d.id + '-text'; })
                .text(function(d) { 
                    if (d.label) {
                        return  d.label;
                    } else {
                        return '';
                    }
                })
                .style("font-size",function(d) { 
                    if (d.font_size) {
                        return  d.font_size;
                    } else {
                        return '11pt';
                    }
                })
                .attr("text-anchor", "middle")
                .style("fill", function(d) { 
                    if (d.color) {
                        return  d.color;
                    } else {
                        return 'white';
                    }
                })
                .attr('dx', function(d) { 
                    if (d.dx) {
                        return  d.dx;
                    } else {
                        return 0;
                    }
                })
                .attr('dy', function(d) { 
                    if (d.dy) {
                        return  d.dy;
                    } else {
                        return 5;
                    }
                })
                .style("pointer-events", 'none');
        },
        
        /**
         * Updates a d3 rendered edge
         * @param  {D3Node} edge
         */
        _update_edge: function(edge) {
            var that = this;
            edge
                .attr("id", function(d) { return that.guid + d.source.id + "-" + d.target.id; })
                .attr("class", "link")
                .style("stroke-width", function(d) {
                    if (d.strokewidth === undefined) {
                        return "1.5px"; 
                    } else {
                        return d.strokewidth;
                    }
                    
                })
                .style('stroke', function(d) {
                    if (d.stroke === undefined) {
                        return "#999"; 
                    } else {
                        return d.stroke;
                    }
                    
                });
        },
        
        /**
         * Handles animation
         */
        tick: function() {
            var gnode = this.svg.selectAll(".gnode"),
                link = this.svg.selectAll(".link");
            
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            // Translate the groups
            gnode.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });  
        },
        
        /**
         * Handles when the widget traits change.
         */
        update: function(){
            if (!this.has_drawn) {
                this.has_drawn = true;
                var width = this.model.get('width'),
                    height = this.model.get('height');
                
                this.color = d3.scale.category20();
                
                this.nodes = [];
                this.links = [];
                
                this.force = d3.layout.force()
                    .nodes(this.nodes)
                    .links(this.links)
                    .charge(function (d) {
                        if (d.charge === undefined) {
                            return -280;
                        } else {
                            return d.charge;
                        }
                    })
                    .linkDistance(function (d) {
                        if (d.distance === undefined) {
                            return 30;
                        } else {
                            return d.distance;
                        }
                    })
                    .linkStrength(function (d) {
                        if (d.strength === undefined) {
                            return 0.3;
                        } else {
                            return d.strength;
                        }
                    })
                    .size([width, height])
                    .on("tick", $.proxy(this.tick, this));
                
                this.svg = d3.select("#" + this.guid).append("svg")
                    .attr("width", width)
                    .attr("height", height);
            }

            var that = this;
            setTimeout(function() {
                that.render_d3();
            }, 0);
            return D3ForceDirectedGraphView.__super__.update.apply(this);
        },
        
    });

    return {
        D3ForceDirectedGraphView: D3ForceDirectedGraphView
    };  
});