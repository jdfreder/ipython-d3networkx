require(["//cdnjs.cloudflare.com/ajax/libs/d3/3.4.1/d3.min.js", "notebook/js/widgetmanager"], function(d3, WidgetManager){

    // Define the D3ForceDirectedGraphView
    var D3ForceDirectedGraphView = IPython.DOMWidgetView.extend({
        
        render: function(){
            this.guid = 'd3force' + IPython.utils.uuid();
            this.setElement($('<div />', {id: this.guid}));
            
            this.model.on('msg:custom', this.on_msg, this);
            this.has_drawn = false;
            
            // Wait for element to be added to the DOM
            var that = this;
            setTimeout(function() {
                that.update();
            }, 0);
        },
        
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
        
        update_node: function(node, attributes) {
            if (node !== null) {
                for (var key in attributes) {
                    node[key] = attributes[key];
                }
                this._update_node(d3.select('#' + this.guid + node.id));
            }
        },
                
        remove_node: function(id){
            this.remove_links_to(id);
            
            var found_index = this.find_node(id);
            if (found_index>=0) {
                this.nodes.splice(found_index, 1);
            }
        },
        
        find_node: function(id){
            var found_index = -1;
            for (var index in this.nodes) {
                if (this.nodes[index].id == id) {
                    found_index = index;
                    break;
                }
            }
            return found_index;
        },
        
        find_link: function(source_id, target_id){
            for (var index in this.links) {
                if (this.links[index].source.id == source_id && this.links[index].target.id == target_id) {
                    return index;
                }
            }
            return -1;
        },
        
        try_add_link: function(source_id, target_id){
            var index = this.find_link(source_id, target_id);
            if (index == -1) {
                var source_node = this.try_add_node(source_id);
                var target_node = this.try_add_node(target_id);
                var new_link = {source: source_node, target: target_node};
                this.links.push(new_link);
                return new_link;
            } else {
                return this.links[index]
            }
        },
        
        update_link: function(link, attributes){
            if (link != null) {
                for (var key in attributes) {
                    link[key] = attributes[key];
                }
                this._update_edge(d3.select('#' + this.guid + link.source.id + "-" + link.target.id));
            }
        },
        
        remove_links: function(source_id){
            var found_indicies = [];
            for (var index in this.links) {
                if (this.links[index].source.id == source_id) {
                    found_indicies.push(index);
                }
            }
            found_indicies.reverse();
            
            for (var index in found_indicies) {
                this.links.splice(index, 1);
            };
        },
        
        remove_links_to: function(id){
            var found_indicies = [];
            for (var index in this.links) {
                if (this.links[index].source.id == id || this.links[index].target.id == id) {
                    found_indicies.push(index);
                }
            }
            found_indicies.reverse();
            
            for (var index in found_indicies) {
                this.links.splice(index, 1);
            };
        },
        
        on_msg: function(content){
            this.update();
            
            var dict = content.dict;
            var action = content.action;
            var key = content.key;
            
            if (dict=='node') {
                if (action=='add' || action=='set') {
                    this.update_node(this.try_add_node(key), content.value)
                } else if (action=='del') {
                    this.remove_node(key);
                }
                
            } else if (dict=='adj') {
                if (action=='add' || action=='set') {
                    var links = content.value;
                    for (var target_id in links) {
                        this.update_link(this.try_add_link(key, target_id), links[target_id]);
                    }
                } else if (action=='del') {
                    this.remove_links(key);
                }
            }
            this.start();
        },
        
        start: function() {
            var node = this.svg.selectAll(".node"),
                link = this.svg.selectAll(".link");
            
            var link = link.data(this.force.links(), function(d) { return d.source.id + "-" + d.target.id; });
            this._update_edge(link.enter().insert("line", ".node"))
            link.exit().remove();
            
            var node = node.data(this.force.nodes(), function(d) { return d.id;});
            var that = this;
            this._update_node(node.enter().append("circle"));
            node.exit().remove();
            
            this.force.start();
        },
        
        _update_node: function(node) {
            var that = this;
            node
                .attr("id", function(d) { return that.guid + d.id; })
                .attr("class", function(d) { return "node " + d.id; })
                .attr("r", function(d) {
                    if (d.r == undefined) {
                        return 8; 
                    } else {
                        return d.r;
                    }
                    
                })
                .style("fill", function(d) {
                    if (d.fill == undefined) {
                        return that.color(d.group); 
                    } else {
                        return d.fill;
                    }
                    
                })
                .style("stroke", function(d) {
                    if (d.stroke == undefined) {
                        return "#FFF"; 
                    } else {
                        return d.stroke;
                    }
                    
                })
                .style("stroke-width", function(d) {
                    if (d.strokewidth == undefined) {
                        return "#FFF"; 
                    } else {
                        return d.strokewidth;
                    }
                    
                })
                .call(this.force.drag);
        },
        
        _update_edge: function(edge) {
            var that = this;
            edge
                .attr("id", function(d) { return that.guid + d.source.id + "-" + d.target.id; })
                .attr("class", "link")
                .style("stroke-width", function(d) {
                    if (d.strokewidth == undefined) {
                        return "1.5px"; 
                    } else {
                        return d.strokewidth;
                    }
                    
                })
                .style('stroke', function(d) {
                    if (d.stroke == undefined) {
                        return "#999"; 
                    } else {
                        return d.stroke;
                    }
                    
                });
        },
        
        tick: function() {
            var node = this.svg.selectAll(".node"),
                link = this.svg.selectAll(".link");
            
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });
        
            node.attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
        },
        
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
                            return -260;
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
                            return 0.2;
                        } else {
                            return d.strength;
                        }
                    })
                    .size([width, height])
                    .on("tick", $.proxy(this.tick, this));
                
                this.svg = d3.select("#" + this.guid).append("svg")
                    .attr("width", width)
                    .attr("height", height);
                
                var that = this;
                setTimeout(function() {
                    that.start();
                }, 0);
            }
            
            return D3ForceDirectedGraphView.__super__.update.apply(this);
        },
        
    });
        
    // Register the D3ForceDirectedGraphView with the widget manager.
    WidgetManager.register_widget_view('D3ForceDirectedGraphView', D3ForceDirectedGraphView);
});