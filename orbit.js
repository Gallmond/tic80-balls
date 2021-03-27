// title:  gravity balls
// author: gav
// desc:   just playing with gravity and frictionless conservation of mass
// script: js

/**
 * UP key to add a new body
 * DOWN key to remove the oldest body
 * LEFT CLICK to follow the nearest body or toggle the body following
 * RIGHT CLICK to pin a body (prevent position update)
 * R key to restart
 * B key to force bodies to stay inside the rectangle (causes NaN's if they snap-back inside eachother)
 * TODO M to show a 'map' of all bodies regardless of distance
 */


var win_w = 240
var win_h = 136 

// some debug stuff
var gravitational_constant = 0.01; // It's fine...
var force_in_box = true; // this breaks the maths. I think it "drains" momentum out of the system?
var draw_connecting_lines = true;
var visualise_velocity = true;

var colliding_pairs = [];
var collisions = 0;
function addCollidingPair(a,b,dist,overlap){
	for(var i = 0, l = colliding_pairs.length; i < l; i++){ 	// check this pair isn't queued to be checked already
		var cp = colliding_pairs[i];
		if(
			(a === cp.b1 && b === cp.b2) ||
			(b === cp.b1 && a === cp.b2)
			){
			return false;
		}
	}
	colliding_pairs.push({
		b1:a,
		b2:b,
		dist:dist,
		overlap:overlap
	});
	collisions++;
}


function point_dist(x1,y1,x2,y2){ // returns distance between two points
	return Math.sqrt(((x2-x1) * (x2-x1)) + ((y2-y1) * (y2-y1)));
}

var OrbitalBody = function(mass,radius,spawn_x,spawn_y,pinned){
	this.m = mass;
	this.r = radius;
	this.x = spawn_x;
	this.y = spawn_y;
	this.v_x =0;
	this.v_y =0;
	this.pinned = pinned ? pinned : false;
	this.c = 5;

	this.init = {
		m: mass,
		r: radius,
		x: spawn_x,
		y: spawn_y,
		v_x: 0,
		v_y: 0,
		pinned: pinned
	};

	this.step = 1000/120;

	this.update_velocity = function(){

		// gravity stretches over the whole universe! Check all bodies
		for(var i = 0, l = bodies.length; i < l; i++){
			var b = bodies[i];
			if(b === this) continue; // skip me though

			// if my distance to this body is = or < both our radiuses, queue for collision resolution
			var dist = point_dist(this.x,this.y,b.x,b.y);
			if(dist <= this.r + b.r){

				var overlap = (dist - this.r - b.r) * 0.5

				addCollidingPair(this,b,dist,overlap);

				// in the meantime 'push out' any bodies that are inside eachother.
				// The 'physics' is already janky enough and won't handle this.
				if(!this.pinned){ // displace me
					this.x -= overlap * (this.x - b.x) / dist;
					this.y -= overlap * (this.y - b.y) / dist;
				}
				if(!b.pinned){ // displace other
					b.x += overlap * (this.x - b.x) / dist;
					b.y += overlap * (this.y - b.y) / dist;
				}

				continue;
			}
			
			if(draw_connecting_lines && !key(13)) line(this.x-offset_x,this.y-offset_y,b.x-offset_x,b.y-offset_y,14);

			// this is the c^2 in pythagoras' c^2 = a^2 + b^2
			var sqrDist = ((b.x-this.x) * (b.x-this.x)) + ((b.y-this.y) * (b.y-this.y))

			// diff
			var dx = this.x - b.x;
			var dy = this.y - b.y;

			// the 'magnitude' of a vector is just the hypotenus of a right angle triangle.
			var mag = Math.sqrt(sqrDist);

			// normalisation is to divide the 'direction' by the 'magnitude'. this basically elimates the magnitude but keeps the direction which is what we're interested in here.
			// For example the two vectors (2,2) and (1000,1000) are the same after normalisation
			// think of them as right angle triangles from the points (0,0) -> (2,2) and (0,0) -> (1000,1000). The angle of the line is the same.
			var forceDir_x = dx;
			var forceDir_y = dy;
			if(mag > 0){ // only normalise if magnitude is more than 0
				forceDir_x = dx / mag
				forceDir_y = dy / mag
			}

			// this is newton's law of universal gravitation (but with x and y dimensions in our case)
			// with help from Henry Cavendish
			// force = gravity * ((mass1 * mass2) / distance^2 )
			var force_x = forceDir_x * gravitational_constant * this.m * b.m / sqrDist
			var force_y = forceDir_y * gravitational_constant * this.m * b.m / sqrDist

			// f = m * a ... so ... a = f / m
			var acceleration_x = force_x / this.m
			var acceleration_y = force_y / this.m

			// apply time step
			this.v_x+= acceleration_x * this.step;
			this.v_y+= acceleration_y * this.step;
		}

		if(this.pinned){
			// this.v_x = 0;
			// this.v_y = 0;
		}

	}

	this.update_position = function(){
		if(this.pinned) return;
		this.x-= this.v_x * this.step;
		this.y-= this.v_y * this.step;

		if(force_in_box){
			if(this.x < 0){this.x = 0; this.v_x = 0;} 
			if(this.y < 0){this.y = 0; this.v_y = 0;} 
			if(this.x > win_w){this.x = win_w; this.v_x = 0;} 
			if(this.y > win_h){this.y = win_h; this.v_y = 0;} 
		}

	}
}


