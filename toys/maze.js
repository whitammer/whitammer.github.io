var context = null;
var width, height;
var maze;
var interval;
var outerInterval;
var speed;
var outerSpeed;

class Graph {
    constructor(params) {
        this.vertices = [];
        this.edges = [];
        this.neighbours = [];
        this.weightExponent = params.weightExponent ?? 0;

        if (params.type === 'grid' || params.type === 'gridtorus') {
            params.width = params.size;
            params.height = params.size;
            for (var i = 0; i < params.width; i++) {
                for (var j = 0; j < params.height; j++) {
                    this.addVertex({
                        x: (i + 0.5) / params.width,
                        y: (j + 0.5) / params.height,
                        mode: 'unused',
                        role: 'normal'
                    });
                }
            }
            for (var i = 0; i < params.width; i++) {
                for (var j = 0; j < params.height; j++) {
                    if (i < params.width - 1) {
                        this.addEdge(i * params.height + j, (i + 1) * params.height + j);
                    } else if (params.type === 'gridtorus') {
                        var edge1 = [ this.vertices[i * params.height + j], {x: (i+1) / params.width, y: (j+0.5) / params.height } ];
                        var edge2 = [ this.vertices[0 * params.height + j], {x: 0 / params.width, y: (j+0.5) / params.height } ];
                        this.addEdge(i * params.height + j, j, [ edge1, edge2 ]);
                    }

                    if (j < params.height - 1) {
                        this.addEdge(i * params.height + j, i * params.height + (j + 1));
                    } else if (params.type === 'gridtorus') {
                        var edge1 = [ this.vertices[i * params.height + j], {x: (i+0.5) / params.width, y: (j+1) / params.height } ];
                        var edge2 = [ this.vertices[i * params.height + 0], {x: (i+0.5) / params.width, y: 0 / params.height } ];
                        this.addEdge(i * params.height + j, i * params.height, [ edge1, edge2 ]);
                    }
                }
            }
        } else if (params.type === 'triangle') {
            for (var i = 0; i <= 2 * params.size; i++) {
                for (var j = 0; j <= 2 * params.size; j++) {
                    if (i <= params.size) {
                        if ( j > params.size + i) continue;
                    } else {
                        if ( j < i - params.size) continue;
                    }
                    this.addVertex({
                        i: i,
                        j: j,
                        x: (i + 0.5) / (2 * params.size + 1) - (j - params.size) / (2 * params.size + 1) / 2,
                        y: 0.5 + (j - params.size) / (2 * params.size + 1) * Math.sqrt(3) / 2,
                        mode: 'unused',
                        role: 'normal'
                    });
                }
            }
            for (var i = 0; i <= 2 * params.size; i++) {
                for (var j = 0; j <= 2 * params.size; j++) {
                    var idx = this.vertices.findIndex(vertex => vertex.i === i && vertex.j === j);
                    if (idx === -1) continue;
                    var deltas = [[0, 1], [1, 0], [1, 1]];
                    for (var k = 0; k < deltas.length; k++) {
                        var iOther = i + deltas[k][0];
                        var jOther = j + deltas[k][1];
                        var idxOther = this.vertices.findIndex(vertex => vertex.i === iOther && vertex.j === jOther);
                        if (idxOther !== -1) {
                            this.addEdge(idx, idxOther);
                        }
                    }
                }
            }
        } else if (params.type === 'hex' || params.type === 'hextorus') {
            for (var i = 0; i < 2 * params.size; i++) {
                for (var j = 0; j < 4 * params.size; j++) {
                    if (params.type === 'hex') {
                        if (i < params.size) {
                            if (j < params.size - 1 - i || j > 3 * params.size - 1 + i) continue;
                        } else {
                            if ( j < params.size - 1 - (2 * params.size - 1 - i) || j > 3 * params.size - 1 + (2 * params.size - 1 - i)) continue;
                        }
                    }
                    this.addVertex({
                        i: i,
                        j: j,
                        x: (j + 0.5) / (4 * params.size - (params.type === 'hex' ? 1 : 0)),
                        y: 0.5 + (i - (2 * params.size - 1) / 2 + (((i + j + params.size) % 2) * 2 - 1) / 6) / (4 * params.size - (params.type === 'hex' ? 1 : 0)) * Math.sqrt(3),
                        mode: 'unused',
                        role: 'normal'
                    });
                }
            }
            for (var i = 0; i < 2 * params.size; i++) {
                for (var j = 0; j <= 4 * params.size; j++) {
                    var idx = this.vertices.findIndex(vertex => vertex.i === i && vertex.j === j);
                    if (idx === -1) continue;
                    var deltas = [[0, 1], [(i + j + params.size) % 2 ? 1 : -1, 0]];
                    for (var k = 0; k < deltas.length; k++) {
                        var iOther = i + deltas[k][0];
                        var jOther = j + deltas[k][1];
                        var idxOther = this.vertices.findIndex(vertex => vertex.i === iOther && vertex.j === jOther);
                        if (idxOther !== -1) {
                            this.addEdge(idx, idxOther);
                        }
                    }
                    if (params.type === 'hextorus') {
                        if (j == 4 * params.size - 1) {
                            var idxOther = this.vertices.findIndex(vertex => vertex.i === i && vertex.j === 0);
                            var edge1 = [ this.vertices[idx], {x: this.vertices[idx].x + 0.5 / (4 * params.size), y: this.vertices[idx].y + 0.5 / (4 * params.size) / Math.sqrt(3) * (((i + params.size) % 2) * 2 - 1) } ];
                            var edge2 = [ this.vertices[idxOther], {x: this.vertices[idxOther].x - 0.5 / (4 * params.size), y: this.vertices[idxOther].y - 0.5 / (4 * params.size) / Math.sqrt(3)  * (((i + params.size) % 2) * 2 - 1) } ];
                            this.addEdge(idx, idxOther, [edge1, edge2]);
                        }
                        if (i == 0 && (i + j + params.size) % 2 == 0) {
                            var idxOther = this.vertices.findIndex(vertex => vertex.i === 2 * params.size-1 && vertex.j === j);
                            var edge1 = [ this.vertices[idx], {x: this.vertices[idx].x, y: this.vertices[idx].y - 0.5 / (4 * params.size) * 2 / Math.sqrt(3) } ];
                            var edge2 = [ this.vertices[idxOther], {x: this.vertices[idxOther].x, y: this.vertices[idxOther].y + 0.5 / (4 * params.size) * 2 / Math.sqrt(3) } ];
                            this.addEdge(idx, idxOther, [edge1, edge2]);
                        }
                    }
                }
            }
        } else if (params.type === 'random') {
            for (var i = 0; i < params.size; i++) {
                var randx = Math.random();
                var randy = Math.random();
                while ((Math.pow(randx - 0.5, 2) + Math.pow(randy - 0.5, 2) > Math.pow(0.49, 2)) || this.vertices.findIndex(vertex => Math.pow(vertex.x - randx, 2) + Math.pow(vertex.y - randy, 2) < 0.02 * 0.02) !== -1) {
                    randx = Math.random();
                    randy = Math.random();
                }
                this.addVertex({
                    x: randx,
                    y: randy,
                    mode: 'unused',
                    role: 'normal'
                });
            }
            
            var coords = this.vertices.map(vertex => [vertex.x, vertex.y]);
            var pairs = triangulate(coords, params.triangulationMode);
            for (var i = 0; i < pairs.length; i++) {
                this.addEdge(pairs[i][0], pairs[i][1]);
            }
        }

        this.vertices[Math.floor(Math.random() * this.vertices.length)].mode = 'used';
    }

