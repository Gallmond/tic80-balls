// title:  balls
// author: gav
// desc:   playing with gravity and elastic collision
// script: js

/**
 * UP key to add a new body
 * DOWN key to remove the oldest body (hold SHIFT + DOWN to remove one per frame)
 * LEFT/RIGHT keys to switch through bodies to follow
 * LEFT CLICK to follow the nearest body or toggle the body following
 * RIGHT CLICK to pin a body (prevent position update)
 * M to toggle zoomed out view of all bodies regardless of distance 
 * B key to toggle boundary walls (causes problems's if they snap-back inside eachother) 
 * R key to restart
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

	this.step = 1000/120;

	this.update_velocity = function(){

		// some error correction for when the maths breaks
		if(this.v_x === undefined || Number.isNaN(this.v_x)) this.v_x = 0;
		if(this.v_y === undefined || Number.isNaN(this.v_y)) this.v_y = 0;
		if(this.x === undefined || Number.isNaN(this.x)) this.x = win_w/2;
		if(this.y === undefined || Number.isNaN(this.y)) this.y = win_h/2;

		// gravity stretches over the whole universe! Check all bodies. In an actual implementation I'd probably limit this
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
			
			if(draw_connecting_lines && !mapmode) line(this.x-offset_x,this.y-offset_y,b.x-offset_x,b.y-offset_y,14);

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

// some variation on starting stuff
function mr(){
	return (Math.random() - 0.5) * 3;
}

// returns random int from min to max inclusive
function rand(min,max){ 
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// randomly add a new body in the starting area (if there is space for it)
// if no space is found in a second just cancel
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
	if(is_space) bodies.push(new OrbitalBody(m,r,x,y));
}

function intFact(num)
{
    var rval=1;
    for (var i = 2; i <= num; i++) rval = rval * i;
    return rval;
}

// some intial starting bodies
var sizes = [
	rand(7,30),
	rand(7,30),
	rand(7,30),
];
// OrbitalBody(mass,radius,spawn_x,spawn_y,pinned).
var bodies = [
	new OrbitalBody(sizes[0], sizes[0], 56+mr(),35+mr()),
	new OrbitalBody(sizes[1], sizes[1], 215+mr(),113+mr()),
	new OrbitalBody(sizes[2], sizes[2], 189+mr(),45+mr())
];


// set the body to follow with the camera
var main = false;
function setMain(body){
	if(body !== main){
		main = body;
	}else{
		main=false;
	}
}

var offset_x = 0
var offset_y = 0

var downheld = false;
var hidelines = false;
var mapmode = false;
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
	//59 = DOWN, 64 = SHIFT
	if(keyp(59) || (key(64) && key(59))){
		bodies.shift();
	}
	// 13 = M
	if(keyp(13)) mapmode = !mapmode;
	// 60 = LEFT, 61 = RIGHT
	if(keyp(60) || keyp(61)){
		if(main){
			var changed = false;
			for(var i = 0, l = bodies.length; i < l && !changed; i++){
				//find current main
				if(main===bodies[i]){
					var new_i = keyp(60) ? i-1 : i+1;
					new_i = new_i<0 ? new_i = bodies.length-1 : new_i%bodies.length;
					setMain(bodies[new_i]);
					changed = true;
				}
			}
		}
	}

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

			// from the distance line between the two circles, turn it into a normalised vector
			var nx = (b.x - a.x) / dist			
			var ny = (b.y - a.y) / dist			

			// now create a tangent line from this normalised vector
			var tx = ny*-1;
			var ty = nx;

			// tangential response, which direction to fire "sideways"
			// use dot products to get "angle similarity" of body against the tangent line. It will be between -1 and 1 (for normalised vectors)
			var dptan1 = a.v_x * tx + a.v_y * ty; // body a
			var dptan2 = b.v_x * tx + b.v_y * ty; // body b 

			// do the same thing to get the dot products against the normal line.
			// I understand what is happening here but not how to visualise it
			var dpnorm1 = a.v_x * nx + a.v_y * ny; // body a
			var dpnorm2 = b.v_x * nx + b.v_y * ny; // body b 

			// conserve 2d momentum
			var m1 = (dpnorm1 * (a.m - b.m) + 2 * b.m * dpnorm2) / (a.m + b.m); // body a
			var m2 = (dpnorm2 * (b.m - a.m) + 2 * a.m * dpnorm1) / (a.m + b.m); // body b 

			// alter velocity in both tangential and normal responses
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
		print(((1000-t)/1000).toFixed(2),50,50,0); // draw countdown
	}

	// draw map mode circles and lines
	if(mapmode){
		var points = [];

		// get the bbox for these points
		var low_x=undefined,high_x=undefined,low_y=undefined,high_y=undefined;
		for(var i = 0, l = bodies.length; i < l; i++){
			var b = bodies[i];
			points.push([b.x,b.y,b.r]);
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

		// calculate the scale needed to resize the box to the window
		var x_range = high_x - low_x;
		var y_range = high_y - low_y;
		var x_scale = 1;
		var y_scale = 1;
		if(x_range > win_w) x_scale = win_w / x_range
		if(y_range > win_h) y_scale = win_h / y_range

		scale_to_use = Math.min(win_w / x_range, win_h / y_range, 1)
		x_scale = scale_to_use;
		y_scale = scale_to_use;

		if(false){
			var n = 7;
			print("x_range["+x_range.toFixed(1)+"] x_scale["+x_scale.toFixed(1)+"]",5,20+(n+=7),5);
			print("y_range["+y_range.toFixed(1)+"] y_scale["+y_scale.toFixed(1)+"]",5,20+(n+=7),5);
			print("points[0][0] " + String(points[0][0]),5,20+(n+=7),5);
			print("points[0][0]* x_scale " + String(points[0][0]* x_scale),5,20+(n+=7),5);
		}

		// draw lines and collect info for circles
		var circs_to_draw = [];
		while (points.length > 0) {
			var p = points.shift();
			var this_x = (p[0] * x_scale) - (low_x * x_scale);
			var this_y = (p[1] * y_scale) - (low_y * y_scale);

			for(var i = 0, l = points.length; i < l; i++){
				var t_x = (points[i][0] * x_scale) - (low_x * x_scale);
				var t_y = (points[i][1] * y_scale) - (low_y * y_scale);
				line(this_x,this_y,t_x,t_y,14)
			}
			circs_to_draw.push([this_x, this_y ,p[2] * scale_to_use, 5])
		}

		// draw reference rectangle
		rectb(0 - low_x * x_scale,0 - low_y * y_scale,win_w * x_scale,win_h * y_scale,force_in_box ? 2 : 13);

		// draw resized circles
		while(circs_to_draw.length > 0){
			var c = circs_to_draw.shift();
			circb(c[0],c[1],c[2],c[3]);
			pix(c[0],c[1], 12);
		}

	}else{

			// draw main rectangl
		rectb(0 - offset_x,0 - offset_y,win_w,win_h, force_in_box ? 2 : 13);

		// draw bodies
		for(var i = 0, l = bodies.length; i < l; i++){
			var b = bodies[i];
			
			// draw circle
			circb(b.x - offset_x,b.y - offset_y,b.r, b === main ? 6 : b.c);
		
			// mass and radius
			var s1 = "m:"+String(b.m)+" r:"+String(b.r);
			var sl1 = print(s1, -100,-100,0,false,1,true);
			print(s1, b.x - offset_x - (sl1*0.5), b.y - offset_y - 7,13,false,1,true);

			// x and y position
			var s2 = "x:"+b.x.toFixed(1)+" y:"+b.y.toFixed(1);
			var sl2 = print(s2, -100,-100,0,false,1,true);
			print(s2, b.x - offset_x - (sl2*0.5), b.y - offset_y+2,13,false,1,true);

			// pinned label
			if(b.pinned){
				var sl = print("pinned",-100,-100,1,false,1,true);
				print("pinned",b.x - offset_x - (sl/2),b.y - offset_y,b.c,false,1,true);
			} 

			// velocity arrows
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

	// 'camera' offset from main
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

	// print("mx["+String(mx)+"] my["+String(my)+"]",2,win_h-7,0);

	
	if((ml || mr) && time()-mouse_clicked > 333){
		mouse_clicked = time();

		// get nearest celestial body to mouse on screen
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
				setMain(nearest);
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

	// how many checks are being done?
	var checks = intFact(bodies.length);
	checks = checks === 1 ? 0 : checks;

	print("bodies["+String(bodies.length)+"]",2,2,0);
	print("collisions["+String(collisions)+"]",2,2+7,0);
	print("velocity updates / frame",2,2+14,0);
	print("["+String(checks)+"]",2,2+21,0);

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

// <COVER>
// 000:5a9000007494648393160f008800070000c2000000000f008800281be33533c3757a0f07a1c1c2490b2cfed77565c66800000030ff80abcdef03ac94badb83bedcbbc00682e84696e986aaeac6beeb07c27824d6bdea21c03cacfed35df081c1ece88c4a27974c99c992d1fc83d0d43865a65b885057990e0b87ccaa5bcc8296118edd97b7fb83c9af6a39fe8fc335013ef94dd63407f6c65522b548e6a8a7c8d8e872e7d7f70044856859c64457c55798f8f90a9719233a22a31a8a9a03735a1ada29427aaa3b4b428643fad89b0b6a4924690c5264e228a5c95bb740ac5253ac40e8bb4a327a75d9997d78796d5db9a83c3cb88c13ec10fc6e127e9eab363aa61ce6a595a94828993769dd89d62e234ec74e02691a318a72ada820cca7dc3b77d2e57293186dc3c44376fd71e7d2cc90876101ffd97c00b1915e2e800b4410294032153347985244e65ce8dd3996cc316471a15407c276b672e9f7bccc194e9d1dcd9c1ab355afab9c4fe814b522bc1142a5250224aa92348ca6ac51cc3d11f5198f157459821d39d197af4f3b5f4083415c0ccb5b913e2e246762a0818dbc77fa00302aa8e041ab3f9d559a48540b5a45f6ed7336d5eac02c6c09b9eba629da9e321671276979f935cbadb7851708eb8a35bae5116744961d02001cba8e0fe9cb6847be9e6a741389c1bbbf6446edd580375c4b4ea4a105660e53880910b0f4d21aa35ffd4d92c93a85cbdc165ead195bd7f04cbde10bf22e3c90f7761709b7e19e6860c84bcbe7004ba150afcf8d48a75f6efff20771cd24e2d977cdd5f6518606e3e85c471107e9083891c3a91651d18008110bcd967f115ff447e3de72dca0c7da21bd25c84a7c9148d5190465888e006a61787fd9356516b4c64832267ad273dd8082174a3210826b864690632f8af110f1237432a504526942c09ec85255045fde594aa3af978fc0023c5b417d19d59c85300623ac840410da5f343895fc8f817ac9e11c8c3284ac841be5635cd0846264232e296284d6ab946169b1a6818688632c8190191e4d4a9844f720a3289973432b52379c17acf5a577ec8972367b163d81b859282b7d5a1240a18e72f716838ebae2aa0a45f9f95c4475aa9a0da81efadae7252e571cafa10a24cb62b2281bffeae2be8caa81e8286621de419ac65a6c2d8ade6b7704bd3e37fd66be2492d6d5b74a7bca60bae29152aca0610bdfd436da9b562a0dca3b360ab8eefa1ba855249b4f6352ee6bebe0c13cebcc64befefb3f60c69adb8f64c844bbda61c86a9933ce200b3c8cceb420da50721e1b7c432da5828b3907cc491ccd62c33c8c9de0a6b4b67b890b1bacdb2989eeece205c51f9023f315338534bdcd03ec1a0bccde2dc4bdbcca8b0da2d482b2547a17432dfca4d123574229cd43cb25f217336dc848db537de430d30fdbe8c8d463e116f2d05bad4734c0f6bd75fbdce6fc867fd5134d60b7b17331e6bed0687d04bfdc332efd6a0fae0e487ed68f2109bbc624a9c5b6b2df87a258f4e313c013b3d993b0b937e29b7ef2f1c79f5e3d62e4ab4c1a47e8afb0c8bbea873ed47def3fab6afce787aee7bfc35fd0ab3fef5f322bbfea204e6c3ebbfad0f8b10058dddc3a29cb2f6bbaecab9c4f9bba854302b8ff37d36f7923f5d7f8eb6b288f861eb8f7a39ff1b8cf17be8bccf2a94b1f3f33e3cf6eb4c41fbaae3afd67ee640ca5cef0b7603aad4fc5576309c2ba95ad13d430dd70f32dd0caa6fc1f3c5c657823cddfa228da25f535e088abb0e75ec43734919c003024a11ef648fe3402422c2c71c0a6b8850aa56008a6591262d9f0914243c98b8684fbc58a92827523b4378b4a123b0f1af7d880229d6d7bc31c9962e747af8093698e39d01f8af5d519222de28e8b6fd51ff62a24e0f469813ab1930d8426459191be6c3b7397f2422d94c0b1f75d9a62e9c04117c45820d684db728f72479095516c844781bcdf1f31184859d07a796b1069fa0979aeedb1f02e14edffd3219713ca5012986e836dcfd2849f3cac3343867c38022b59c5984645c44c141d83321567a43a042340ea04d35af25b4852c0f843acde880953521839e4a98132e56f29f314154969e74c741acb139941c61d72fc85c39e52aac2661c2574cb883afb8054b40cc2ccba8b404a15888c081a475ce1e87f3b62d062c95e0cc5274727d1d2993bb4301d94e31443f118235469871fa451589bcbe42a64346ec28e1a8f8bcc436e03691f485d1e6712cb24922ff3c39745435a4e3ab45e15a26fc166356b979cd4eee0a2d53db067c09feabdd96ed9d1c6112451a49ba9672d7a3f3eb41046aa9b65811359435836647d1971eb185487cc0490a351534d53229affb42dbb05e4b0890cf3de43747203c063184d34e88f5c40c4ceb868c82809370f27b475acae49e580b389299ebaa481b021da2acc8f4150a5bb096a4f899429aa214fda60d536a4b3831c4887579a50128a611d2a55e01a2169a6daf8c7672d65021d86faa39caec8eb7d852565a0fab03b827677445186571bf9ea583d84be4f1153143591874c9692abacb24d6cb64b1aa3c895f6a4011ca86d49d207662531786031a2bc7b91371432bd533568242c9a69cce152338c2d95047744d20484572bb8cd7dd571398926583cebbcb80f61fcab7e53fe2719a4fc081b79690ab7f61aa5334c5b5d51b67fd361147a483d962a48f98fd256223b705c7c2f3e0501ff6815a3eb92d9f32d01a292c20ebd20c91177a461450cdb5ea511cd78f5e7f43c403fd1787509f1c76e2f24ce454188b4c67ba9db2b1c9aa51ba0272e265bc47e4aaf9c2631671543bc1e837c09d0c059ec005d55c02b4b8932f9e8fc0e49706eb8eb52ba0e49bc055e2fd19fb7ae57e550300b56e2b810c7fed912813a5dcdafa1eacc66e9767d897a9cbb5caebc7d2837971cad3b433d5906b66d272999a97d791bce89ad243577deb38624ff6d0d9da1d8aba57b86379e9fc0f9c266f91088c98318dc994dc9dd5a7c5ded0383327b20d7b2e2960835fcd8a7c543ba43a517bbaad15f0db5ca59273ad51394d4321a5ce5c176e314dca614f5b6092bed1b80c67da665bfcd317bff6ce1371af09f350aa2fe5d6e2388ee29d7add5b4bd5ad458d0cf0bd7c6514b07baa26f636f052041182744b32d9426045f64ee6a03131b83a77fdb34cf9ad0babd07bf9276831028f1382394e3f162b5db992f222170c140d6d64dc76a40c558ffbfd6b92b6ae8e2ad1a567217f9365c9d2c5951d8eca363adfde96390a58cdeede5cfbdfa0016bcd5e927e9a80228337a97dc5ec120de4ec57eb3fc11a1a43bdd13f8c5565306351dfbd747c9d9b99ef2f0ab4dda635faa7e1a9e657b876d7be160ca37d556e5ffafa73ae2679a78dbce6962b3adb6e76f5b72badee67427cd7ee1505b3dd7cd67fbb36f0eea77d96edbfe2aefb30ed5d28f1cfb9d3088f4c0cb2e71fc8f6cb3ef1fe0840000b3
// </COVER>

