//-------------------------------------------------------------------------
// base helper methods
//-------------------------------------------------------------------------

if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback, element) {
            window.setTimeout(callback, 1000 / 60);
        }
}

//-------------------------------------------------------------------------
// game constants
//-------------------------------------------------------------------------
var DIR     = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 };

var Piece = (function() {
    //-------------------------------------------------------------------------
    // tetris pieces
    //
    // blocks: each element represents a rotation of the piece (0, 90, 180, 270)
    //         each element is a 16 bit integer where the 16 bits represent
    //         a 4x4 set of blocks, e.g. j.blocks[0] = 0x44C0
    //
    //             0100 = 0x4 << 3 = 0x4000
    //             0100 = 0x4 << 2 = 0x0400
    //             1100 = 0xC << 1 = 0x00C0
    //             0000 = 0x0 << 0 = 0x0000
    //                               ------
    //                               0x44C0
    //
    //-------------------------------------------------------------------------
    var i = { size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'   },
	j = { size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'   },
	l = { size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' },
	o = { size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' },
	s = { size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'  },
	t = { size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' },
	z = { size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'    };

    //------------------------------------------------
    // do the bit manipulation and iterate through each
    // occupied block (x,y) for a given piece
    //------------------------------------------------
    function eachblock(type, x, y, dir, fn) {
	var bit, result, row = 0, col = 0, blocks = type.blocks[dir];
	for(bit = 0x8000 ; bit > 0 ; bit = bit >> 1) {
	    if (blocks & bit) {
		fn(x + col, y + row);
	    }
	    if (++col === 4) {
		col = 0;
		++row;
	    }
	}
    }
    //-----------------------------------------
    // start with 4 instances of each piece and
    // pick randomly until the 'bag is empty'
    //-----------------------------------------
    var pieces = [];

    function randomPiece() {
	function random(min, max)      { return (min + (Math.random() * (max - min)));            }
	function randomChoice(choices) { return choices[Math.round(random(0, choices.length-1))]; }

	if (pieces.length == 0)
	    pieces = [i,i,i,i,j,j,j,j,l,l,l,l,o,o,o,o,s,s,s,s,t,t,t,t,z,z,z,z];
	var type = pieces.splice(random(0, pieces.length-1), 1)[0];
	return { type: type, dir: DIR.UP, x: Math.round(random(0, nx - type.size)), y: 0 };
    }

    return {
	eachblock: eachblock,
	randomPiece: randomPiece
    }
})();

var speed   = { start: 0.6, decrement: 0.005, min: 0.1 }, // how long before piece drops by 1 row (seconds)
    nx      = 10, // width of tetris court (in blocks)
    ny      = 20, // height of tetris court (in blocks)
    nu      = 5;  // width/height of upcoming preview (in blocks)

//-------------------------------------------------------------------------
// GAME LOGIC
//-------------------------------------------------------------------------

function getBlock(blocks, x,y) {
    return (blocks && blocks[x] ? blocks[x][y] : null);
}

var model = (function() {
    function reset() {
	model.dt = 0;
	clearActions();
	clearBlocks();
	clearRows();
	clearScore();
	setCurrentPiece(model.next);
	setNextPiece();
    };

    function setVisualScore(n)      {
	model.vscore = n || model.score;
    }
    function setScore(n)            {
	model.score = n;
	setVisualScore(n);
    }
    function addScore(n)            {
	model.score = model.score + n;
    }
    function clearScore()           {
	setScore(0);
    }
    function clearRows()            {
	setRows(0);
    }
    function setRows(n)             {
	model.rows = n;
	model.step = Math.max(speed.min, speed.start - (speed.decrement*model.rows));
    }
    function addRows(n)             { setRows(model.rows + n); }
    function getBlock(x,y)          { return (model.blocks && model.blocks[x] ? model.blocks[x][y] : null); }
    function setBlock(x,y,type)     { model.blocks[x] = model.blocks[x] || []; model.blocks[x][y] = type; }
    function clearBlocks()          { model.blocks = []; }

    //-----------------------------------------------------
    // check if a piece can fit into a position in the grid
    //-----------------------------------------------------
    function occupied (type, x, y, dir) {
	var result = false
	Piece.eachblock(type, x, y, dir, function(x, y) {
	    if ((x < 0) || (x >= nx) || (y < 0) || (y >= ny) || getBlock(x,y))
		result = true;
	});
	return result;
    }
    function unoccupied(type, x, y, dir) {
	return !occupied(type, x, y, dir);
    }
    
    function clearActions()         { model.actions = []; }
    function setCurrentPiece(piece) { model.current = piece || Piece.randomPiece(); }
    function setNextPiece(piece)    { model.next    = piece || Piece.randomPiece(); }
    function move(dir) {
	var x = model.current.x, y = model.current.y;
	switch(dir) {
	case DIR.RIGHT: x = x + 1; break;
	case DIR.LEFT:  x = x - 1; break;
	case DIR.DOWN:  y = y + 1; break;
	}
	if (unoccupied(model.current.type, x, y, model.current.dir)) {
            model.current.x = x;
            model.current.y = y;
            return true;
	}
	else {
            return false;
	}
    }
    function rotate() {
	var newdir = (model.current.dir == DIR.MAX ? DIR.MIN : model.current.dir + 1);
	if (unoccupied(model.current.type, model.current.x, model.current.y, newdir)) {
            model.current.dir = newdir;
	}
    }
    function drop() {
	if (!move(DIR.DOWN)) {
            addScore(10);
            dropPiece();
            removeLines();
            setCurrentPiece(model.next);
            setNextPiece(Piece.randomPiece());
            clearActions();
            if (occupied(model.current.type, model.current.x, model.current.y, model.current.dir)) {
		model.present({lose: true});
            }
	}
    }
    function dropPiece() {
	Piece.eachblock(model.current.type, model.current.x, model.current.y, model.current.dir, function(x, y) {
            setBlock(x, y, model.current.type);
	});
    }
    function removeLines() {
	var x, y, complete, n = 0;
	for(y = ny ; y > 0 ; --y) {
            complete = true;
            for(x = 0 ; x < nx ; ++x) {
		if (!getBlock(x, y))
		    complete = false;
            }
            if (complete) {
		removeLine(y);
		y = y + 1; // recheck same line
		n++;
            }
	}
	if (n > 0) {
            addRows(n);
            addScore(100*Math.pow(2,n-1)); // 1: 100, 2: 200, 3: 400, 4: 800
	}
    }
    function removeLine(n) {
	var x, y;
	for(y = n ; y >= 0 ; --y) {
            for(x = 0 ; x < nx ; ++x)
		setBlock(x, y, (y == 0) ? null : getBlock(x, y-1));
	}
    }
    
    return {
	blocks: [],        // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
	actions: [],       // queue of user actions (inputs)
	playing: false,       // true|false - game is in progress
	dt: 0,            // time since starting this game
	current: null,       // the current piece
	next: null,          // the next piece
	score: 0,         // the current score
	vscore: 0,        // the currently displayed score (it catches up to score in small chunks - like a spinning slot machine)
	rows: 0,          // number of completed rows in the current game
	step: 0,          // how long before current piece drops by 1 row

	init: function() {
	    reset();  // reset the per-game variables
	},

	present: function(data) {
	    if (model.playing) {
		if (data.dir !== undefined) {
		    model.actions.push(data.dir);
		}
		if (data.stop !== undefined) {
		    reset();
		    model.playing = false;
		}
		if (data.lose !== undefined) {
		    reset();
		    model.playing = false;
		}
		if (data.interval !== undefined) {
		    if (model.vscore < model.score)
			setVisualScore(model.vscore + 1);
		    var action = model.actions.shift();
		    switch(action) {
		    case DIR.LEFT:  move(DIR.LEFT);  break;
		    case DIR.RIGHT: move(DIR.RIGHT); break;
		    case DIR.UP:    rotate();        break;
		    case DIR.DOWN:  drop();          break;
		    }
		    model.dt = model.dt + data.interval;
		    if (model.dt > model.step) {
			model.dt = model.dt - model.step;
			drop();
		    }
		}
	    }
	    else
	    {
		if (data.start !== undefined) {
		    reset();
		    model.playing = true;
		}
	    }
	}
    }
})();

var state = {
    representation: function(model) { // model -> repr
	var data = {};

	if (state.playing(model)) {
	    data.court = {current: model.current, next: model.next, blocks: model.blocks};
	}
	data.score = ("00000" + Math.floor(model.vscore)).slice(-5);
	data.rows = model.rows;
	data.playing = model.playing;

	return data;
    },
    playing: function(model) {
	return model.playing;
    },
    ready: function(model) {
	return true;
    },
    
};

//-------------------------------------------------------------------------
// GAME LOOP
//-------------------------------------------------------------------------

function run() {
    function timestamp() {
	return new Date().getTime();
    }
    addEvents(); // attach keydown and resize events
    var last, now;
    last = now = timestamp();
    function frame() {
        now = timestamp();
	// using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab
	model.present({interval: Math.min(1, (now - last) / 1000.0)});
	var repr = state.representation(model);
        draw.draw(repr);
        last = now;
        requestAnimationFrame(frame, canvas);
    }
    draw.init(); // setup all our sizing information
    model.init();
    frame();  // start the first frame
}
function addEvents() {
    document.addEventListener('keydown', keydown, false);
}

var KEY     = { ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 };

function keydown(ev) {
    var handled = false;

    var data = {};
    switch(ev.keyCode) {
    case KEY.LEFT:   data.dir = DIR.LEFT;  handled = true; break;
    case KEY.RIGHT:  data.dir = DIR.RIGHT; handled = true; break;
    case KEY.UP:     data.dir = DIR.UP;    handled = true; break;
    case KEY.DOWN:   data.dir = DIR.DOWN;  handled = true; break;
    case KEY.ESC:    data.stop = true;     handled = true; break;
    case KEY.SPACE:  data.start = true;    handled = true; break;
    default: break;
    }
    model.present(data);

    if (handled)
        ev.preventDefault(); // prevent arrow keys from scrolling the page (supported in IE9+ and all other browsers)
}
//-------------------------------------------------------------------------
// RENDERING
//-------------------------------------------------------------------------

function get(id) {
    return document.getElementById(id);
}
var draw = (function(canvas, ucanvas) {
    var ctx     = canvas.getContext('2d');
    var uctx    = ucanvas.getContext('2d');
    var dx = 0, dy = 0; // pixel size of a single tetris block

    var start = get('start');
    var rows = get('rows');
    var score = get('score');

    function resize(event) {
	canvas.width   = canvas.clientWidth;  // set canvas logical size equal to its physical size
	canvas.height  = canvas.clientHeight; // (ditto)
	ucanvas.width  = ucanvas.clientWidth;
	ucanvas.height = ucanvas.clientHeight;
 	dx = canvas.width  / nx; // pixel size of a single tetris block
	dy = canvas.height / ny; // (ditto)
    }
    function init() {
	window.addEventListener('resize', resize, false);
	resize();
    }
    function draw(data) {
	ctx.save();
	ctx.lineWidth = 1;
	ctx.translate(0.5, 0.5); // for crisp 1px black lines
	if (data.court) {
	    drawCourt(data.court.current, data.court.blocks);
	    drawNext(data.court.next);
	}
	if (data.score)
            score.innerHTML = data.score;
	if (data.rows)
	    rows.innerHTML = data.rows;
	if (data.playing)
	    hide(start);
	else
	    show(start);
	ctx.restore();
    }
    function drawCourt(current, blocks) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (current)
	    drawPiece(ctx, current.type, current.x, current.y, current.dir);
        var x, y, block;
        for(y = 0 ; y < ny ; y++) {
	    for (x = 0 ; x < nx ; x++) {
		var block = getBlock(blocks, x, y);
		if (block)
		    drawBlock(ctx, x, y, block.color);
	    }
        }
        ctx.strokeRect(0, 0, nx*dx - 1, ny*dy - 1); // court boundary
    }
    function drawNext(next) {
        var padding = (nu - next.type.size) / 2; // half-arsed attempt at centering next piece display
        uctx.save();
        uctx.translate(0.5, 0.5);
        uctx.clearRect(0, 0, nu*dx, nu*dy);
        drawPiece(uctx, next.type, padding, padding, next.dir);
        uctx.strokeStyle = 'black';
        uctx.strokeRect(0, 0, nu*dx - 1, nu*dy - 1);
        uctx.restore();
    }
    function hide(obj) {
	if (!obj)
	    return;
	var style = obj == null? null : (obj.style == null? null : obj.style);
	if (style)
	    style.visibility = 'hidden';
    }
    function show(obj) {
	if (!obj)
	    return;
	if (obj) {
	    if (obj.style) obj.style.visibility = '';
	}
    }
    function html(id, html) {
	get(id).innerHTML = html;
    }
    function drawPiece(ctx, type, x, y, dir) {
	Piece.eachblock(type, x, y, dir, function(x, y) {
            drawBlock(ctx, x, y, type.color);
	});
    }
    function drawBlock(ctx, x, y, color) {
	ctx.fillStyle = color;
	ctx.fillRect(x*dx, y*dy, dx, dy);
	ctx.strokeRect(x*dx, y*dy, dx, dy)
    }
    return {
	init: init,
	draw: draw
    };
})(get('canvas'), get('upcoming'));


//-------------------------------------------------------------------------
// FINALLY, lets run the game
//-------------------------------------------------------------------------
run();

