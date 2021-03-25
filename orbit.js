// title:  game title
// author: game developer
// desc:   short description
// script: js

var win_w = 240
var win_h = 136 

var gravitational_constant = 0.01;
var force_in_box = false;

function magnitude(x,y){
	return Math.sqrt(x*x + y*y);
}
// square_magnitude = x*x + y*y

function point_dist(x1,y1,x2,y2){ // returns distance between two points
	return Math.sqrt(((x2-x1) * (x2-x1)) + ((y2-y1) * (y2-y1)));
}

function getForce(body, body2){
	var dist = point_dist(body.x, body.y, body2.x, body2.y);
	return gravitational_constant * ((body.m & body2.m)/(dist*dist))
}

var Body = function(mass,radius,spawn_x,spawn_y,pinned){
	this.m = mass;
	this.r = radius;
	this.x = spawn_x;
	this.y = spawn_y;
	this.v_x = ((Math.random() - 0.5) / 5) * rescale;
	this.v_y = ((Math.random() - 0.5) / 5) * rescale;
	this.pinned = pinned ? pinned : false;
	this.c = 5;

	this.v_x = 0;
	this.v_y = 0;

	this.step = 1000/120;

	this.update_velocity = function(){

		for(var i = 0, l = bodies.length; i < l; i++){
			var b = bodies[i];
			if(b === this) continue;

			// if my distance to this body is = or < both our radiuses, skip me
			var dist = point_dist(this.x,this.y,b.x,b.y);
			if(dist <= this.r + b.r){
				continue;
			}

			var offset_x = main.x - win_w / 2;
			var offset_y = main.y - win_h / 2;
			line(this.x-offset_x,this.y-offset_y,b.x-offset_x,b.y-offset_y,14);

			var sqrDist = ((b.x-this.x) * (b.x-this.x)) + ((b.y-this.y) * (b.y-this.y))

			var dx = this.x - b.x;
			var dy = this.y - b.y;

			var mag = Math.sqrt(sqrDist);

			var forceDir_x = dx;
			var forceDir_y = dy;
			if(mag > 0){ // only normalise if magnitude is more than 0
				forceDir_x = dx / mag
				forceDir_y = dy / mag
			}

			var force_x = forceDir_x * gravitational_constant * this.m * b.m / sqrDist
			var force_y = forceDir_y * gravitational_constant * this.m * b.m / sqrDist

			var acceleration_x = force_x / this.m
			var acceleration_y = force_y / this.m

			this.v_x+= acceleration_x * this.step;
			this.v_y+= acceleration_y * this.step;
		}
	}

	this.update_position = function(){
		if(this.pinned) return;
		this.x-= this.v_x * this.step;
		this.y-= this.v_y * this.step;

		if(force_in_box){
			if(this.x < 0) this.x = 0;
			if(this.y < 0) this.y = 0;
			if(this.x > win_w) this.x = win_w;
			if(this.y > win_h) this.y = win_h;
		}

	}
}


function setStable(){

	main = new Body(50*rescale, 50*rescale, win_w/2,(win_h/4)*1);
	var twin = new Body(50*rescale, 50*rescale, win_w/2,(win_h/4)*3)

	main.v_x = -0.085 * rescale;
	twin.v_x = +0.085 * rescale;
	main.v_y = 0;
	twin.v_y = 0;

	bodies = [
		main,
		twin,
	]

}


// init some bodies to start with
var rescale = 0.5;
var main = new Body(100*rescale, 35*rescale, win_w/2,win_h/2); // this body is 'tracked' by the camera
var bodies = [
	new Body(10*rescale, 10*rescale, 19,19),
	new Body(15*rescale, 15*rescale, 190,41),
	new Body(20*rescale, 20*rescale, 70,114),
	new Body(30*rescale, 30*rescale, 220,110),
	main
];

main.c = 6;
main.is_main = true;


function TIC()
{
	cls(13)

	// update all bodies
	if(time() > 1000){
		for(var i = 0, l = bodies.length; i < l; i++){
			var b = bodies[i];
			b.update_velocity();
		}
		for(var i = 0, l = bodies.length; i < l; i++){
			var b = bodies[i];
			b.update_position();
		}
	}else{
		print(((1000-time())/1000).toFixed(2),50,50,0,true);
	}


	// draw bodies
	var offset_x = main.x - win_w / 2;
	var offset_y = main.y - win_h / 2;
	for(var i = 0, l = bodies.length; i < l; i++){
		var b = bodies[i];
		circb(b.x - offset_x,b.y - offset_y,b.r,b.c);
		if(b.pinned){
			var sl = print("pinned",-100,-100,1,false,1,true);
			print("pinned",b.x - offset_x - (sl/2),b.y - offset_y,b.c,false,1,true);
		} 
	}

	// draw 'main' window
	rectb(0 - offset_x,0 - offset_y,win_w,win_h,0);
	





}

var mouse_clicked = time();
function OVR(){

	var mouseData=mouse(),
	mx=mouseData[0], // x
	my=mouseData[1], // y
	ml=mouseData[2], // left
	mm=mouseData[3], // middle
	mr=mouseData[4], // right
	msx=mouseData[5], // scrollx
	msy=mouseData[6]; // scrolly

	var offset_x = main.x - win_w / 2;
	var offset_y = main.y - win_h / 2;

	

	for(var i = 0, l = bodies.length; i < l; i++){
		var b = bodies[i];
		var bx = b.x - offset_x
		var by = b.y - offset_y

		pix(bx,by,0);
		
	}

	if(key(28)){ // the 1 key
		if(main){
			main.x = win_w / 2;
			main.y = win_h / 2;
		}
	}
	
	if((ml || mr || mm) && time()-mouse_clicked > 333){
		mouse_clicked = time();
		
		if(mm){
			setStable();
		}
		
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
				main.c = 5
				main.is_main = false
				main = nearest
				main.c = 6
				main.is_main = true
			}
			if(mr){
				nearest.pinned = !nearest.pinned;
				if(!nearest.pinned){
					nearest.v_x = 0
					nearest.v_y = 0
				}
			}
		}

	}

	var offset_x = main.x - win_w / 2;
	var offset_y = main.y - win_h / 2;
	var s = "mass:"+String(main.m)+" radius:"+String(main.r)+" pos:("+main.x.toFixed(2)+","+main.y.toFixed(2)+")";
	var l = print(s,-100,-100, 0,false,1,true);
	print(s,main.x - offset_x - (l/2), main.y - offset_y + main.r + 3, 0,false,1,true);
	
	
	


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