    addVertex(a) {
        this.vertices.push(a);
        this.neighbours.push([]);
    }

    addEdge(a, b, coords=null) {
        this.edges.push({ 
            endpoints: [a, b],
            endpointCoords: coords ?? [[this.vertices[a], this.vertices[b]]],
            mode: 'unused'
        });
        this.neighbours[a].push(b);
        this.neighbours[b].push(a);
    }

    weight(a, b) {
        return Math.pow((Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)), 0.5 * this.weightExponent);
    }

    generate() {
        // pick a random unused node
        var unused = [];
        for (var i = 0; i < this.vertices.length; i++) {
            if (this.vertices[i].mode === 'unused') {
                unused.push(i);
            }
        }
        if (unused.length === 0) {
            outerInterval = null;
            return;
        }
        var current = unused[Math.floor(Math.random() * unused.length)];
        this.vertices[current].role = 'initial';
        this.vertices[current].mode = 'current';

        var randomWalk = [current];
        var randomWalkEdges = [];
        this.draw();

        var substep = function(maze) {
            for (var i = 0; i < maze.edges.length; i++) {
                if (maze.edges[i].mode === 'deleted') {
                    maze.edges[i].mode = 'unused';
                }
            }
            for (var i = 0; i < maze.vertices.length; i++) {
                if (maze.vertices[i].mode === 'deleted') {
                    maze.vertices[i].mode = 'unused';
                }
            }

            var neighbours = maze.neighbours[current];
            var weights = neighbours.map(neighbour => maze.weight(maze.vertices[current], maze.vertices[neighbour]));
            var totalWeight = weights.reduce((a, b) => a + b, 0);
            var random = Math.random() * totalWeight;
            var next = neighbours[0];
            for (var i = 0; i < neighbours.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    next = neighbours[i];
                    break;
                }
            }

            var edgeIdx = maze.edges.findIndex(edge => (edge.endpoints[0] === current && edge.endpoints[1] === next) || (edge.endpoints[0] === next && edge.endpoints[1] === current));
            if (maze.vertices[next].mode === 'current') {
                // erase the loop
                var lastVisit = randomWalk.lastIndexOf(next);
                for (var i = lastVisit; i < randomWalk.length; i++) {
                    if (i > lastVisit) maze.vertices[randomWalk[i]].mode = 'deleted';
                    if (i < randomWalk.length - 1) maze.edges[randomWalkEdges[i]].mode = 'deleted';
                }
                maze.edges[edgeIdx].mode = 'deleted';
                randomWalk = randomWalk.slice(0, lastVisit + 1);
                randomWalkEdges = randomWalkEdges.slice(0, lastVisit);
            } else {
                if (maze.vertices[next].mode !== 'used') {
                    maze.vertices[next].mode = 'highlight';
                }
                maze.edges[edgeIdx].mode = 'highlight';
                if (randomWalkEdges.length > 0) {
                    maze.vertices[randomWalk[randomWalk.length - 1]].mode = 'current';
                    maze.edges[randomWalkEdges[randomWalkEdges.length - 1]].mode = 'current';
                }
                randomWalk.push(next);
                randomWalkEdges.push(edgeIdx);
            }

            if (maze.vertices[next].mode === 'used') {
                setTimeout(() => {
                    maze.vertices[randomWalk[0]].role = 'normal';
                    for (var i = 0; i < randomWalk.length; i++) {
                        maze.vertices[randomWalk[i]].mode = 'used';
                    }
                    for (var i = 0; i < randomWalkEdges.length; i++) {
                        maze.edges[randomWalkEdges[i]].mode = 'used';
                    }
                    maze.draw();
                }, outerSpeed);
                clearTimeout(interval); 
                interval = null; 

                outerInterval = setTimeout(() => maze.generate(), outerSpeed);
            } else {
                interval = setTimeout(() => substep(maze), speed);
            }
            current = next;

            maze.draw(); 
        }

        substep(this);
    }

    draw() {
        if (!context) {
            var canvas = document.getElementById('mazeCanvas');
            context = canvas.getContext('2d');
            width = canvas.width;
            height = canvas.height;
        }

        context.clearRect(0, 0, width, height);

        for (var i = 0; i < this.edges.length; i++) {
            context.beginPath();
            context.strokeStyle = this.edges[i].mode === 'unused' 
                                  ? 'lightgray' 
                                  : (this.edges[i].mode === 'current'
                                     ? 'blue' 
                                     : (this.edges[i].mode === 'deleted'
                                        ? 'red' 
                                        : (this.edges[i].mode === 'highlight' 
                                           ? 'orange' 
                                           : 'black')));
            // make it dashed if it's deleted
            if (this.edges[i].mode === 'deleted') {
                context.setLineDash([5, 5]);
            } else {
                context.setLineDash([]);
            }                  
            context.lineWidth = this.edges[i].mode === 'unused' 
                                ? 1 
                                : (this.edges[i].mode === 'current' 
                                   ? 2 
                                   : 4); // highlight or deleted
            for (var j = 0; j < this.edges[i].endpointCoords.length; j++) {
                context.moveTo(this.edges[i].endpointCoords[j][0].x * width, this.edges[i].endpointCoords[j][0].y * height);
                context.lineTo(this.edges[i].endpointCoords[j][1].x * width, this.edges[i].endpointCoords[j][1].y * height);
                
                context.stroke();
            }
        }

        for (var i = 0; i < this.vertices.length; i++) {
            context.beginPath();
            context.fillStyle = this.vertices[i].mode === 'unused' 
                                ? 'lightgray' 
                                : (this.vertices[i].mode === 'current'
                                   ? 'blue'
                                   : (this.vertices[i].mode === 'highlight' 
                                      ? 'orange' 
                                      : (this.vertices[i].mode === 'deleted' 
                                         ? 'red'
                                         : 'black')));
            if (this.vertices[i].role !== 'initial') {
                context.arc(this.vertices[i].x * width, this.vertices[i].y * height, 5, 0, 2 * Math.PI);
            } else {
                context.rect(this.vertices[i].x * width - 5, this.vertices[i].y * height - 5, 10, 10);
            }
            context.fill();
        }
    }
}

