// D3 Pack Layout Map
//
// Data visualization map used to show counts of different categories of data per region
// in a color coded / visually distinct format using d3's pack layout feature to pack
// the data bubbles into a meaningful visual layout based on the bounding boxes of each region
//
// author: mocxd (mocxd.github.io)
// requires in load order:
// D3                 - //d3js.org/d3.v3.min.js
// topoJSON           - //d3js.org/topojson.v1.min.js
// D3 geo projection  - //d3js.org/d3.geo.projection.v0.min.js
// D3 queue           - //d3js.org/queue.v1.min.js

// config
var mobileOnly  = '(max-width: 767px)',
mapClass        = '.b-pack-map',
width           = 1200,
height          = 800,
scale           = 200
;

// disable the map on mobile (ie replace with something else)
if (window.matchMedia(mobileOnly).matches) {

  console.log('Mobile, map disabled');

} else { // desktop

  // configurable regions
  // set up custom regions by removing / adding entries
  // fields:
  // (key)      - short code for region
  // name       - region name
  // geometries - array of geometry IDs for each country to be included in the region (see geometryid.log)
  // translate  - a vector to translate the center of the bounding box
  //              (useful for regions where the visual focal point is not the actual center of the bounding box)
  var regions = {
    'af': {
      'name': 'Africa',
      'geometries': [12, 24, 204, 72, 854, 108, 120, 132, 140, 148, 174, 178, 180, 262, 818,
      226, 232, 231, 266, 270, 288, 324, 624, 384, 404, 426, 430, 434, 450,
      454, 466, 478, 480, 504, 508, 516, 562, 566, 646, 678, 686, 690, 694,
      706, 710, 728, 729, 748, 834, 768, 788, 800, 894, 716
      ],
      'translate': {
        x: 0,
        y: -1
      }
    },
    'as': {
      'name': 'Asia',
      'geometries': [4, 48, 50, 64, 96, 116, 104, 156, 626, 86, 360, 364, 368, 376, 392, 400,
      398, 408, 410, 414, 417, 418, 422, 458, 462, 496, 524, 512, 586, 608,
      634, 643, 682, 702, 144, 760, 762, 764, 792, 795, 784, 860, 704, 887
      ],
      'translate': {
        x: 4,
        y: 0
      }
    },
    'eu': {
      'name': 'Europe',
      'geometries': [8, 20, 51, 40, 31, 112, 56, 70, 100, 191, 196, 203, 208, 233, 246, 250,
      268, 276, 300, 348, 352, 372, 380, 428, 438, 440, 442, 807, 470, 498, 492,
      499, 528, 578, 616, 620, 642, 674, 688, 703, 705, 724, 752, 756, 804, 826,
      336, 304, 352
      ],
      'translate': {
        x: 0,
        y: 0
      }
    },
    'na': {
      'name': 'North America',
      'geometries': [28, 44, 52, 84, 124, 188, 192, 212, 214, 222, 308, 320, 332, 340, 388, 484,
      558, 591, 659, 662, 670, 780, 840
      ],
      'translate': {
        x: -4,
        y: 1
      }
    },
    'oc': {
      'name': 'Oceania',
      'geometries': [36, 242, 296, 584, 583, 520, 554, 585, 598, 882, 90, 776, 548],
      'translate': {
        x: 6,
        y: 0
      }
    },
    'sa': {
      'name': 'South America',
      'geometries': [32, 68, 76, 152, 170, 218, 328, 600, 604, 740, 858, 862],
      'translate': {
        x: 1,
        y: 0
      }
    }
  };

  // maybe move down to click handler
  var active = d3.select(null);

  // set up the geo projection. we are using mercator, but any of the following could be used:
  // var projection = d3.geo.albersUsa()
  // var projection = d3.geo.kavrayskiy7()
  // var projection = d3.geo.equirectangular()
  var projection = d3.geo.mercator()
  .scale(scale)
  .translate([width / 2, height / 1.5]),
  path = d3.geo.path()
  .projection(projection);

  // build the base svg and related elements
  var svg = d3.select(mapClass).append('svg')
  .attr('width', width)
  .attr('height', height);
  svg.append('rect')
  .attr('class', 'background')
  .attr('width', width)
  .attr('height', height);
  var g = svg.append('g')
  .style('stroke-width', '1.5px');

  // utility function to create a shade based on array of rgb values and scalar
  function shade(rgb, v) {
    for (var i in rgb) {
      rgb[i] = rgb[i] * v > 255 ? 255 : rgb[i] * v;
    }
    return rgb;
  }

  // filter an object recursively based on a function f
  function filterObject (obj, f) {
    var result = {};
    if (f(obj)) {
      for (var key in obj) {
        if (typeof obj[key] === 'object') {
          if (!Array.isArray(obj[key])) {
            var r = filterObject(obj[key], f);
            if (r) { result[key] = r; };
          }
          else {
            result[key] = [];
            for (i in obj[key]) {
              var r = filterObject(obj[key][i], f);
              if (r) { result[key].push(r); }
            }
          }
        } else {
          result[key] = obj[key];
        }
      }
      return result;
    }
    return false;
  }

  // event handlers

  var colors = {
    'government' : [0, 138, 179],
    'citizens' : [238, 91, 67],
    'economic' : [194, 195, 59],
    'public' : [173, 0, 84]
  };

  var baseColors = {};

  function clicked(d) {
    var region = d.location || this.id.replace(/^(_bubble_|_text_)/, '');
    d3.selectAll('.region').classed('selected', false);
    d3.select('#' + region).classed('selected', true);
  }

  function highlight(d) {
    var region = d.location || this.id.replace(/^(_bubble_|_text_)/, ''),
    bubble = this.id.replace(/^(?!_bubble_|_text_)|_text_/, '_bubble_'),
    impact = this.id.replace(/^[^-]*-?/, '');

    baseColors[bubble] = d3.select('#' + bubble).style('fill');
    for (var k in colors) {
      if (!d3.select('#' + bubble + '-' + k).empty()) {
        baseColors[bubble + '-' + k] = d3.select('#' + bubble + '-' + k).style('fill');
        d3.select('#' + bubble + '-' + k).classed('active', true)
        .style('fill', function(d) {
          return d3.rgb.apply(null, colors[k]);
        });
      }
    }

    d3.select('.map-caption').text(regions[region].name)
    .classed('default', false);
    d3.select('#' + region).classed('active', true);
    d3.select('#' + bubble).classed('active', true)
    .style('fill', function(d) {
      if (impact in colors) {
        return d3.rgb.apply(null, colors[impact]);
      } else {
        return d3.rgb(0, 138, 179);
      }
    });

    d3.selectAll('.node, .parent').classed('fade', true);

    if (!(d3.select('#' + this.id).classed('region'))) {
      zoomBubble('#' + bubble, 1.1);
    }
  }

  function deHighlight(d) {
    var region = d.location || this.id.replace(/_bubble_|_text_/, ''),
    bubble = this.id.replace(/^(?!_bubble_|_text_)|_text_/, '_bubble_');

    if (bubble in baseColors) {
      d3.select('#' + bubble)
      .style('fill', function(d) {
        return baseColors[bubble]
      });
    }

    d3.selectAll('.node, .parent').classed('fade', false);

    d3.select('.map-caption').text('Select a Region')
    .classed('default', true);
    d3.select('#' + region).classed('active', false);
    d3.select('#' + bubble).classed('active', false);
    for (var k in colors) {
      d3.select('#' + bubble + '-' + k).classed('active', false)
      .style('fill', function(d) {
        return baseColors[bubble + '-' + k];
      });
    }
    if (!d3.select('#' + this.id).classed('region')) {
      zoomBubble('#' + bubble, -1);
    }

    // resetBubble('#' + bubble);
  }

  // bubble radius animation
  var intervals = {};

  function resetBubble(elem) {
    if (d3.select(elem)[0][0] === null) {
      return -1;
    }

    var e = d3.select(elem),
    eid = e.attr('id'),
    defaultSize = e.datum().r;

    if (eid in intervals && intervals[eid] > 0) {
      clearInterval(intervals[eid]);
    }

    e.attr('r', defaultSize);
  }

  function zoomBubble(elem, zoom) {
    if (d3.select(elem)[0][0] === null) {
      return -1;
    }

    var
    frames = 60,
    e = d3.select(elem),
    r = Number(e.attr('r')),
    eid = e.attr('id'),
    x = 0;

    var defaultSize = e.datum().r;

    function frame() {
      if (zoom > 0) {
        e.attr('r', r + (zoom * defaultSize - r) * (x / frames));
        x++;

        if (x >= frames) {
          clearInterval(id);
        }
      } else { // reset to original size
        e.attr('r', r - (r - defaultSize) * (x / frames));
        x++;

        if (x >= frames) {
          clearInterval(id);
        }
      }
    }

    if (eid in intervals && intervals[eid] > 0) {
      clearInterval(intervals[eid]);
    }
    var id = setInterval(frame, 1);
    intervals[eid] = id;

    return id;
  }

  // Returns a flattened hierarchy containing all leaf nodes under the root.
  // function classes(root) {
  //   var classes = [];

  //   function recurse(name, node) {
  //     if (node.children) node.children.forEach(function(child) { recurse(node.name, child); });
  //     else classes.push({packageName: name, className: node.name, value: node.size});
  //   }

  //   recurse(null, root);
  //   return {children: classes};
  // }

  // process the various input data sets into our map
  // called with queue()
  function ready(error, world, studies, names) {
    if (error) throw error;

    // get country names from topojson
    var countries = topojson.feature(world, world.objects.countries).features;
    countries = countries.filter(function(d) {
      return names.some(function(n) {
        if (d.id == n.id) return d.name = n.name;
      });
    }).sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });

    // draw map ...

    // add regions
    for (var r in regions) {
      g.append('path')
      .datum(topojson.merge(world, world.objects.countries.geometries.filter(function(d, i) {
        return d3.set(regions[r].geometries).has(d.id);
      })))
      .attr('class', 'region')
      .attr('id', r)
      .attr('d', path)
      .on("click", clicked)
      .on("mouseover", highlight)
      .on("mouseout", deHighlight);
    }

    // ... finished drawing map

    // draw bubbles ...

    // tally counts for impact categories based on the json data and flag any child nodes that bump the count
    // above 1 as plurals to be filtered from the visualization
    // NOTE: this data could be pre-processed by gulp to improve page load
    var _sc = studies.children; // trim root node and assign to a temporary var for readability
    for (var region in _sc) {
      var _r = _sc[region],
      base = 2, // log base for bubble size curve
      scale = 80; // multiplier for bubble size curve

      // set top-level sizes for regions based on log of the total number of children
      // _sc[region].size = (Math.log(_r.children.length + 1) / Math.log(base)) * scale;
      _sc[region].impacts = {}; // <-- this part needs to be made extensible

      // iterate through each study in the region
      var _scc = _sc[region].children; // assign and trim for readability
      for (var study in _scc) {
        var _s = _scc[study];

        // increment count or add counter if it is not in the parent node yet
        if (!_sc[region].impacts.hasOwnProperty(_s.impact)) {
          _sc[region].impacts[_s.impact] = 1;
        } else {
          _sc[region].impacts[_s.impact] ++;
          // flag as a plural entry in the category, in case we want to filter from node structure
          // in certain visualizations (eg we just want to display counts only)
          _scc[study].plural = true;
        }
        // add a normalized default size to the study based on the log scaling (ie with a parameter of 1)
        // _scc[study].size = (Math.log(2) / Math.log(base)) * scale;
      }
      _sc[region].children = _scc; // re-insert modified structure (case studies)

      // calculate totals
      _sc[region].total = 0;
      for (var i in _sc[region].impacts) {
        _sc[region].total += _sc[region].impacts[i];
      }
      _sc[region].size = (Math.log(_sc[region].total + 1) / Math.log(base)) * scale;

      // calculate sizes for categories based on the count
      // this may need to be improved to allow for retaining a base size (above) for each most-granular datum
      // so that we can 'drill' from abstract to specific all the way down to the individual data
      var _scc = _sc[region].children;
      for (var study in _scc) {
        var _s = _scc[study];
        _scc[study].size = (Math.log(_sc[region].impacts[_s.impact] + 1) / Math.log(base)) * scale;
      }
      _sc[region].children = _scc;
    }
    studies.children = _sc; // re-insert modified structure (regions)

    // find max category counts accross children and insert into root node
    studies.impacts = {};
    for (var i in studies.children) {
      for (var j in studies.children[i].impacts) {
        if (!studies.impacts.hasOwnProperty(j)) {
          studies.impacts[j] = [];
        }
        studies.impacts[j].push(studies.children[i].impacts[j]);
      }
    }
    for (var i in studies.impacts) {
      var max = Math.max.apply(null, studies.impacts[i]);
      studies.impacts[i] = max;
    }

    studies = filterObject(studies, function(d) {
      return !d.plural;
    });

    // set up pack layout, which will populate studies with layout information
    // based on the size we calculated from the counts when pack.nodes() is called
    var diameter = 600, // diameter of container circles to pack bubbles into
    pack = d3.layout.pack()
    .size([diameter, diameter])
    .value(function(d) {
      return d.size;
    });

    // append bubbles to the svg ...

    // filter the data, transform, and create groups
    var node = svg.selectAll('svg')
    .data(pack.nodes(studies).filter(function(d) {
        // filter out root node
        return d.region !== 'world';
      }))
    .enter().append('g')
    .attr('class', function(d, i) {
      var c;
      if (d.region) {
        c = 'parent';
      } else {
        c = 'node';
      }
      return c;
    })
    .attr('transform', function(d, i) {
      var x,y,bx,by,ox,oy;
      if (d.region) {
        // select the path for the region
        var region = g.select('#' + d.region.replace(/\W+/g, '-')).datum();

        // find center of the region's bounding box
        var b = path.bounds(region);
        bx = (b[0][0] + b[1][0]) / 2;
        by = (b[0][1] + b[1][1]) / 2;

        for (var i in studies.children) {
          if (d.region === studies.children[i].region) {
            ox = studies.children[i].x;
            oy = studies.children[i].y;
          }
        }

      } else {
        // function?
        var region = g.select('#' + d.location.replace(/\W+/g, '-')).datum();
        var b = path.bounds(region);
        bx = (b[0][0] + b[1][0]) / 2;
        by = (b[0][1] + b[1][1]) / 2;

        for (var i in studies.children) {
          if (d.location === studies.children[i].region) {
            ox = studies.children[i].x;
            oy = studies.children[i].y;
          }
        }
      }

      x = bx + d.x - ox;
      y = by + d.y - oy;

      // manual adjustments
      // (i.e. some of the bounding boxes don't make visual sense, so just
      // adjust those manually)
      x += (regions[d.region || d.location].translate.x)*scale;
      y += (regions[d.region || d.location].translate.y)*scale;

      return 'translate(' + x + ',' + y + ')';
    });
    // create the circles
    node.append('circle')
    .attr('r', function(d) {
        return d.r; // ie size is a diameter for layout purposes
      })
    .style('fill', function(d) {
      // could be cleaned up
      var c,t;
      if (!d.region) {
        for (i in studies.children) {
          if (d.location === studies.children[i].region) {
            c = studies.children[i].impacts[d.impact];
            t = studies.impacts[d.impact];
          }
        }
      }

      // calculate the value of the shade (logarithmic)
      var base = 4, // log base for shade curve
      scale = 2, // multiplier for shade curve
      offset = .18, // offset
      v = (Math.log(c/t + 1) / Math.log(base)) * scale + offset;
      console.log (!d.region ? v : '');

      // calc value for parent shade
      base = 8;
      scale = 1;
      offset = -1.3;
      vv = (Math.log(d.r + 1) / Math.log(base)) * scale + offset;
      // console.log (d.region ? vv : '');

      // cap at 1
      v = v > 1 ? 1 : v;
      vv = vv > 1 ? 1 : vv;

      if (d.region) {
        return d3.rgb.apply(null, shade([0, 138, 179], vv))
      } else {
        var blue = [0, 138, 179];
        var orange = [238, 91, 67];
        var yellow = [194, 195, 59];
        var fuchsia = [173, 0, 84];
        if (d.impact === 'government') {
          return d3.rgb.apply(null, shade(blue, v));
        } else if (d.impact === 'citizens') {
          return d3.rgb.apply(null, shade(orange, v));
        } else if (d.impact === 'economic') {
          return d3.rgb.apply(null, shade(yellow, v));
        } else if (d.impact === 'public') {
          return d3.rgb.apply(null, shade(fuchsia, v));
        } // else
        return d3.rgb(128, 128, 128);
      }
    })
    .attr('id', function(d, i) {
      var id, l = d.region || d.location;
      if (d.region) {
        id = '_bubble_' + l.replace(/\W+/g, '-');
      } else {
        id = '_bubble_' + l.replace(/\W+/g, '-') + '-' + d.impact.replace(/\W+/g, '-');
      }
      return id;
    })
    .on("click", clicked)
    .on("mouseover", highlight)
    .on("mouseout", deHighlight);

    // create text
    node.append('text')
    .attr('dy', '.3em')
    .style('text-anchor', 'middle')
    .text(function(d) {
      var t = '';
      if (d.region) {
        t = d.total;
      }
      else {
        for (i in studies.children) {
          if (d.location === studies.children[i].region) {
            t = studies.children[i].impacts[d.impact];
          }
        }
      }
      return t;
    })
    .attr('id', function(d, i) {
      var id, l = d.region || d.location;
      if (d.region) {
        id = '_text_' + l.replace(/\W+/g, '-');
      } else {
        id = '_text_' + l.replace(/\W+/g, '-') + '-' + d.impact.replace(/\W+/g, '-');
      }
      return id;
    })
    .attr('class', 'text')
    .on("click", clicked)
    .on("mouseover", highlight)
    .on("mouseout", deHighlight);

    // ... finished drawing bubbles

    // no one needs you antarctica
    g.select('#Antarctica').remove();
  }

  // this allows us to process multiple data sources in a single function, ie instead of just d3.json()
  queue()
  .defer(d3.json, 'js/world.json')
  .defer(d3.json, 'js/packstudies.json')
  .defer(d3.tsv, 'js/world-country-names.tsv')
  .await(ready);
}