function mr(){
	return (Math.random() - 0.5) * 3;
}

function rand(min,max){ // returns random int from min to max inclusive
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addBody(){
	var s = time();
	var is_space = false;
	while(!is_space && time()-s<1000){
		var x = rand(0, win_w);
		var y = rand(0, win_h);
		var m = rand(7,30);
		var r = m;
		var is_space = true;
		for(var i = 0, l = bodies.length; i < l && is_space; i++){
			var b = bodies[i];
			var d = point_dist(x,y,b.x,b.y);
			if(d <= r + b.r) is_space = false;
		}
	}
	bodies.push(new OrbitalBody(m,r,x,y));
}

var sizes = [
	rand(7,30),
	rand(7,30),
	rand(7,30),
];

// init some bodies to start with
// OrbitalBody(mass,radius,spawn_x,spawn_y,pinned).
var main = false;
var bodies = [
	new OrbitalBody(sizes[0], sizes[0], 56+mr(),35+mr()),
	new OrbitalBody(sizes[1], sizes[1], 215+mr(),113+mr()),
	new OrbitalBody(sizes[2], sizes[2], 189+mr(),45+mr())
];


main.c = 6;
main.is_main = true;

var offset_x = 0
var offset_y = 0

var downheld = false;
var hidelines = false;
var t = time();
function TIC()
{
	t = time();
	cls(15)

	offset_x = 0;
	offset_y = 0;
	if(main){
		offset_x = main.x - win_w / 2;
		offset_y = main.y - win_h / 2;
	}


	// 02 = B
	if(keyp(2)){
		force_in_box = !force_in_box;
	}
	// 18 = R
	if(keyp(18)){
		reset();
	}
	//58 = UP
	if(keyp(58)){
		addBody();
	}
	//59 = DOWN
	if(keyp(59)){
		bodies.shift();
	}
	//60 = LEFT
	//61 = RIGHT

	// update all bodies
	if(t > 1000){

		// update velocities
		for(var i = 0, l = bodies.length; i < l; i++){
			bodies[i].update_velocity();
		}

		// resolve collisions
		while(colliding_pairs.length > 0){
			var p = colliding_pairs.shift();
			a = p.b1;
			b = p.b2;
			dist = p.dist;
			overlap = p.overlap;

			//TODO recomment this. It's not clear to me what's going on

			// normalise
			var nx = (b.x - a.x) / dist			
			var ny = (b.y - a.y) / dist			

			// tangent
			var tx = ny*-1;
			var ty = nx;

			// dot products tangent
			var dptan1 = a.v_x * tx + a.v_y * ty
			var dptan2 = b.v_x * tx + b.v_y * ty

			// dot products normal
			var dpnorm1 = a.v_x * nx + a.v_y * ny
			var dpnorm2 = b.v_x * nx + b.v_y * ny

			// conserve 2d momentum
			var m1 = (dpnorm1 * (a.m - b.m) + 2 * b.m * dpnorm2) / (a.m + b.m)
			var m2 = (dpnorm2 * (b.m - a.m) + 2 * a.m * dpnorm1) / (a.m + b.m)

			// alter velocity
			a.v_x = tx * dptan1 + nx * m1;
			a.v_y = ty * dptan1 + ny * m1;
			b.v_x = tx * dptan2 + nx * m2;
			b.v_y = ty * dptan2 + ny * m2;

		}

		// apply velocites to position
		for(var i = 0, l = bodies.length; i < l; i++){
			bodies[i].update_position();
		}
	

	}else{
		print(((1000-t)/1000).toFixed(2),50,50,0);
	}


		// draw 'main' window rectangle
		rectb(0 - offset_x,0 - offset_y,win_w,win_h, force_in_box ? 2 : 14);

	// 13 = M
	if(key(13)){
		var points = [];

		// get the bbox for these points
		var low_x=undefined,high_x=undefined,low_y=undefined,high_y=undefined;

		for(var i = 0, l = bodies.length; i < l; i++){
			var b = bodies[i];
			points.push([b.x,b.y]);

			//TODO reset to 0 here

			if(low_x === undefined || b.x < low_x){
				low_x = b.x
			}
			if(high_x === undefined || b.x > high_x){
				high_x = b.x
			}
			if(low_y === undefined || b.y < low_y){
				low_y = b.y
			}
			if(high_y === undefined || b.y > high_y){
				high_y = b.y
			}

		}

		var x_range = high_x - low_x;
		var y_range = high_y - low_y;
		var x_scale = 1;
		var y_scale = 1;
		if(x_range > win_w) x_scale = x_range / win_w
		if(y_range > win_h) y_scale = y_range / win_h


		var n = 20;
		print("x_range["+x_range.toFixed(1)+"] x_scale["+x_scale.toFixed(1)+"]",5,20,5);
		
		print("points[0][0] " + String(points[0][0]),5,27,5);
		print("points[0][0]* x_scale " + String(points[0][0]* x_scale),5,33,5);

		while (points.length > 0) {
			var p = points.shift();



			var this_x = (p[0] / x_scale) - low_x;
			var this_y = (p[1] / y_scale) - low_y;

			//TODO how to translate to 0 (ie keep on scree)

			//TODO how to scale proper and maintain aspect ratio

			pix(this_x, this_y, 12);

		}


	}else{

		// draw bodies
	for(var i = 0, l = bodies.length; i < l; i++){
		var b = bodies[i];
		
		// draw circle
		circb(b.x - offset_x,b.y - offset_y,b.r,b.c);
	
		// mass and radius
		var s1 = "m:"+String(b.m)+" r:"+String(b.r);
		var sl1 = print(s1, -100,-100,0,false,1,true);
		print(s1, b.x - offset_x - (sl1*0.5), b.y - offset_y - 7,13,false,1,true);

		// x and y position
		var s2 = "x:"+b.x.toFixed(1)+" y:"+b.y.toFixed(1);
		var sl2 = print(s2, -100,-100,0,false,1,true);
		print(s2, b.x - offset_x - (sl2*0.5), b.y - offset_y+2,13,false,1,true);

		if(b.pinned){
			var sl = print("pinned",-100,-100,1,false,1,true);
			print("pinned",b.x - offset_x - (sl/2),b.y - offset_y,b.c,false,1,true);
		} 

		if(visualise_velocity){
			var vx = b.x - offset_x + (b.v_x*-1) * 150; // exaggerated for display
			var vy = b.y - offset_y + (b.v_y*-1) * 150; // exaggerated for display
			// create a right angle triangle with the hypotenuse acting as our 'arrow'
			line(
				b.x - offset_x	, b.y - offset_y,
				vx,		vy,
				3
			)
		}

	}

	}


	



}

var mouse_clicked = time();
function OVR(){

	offset_x = 0;
	offset_y = 0;
	if(main){
		offset_x = main.x - win_w / 2;
		offset_y = main.y - win_h / 2;
	}

	var mouseData=mouse(),
	mx=mouseData[0], // x
	my=mouseData[1], // y
	ml=mouseData[2], // left
	mm=mouseData[3], // middle
	mr=mouseData[4], // right
	msx=mouseData[5], // scrollx
	msy=mouseData[6]; // scrolly

	print("mx["+String(mx)+"] my["+String(my)+"]",2,win_h-7,0);

	if(key(28)){ // the 1 key
		if(main){
			main.x = win_w / 2;
			main.y = win_h / 2;
		}
	}
	
	if((ml || mr) && time()-mouse_clicked > 333){
		mouse_clicked = time();

		// get nearest celestial body
		var nearest = false;
		var nearest_dist = false;
		for(var i = 0, l = bodies.length; i < l; i++){
			var b = bodies[i];
			var bx = b.x - offset_x
			var by = b.y - offset_y

			var this_dist = point_dist(bx,by,mx,my);
			if(!nearest || this_dist < nearest_dist){
				nearest=b;
				nearest_dist = this_dist;
			}
		}

		if(nearest){
			if(ml){
				if(nearest === main){
					main.c = 5
					main.is_main = false
					main = false;
				}else if(main){
					main.c = 5
					main.is_main = false
					main = nearest
					main.c = 6
					main.is_main = true
				}else{
					main = nearest
					main.c = 6
					main.is_main = true
				}
			}
			if(mr){
				nearest.pinned = !nearest.pinned;
				if(nearest.pinned){
					nearest.v_x = 0
					nearest.v_y = 0
				}
			}
		}

	}

	print("collisions["+String(collisions)+"]",2,2,0);
	print("bodies["+String(bodies.length)+"]",2,2+7,0);
	

}

// <TILES>
// 001:eccccccccc888888caaaaaaaca888888cacccccccacc0ccccacc0ccccacc0ccc
// 002:ccccceee8888cceeaaaa0cee888a0ceeccca0ccc0cca0c0c0cca0c0c0cca0c0c
// 003:eccccccccc888888caaaaaaaca888888cacccccccacccccccacc0ccccacc0ccc
// 004:ccccceee8888cceeaaaa0cee888a0ceeccca0cccccca0c0c0cca0c0c0cca0c0c
// 017:cacccccccaaaaaaacaaacaaacaaaaccccaaaaaaac8888888cc000cccecccccec
// 018:ccca00ccaaaa0ccecaaa0ceeaaaa0ceeaaaa0cee8888ccee000cceeecccceeee
// 019:cacccccccaaaaaaacaaacaaacaaaaccccaaaaaaac8888888cc000cccecccccec
// 020:ccca00ccaaaa0ccecaaa0ceeaaaa0ceeaaaa0cee8888ccee000cceeecccceeee
// </TILES>

// <WAVES>
// 000:00000000ffffffff00000000ffffffff
// 001:0123456789abcdeffedcba9876543210
// 002:0123456789abcdef0123456789abcdef
// </WAVES>

// <SFX>
// 000:000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000304000000000
// </SFX>

// <PALETTE>
// 000:1a1c2c5d275db13e53ef7d57ffcd75a7f07038b76425717929366f3b5dc941a6f673eff7f4f4f494b0c2566c86333c57
// </PALETTE>