function ccw(a, b, c) {
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
}

function crossing(a, b, c, d) {
    return ccw(a, c, d) != ccw(b, c, d) && ccw(a, b, c) != ccw(a, b, d);
}

function inside(a, b, c, p) {
    return (ccw(a, b, p) && ccw(b, c, p) && ccw(c, a, p)) || (!ccw(a, b, p) && !ccw(b, c, p) && !ccw(c, a, p));
}

function insideCircumcircle(a, b, c, p) {
    var ax = a[0] - p[0];
    var ay = a[1] - p[1];
    var bx = b[0] - p[0];
    var by = b[1] - p[1];
    var cx = c[0] - p[0];
    var cy = c[1] - p[1];
    var ar = ax * ax + ay * ay;
    var br = bx * bx + by * by;
    var cr = cx * cx + cy * cy;
    var det = ax * (by * cr - br * cy) - ay * (bx * cr - br * cx) + ar * (bx * cy - by * cx);
    return det > 0 == ccw(a, b, c);
}

function triangulate(coords, triangulationMode) {
    var pairs = [];
    for (var i = 0; i < coords.length; i++) {
        for (var j = i + 1; j < coords.length; j++) {
            pairs.push([i, j]);
        }
    }
    // sort pairs by distance
    if (triangulationMode === 'long') {
        pairs.sort((a,b) => -Math.pow(coords[a[0]][0] - coords[a[1]][0], 2) + Math.pow(coords[a[0]][1] - coords[a[1]][1], 2) - Math.pow(coords[b[0]][0] - coords[b[1]][0], 2) - Math.pow(coords[b[0]][1] - coords[b[1]][1], 2));
    } else if (triangulationMode === 'short' || triangulationMode === 'delaunay') {
        pairs.sort((a,b) => Math.pow(coords[a[0]][0] - coords[a[1]][0], 2) + Math.pow(coords[a[0]][1] - coords[a[1]][1], 2) - Math.pow(coords[b[0]][0] - coords[b[1]][0], 2) - Math.pow(coords[b[0]][1] - coords[b[1]][1], 2));
    } else {
        pairs.sort((a,b) => Math.random() - 0.5);
    }

    var added = [];
    for (var i = 0; i < pairs.length; i++) {
        var crosses = false;
        for (var j = 0; j < added.length; j++) {
            var a = coords[pairs[i][0]];
            var b = coords[pairs[i][1]];
            var c = coords[added[j][0]];
            var d = coords[added[j][1]];
            if (a === c || a === d || b === c || b === d) continue;
            if (crossing(a, b, c, d)) {
                crosses = true;
                break;
            }
        }
        if (!crosses) added.push(pairs[i]);
    }
    pairs = added;

    if (triangulationMode !== 'delaunay') return pairs;
    
    var triangles = [];
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        var a = pair[0];
        var b = pair[1];
        for (var j = 0; j < coords.length; j++) {
            if (a >= j || b >= j) continue;
            if (pairs.findIndex(other => (other[0] === a && other[1] === j)) === -1 || pairs.findIndex(other => (other[0] === b && other[1] === j)) === -1) {
                continue;
            }
            triangles.push([a, b, j]);
        }
    }
    
    for (var i = 0; i < triangles.length; i++) {
        var triangle = triangles[i];
        for (var j = 0; j < coords.length; j++) {
            if (triangle.includes(j)) continue;
            if (inside(coords[triangle[0]], coords[triangle[1]], coords[triangle[2]], coords[j])) {

                triangles.splice(i, 1);
                i--;
                break;
            }
        }
    }

    var removed = true;
    while (removed) {
        removed = false;
        for (var i = 0; i < triangles.length; i++) {
            if (removed) break;
            var triangle = triangles[i];
            var adjacent = triangles.map((t,idx) => [t, idx]);
            adjacent = adjacent.filter(other => other[0].filter(point => triangle.includes(point)).length === 2);
            for (var j = 0; j < adjacent.length; j++) {
                if (removed) break;
                var otherTriangle = adjacent[j][0];
                var otherIdx = adjacent[j][1];
                var newPoint = otherTriangle.filter(point => !triangle.includes(point))[0];
                var oldPoint = triangle.filter(point => !otherTriangle.includes(point))[0];
                var sharedPoints = triangle.filter(point => otherTriangle.includes(point));
                var a = coords[triangle[0]];
                var b = coords[triangle[1]];
                var c = coords[triangle[2]];
                var p = coords[newPoint];
                if (insideCircumcircle(a, b, c, p)) {
                    triangles.splice(i, 1);
                    triangles.splice(i < otherIdx ? otherIdx - 1 : otherIdx, 1);
                    triangles.push([oldPoint, sharedPoints[0], newPoint]);
                    triangles.push([oldPoint, sharedPoints[1], newPoint]);
                    removed = true;
                }
            }
        }
    }

    pairs = [];
    for (var i = 0; i < triangles.length; i++) {
        pairs.push([triangles[i][0], triangles[i][1]]);
        pairs.push([triangles[i][1], triangles[i][2]]);
        pairs.push([triangles[i][2], triangles[i][0]]);
    }
    pairs = pairs.map(pair => pair[0] < pair[1] ? pair : [pair[1], pair[0]]);
    pairs = pairs.filter((pair, idx) => pairs.findIndex(other => other[0] === pair[0] && other[1] === pair[1]) === idx);

    return pairs;
}

function initialise() {
    updateSpeed();
    clearTimeout(interval);
    clearTimeout(outerInterval);
    outerInterval = null;
    interval = null;

    var paramsSet = updateSizes();
    var params = { 
                    type: paramsSet.type + (paramsSet.torus ? 'torus' : ''), 
                    size: paramsSet.size, 
                    triangulationMode: paramsSet.triangulationMode,
                    weightExponent: paramsSet.type == "random" ? paramsSet.weightExponent : 0
    };
    console.log(params);

    maze = new Graph(params);
    maze.draw();
}

function generateMaze() {
    if (!outerInterval) {
        outerInterval = setTimeout(() => { maze.generate() }, 0);
    }
}

function updateSpeed(){
    var speedHz = Math.pow(10, document.getElementById('speed').value);
    var outerSpeedHz = Math.pow(10, document.getElementById('outerSpeed').value);
    document.getElementById('speedValue').innerHTML = `${Math.round(speedHz)} Hz`;
    document.getElementById('outerSpeedValue').innerHTML = `${Math.round(outerSpeedHz)} Hz`;

    speed = 1000 / speedHz;
    outerSpeed = 1000 / outerSpeedHz;
}

function updateSizes() {
    var typeRadios = document.getElementsByName('type');
    var type = 'grid';
    for (var i = 0; i < typeRadios.length; i++) {
        if (typeRadios[i].checked) {
            type = typeRadios[i].value;
            break;
        }
    }
    var types = ['grid', 'triangle', 'hex', 'random'];
    for (var i = 0; i < types.length; i++) {
        var size = document.getElementById(`${types[i]}Size`).value;
        document.getElementById(`${types[i]}SizeValue`).innerHTML = size;
        if (type == types[i]) {
            document.getElementById(`${types[i]}Block`).classList.add('selectedBlock');
        }
        else {
            document.getElementById(`${types[i]}Block`).classList.remove('selectedBlock');
        }
    }
    var randomType = 'short';
    var randomRadios = document.getElementsByName('randomType');
    for (var i = 0; i < randomRadios.length; i++) {
        if (randomRadios[i].checked) {
            randomType = randomRadios[i].value;
            break;
        }
    }
    document.getElementById('weightExponentValue').innerHTML = document.getElementById('weightExponent').value;
    return {
                type: type, 
                size: parseInt(document.getElementById(`${type}Size`).value), 
                torus: document.getElementById(`${type}Torus`)?.checked, 
                triangulationMode: randomType, 
                weightExponent: parseFloat(document.getElementById('weightExponent').value)
    };
}