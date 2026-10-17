(function(){var e=`// Parameters and sketch profiles are supplied by src/model.ts.
// Angle is measured from +Y toward +Z in the YOZ plane; shear = 1 / tan(hinge angle).
module angled_extrusion(z_distance) {
    multmatrix([
        [1, 0, 0, 0],
        [0, 1, shear, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ])
        linear_extrude(height = z_distance)
            children();
}

module cell() {
    union() {
        // Extrusion 1: outer rectangle floor minus the mid cut, with thickness measured along Z.
        angled_extrusion(wall_thickness)
            difference() {
                polygon(points = cell_outer_points);
                if (cell_mid_cut_width > 0)
                    polygon(points = cell_mid_cut_points);
            }
        // Full raised: side walls and front strip, excluding the pad end rectangle above the floor.
        for (profile = full_raised_profiles)
            angled_extrusion(base_height)
                difference() {
                    polygon(points = profile);
                    polygon(points = cell_pad_end_points);
                    if (cell_mid_cut_width > 0)
                        polygon(points = cell_mid_cut_points);
                }
        // Semi raised: back strip between the rims, plus its mirror, lowered by the wall thickness, hinge thickness, and hinge tolerance.
        for (profile = semi_raised_profiles)
            angled_extrusion(semi_raised_height)
                difference() {
                    polygon(points = profile);
                    if (cell_mid_cut_width > 0)
                        polygon(points = cell_mid_cut_points);
                }
    }
}

module base_solid() {
    union() {
        for (row = [0 : rows - 1])
            for (column = [0 : columns - 1])
                translate([column * column_pitch, -row * row_pitch, 0])
                    cell();
    }
}

module hinge_capsule_cut(x_start) {
    // The sketch's (Y,Z) capsule is extruded along X by the hinge cut length.
    multmatrix([
        [0, 0, 1, x_start],
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
    ])
        linear_extrude(height = hinge_cut_length)
            hull() {
                for (centre = hinge_centres)
                    translate(centre)
                        circle(r = hinge_radius, $fn = 64);
            }
}

// At both sides of every cell, cut inward from the outer face of the side wall.
module cell_hinge_cuts() {
    for (row = [0 : rows - 1])
        translate([0, -row * row_pitch, 0])
            for (column = [0 : columns - 1]) {
                hinge_capsule_cut(column * column_pitch - cell_width / 2 - wall_thickness);
                hinge_capsule_cut(column * column_pitch + cell_width / 2 + wall_thickness - hinge_cut_length);
            }
}

// A function, because a top-level assignment here would be evaluated before the appended -D parameters.
function model_width() = (columns - 1) * column_pitch + cell_width + 2 * wall_thickness;

// Map sketch (Y,Z) to model (Y,Z), with local Z running along X from the inset left side.
module along_x(inset) {
    multmatrix([
        [0, 0, 1, -cell_width / 2 - wall_thickness + inset],
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
    ])
        children();
}

module base_end_extrusion(points, inset) {
    along_x(inset)
        linear_extrude(height = model_width() - 2 * inset)
            polygon(points = points);
}

// The pink circle drilled through the yellow extrusion, with 45° chamfers of wall thickness / 2 at both ends.
module base_end_hole(inset) {
    length = model_width() - 2 * inset;
    chamfer = wall_thickness / 2;
    overshoot = 1;
    along_x(inset)
        translate([base_end_hole_centre[0], base_end_hole_centre[1], 0]) {
            translate([0, 0, -overshoot])
                cylinder(r = base_end_hole_radius, h = length + 2 * overshoot, $fn = 64);
            translate([0, 0, -overshoot])
                cylinder(r1 = base_end_hole_radius + chamfer + overshoot, r2 = base_end_hole_radius, h = chamfer + overshoot, $fn = 64);
            translate([0, 0, length - chamfer])
                cylinder(r1 = base_end_hole_radius, r2 = base_end_hole_radius + chamfer + overshoot, h = chamfer + overshoot, $fn = 64);
        }
}

module base_end() {
    inset = 2 * wall_thickness;
    // Blue polygon across the full model width.
    base_end_extrusion(base_end_points, 0);
    // Yellow outline, inset by twice the wall thickness on each side.
    if (model_width() > 2 * inset)
        difference() {
            base_end_extrusion(base_end_inner_points, inset);
            if (base_end_hole_radius > 0)
                base_end_hole(inset);
        }
}

// The purple outline cut through every row, keeping only the model's outer side walls.
module row_cuts() {
    if (model_width() > 2 * wall_thickness)
        for (row = [0 : rows - 1])
            translate([0, -row * row_pitch, 0])
                base_end_extrusion(base_end_cut_points, wall_thickness);
}

// Set with -D for coloured exports; left undefined, the part is uncoloured.
part_color = undef;
module part_colored() {
    if (is_undef(part_color)) children();
    else color(part_color) children();
}

part_colored() union() {
    difference() {
        base_solid();
        cell_hinge_cuts();
        row_cuts();
    }
    // Fused to row 0 along the outer 1–outer 2 face.
    base_end();
}
`,t=`// Parameters and sketch profiles are supplied by src/hinge-model.ts.
module hinge_half(extension = 0) {
    // The Hinge top sketch's blue outline, extruded symmetrically about Z = 0 by hinge thickness in total.
    linear_extrude(height = hinge_thickness, center = true)
        polygon(points = hinge_outline_points);
    // The Hinge side circle in (Y,Z), extruded along X from inner 3.
    multmatrix([
        [0, 0, 1, circle_x],
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
    ])
        linear_extrude(height = circle_length + extension)
            translate(circle_centre)
                circle(r = circle_radius, $fn = 64);
}

// Mirror across the ZOY plane; the halves meet along outer 1–inner 1 at X = 0.
module hinge(column) {
    hinge_half(column == columns - 1 ? pin_extension : 0);
    mirror([1, 0, 0])
        hinge_half(column == 0 ? pin_extension : 0);
}

// One hinge per column, at the same pitch as the base cells.
// Set with -D for coloured exports; left undefined, the part is uncoloured.
part_color = undef;
module part_colored() {
    if (is_undef(part_color)) children();
    else color(part_color) children();
}

part_colored() union() {
    for (column = [0 : columns - 1])
        translate([column * column_pitch, 0, 0])
            hinge(column);
    // The green bridge polygon, extruded like the blue outline, joins each pair of neighbours; none at the model's outer sides.
    if (columns > 1)
        for (column = [0 : columns - 2])
            translate([column * column_pitch, 0, 0])
                linear_extrude(height = hinge_thickness, center = true)
                    polygon(points = bridge_points);
}
`,n=`// Parameters are supplied by src/bolt-model.ts.
// Set with -D for coloured exports; left undefined, the part is uncoloured.
part_color = undef;
module part_colored() {
    if (is_undef(part_color)) children();
    else color(part_color) children();
}

part_colored() union() {
    // The Bolt sketch's red circle, extruded along Z by wall thickness.
    cylinder(r = head_radius, h = wall_thickness, $fn = 64);
    // The green circle, extruded by bolt length + wall thickness, with a 45° chamfer at its end.
    cylinder(r = shank_radius, h = shank_length - chamfer, $fn = 64);
    translate([0, 0, shank_length - chamfer])
        cylinder(r1 = shank_radius, r2 = shank_radius - chamfer, h = chamfer, $fn = 64);
}
`,r=`// Parameters and sketch profiles are supplied by src/stand-model.ts.
module stand_half() {
    // The Stand top sketch's blue outline, extruded along -Z by wall thickness from Z = Stand side outer 3 Z.
    translate([0, 0, top_z - wall_thickness])
        linear_extrude(height = wall_thickness)
            polygon(points = top_points);
    // The Stand side sketch's green outline in (Y,Z) minus its red circle, extruded toward O from X = outer 1 X.
    multmatrix([
        [0, 0, 1, side_x - wall_thickness],
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
    ])
        linear_extrude(height = wall_thickness)
            difference() {
                polygon(points = side_points);
                if (side_hole_radius > 0)
                    circle(r = side_hole_radius, $fn = 64);
            }
}

// Mirror across the YOZ plane; the plate halves meet along X = 0.
// Set with -D for coloured exports; left undefined, the part is uncoloured.
part_color = undef;
module part_colored() {
    if (is_undef(part_color)) children();
    else color(part_color) children();
}

part_colored() union() {
    stand_half();
    mirror([1, 0, 0])
        stand_half();
}
`;function i(e){let t={y:e.wallThickness+(e.hingeThickness+e.hingeTolerance)/Math.sin(e.hingeAngle*Math.PI/180),z:0},n=1/Math.tan(e.hingeAngle*Math.PI/180),r={y:t.y+e.baseHeight*n,z:e.baseHeight},i=e.baseHeight/2,a={y:t.y+i*n+i/Math.sin(e.hingeAngle*Math.PI/180),z:i},o=e.hingeAngle*Math.PI/180,s={y:t.y+e.wallThickness*Math.sin(o),z:t.z-e.wallThickness*Math.cos(o)},c={y:t.y+e.wallThickness/Math.sin(o),z:t.z},l={y:c.y+e.baseHeight*n,z:r.z};a.y+=l.y-r.y;let u=e.standAngle*Math.PI/180,d=i+e.standTolerance,f={y:a.y+d*Math.sin(u),z:a.z-d*Math.cos(u)},p={y:f.y+(r.z-f.z)*Math.cos(u)/Math.sin(u),z:r.z},m={y:a.y+Math.sqrt(Math.max(0,d**2-a.z**2)),z:0},h=(e.hingeThickness+e.hingeTolerance)/2,g=h,_=e.wallThickness+e.hingeThickness/2,v={y:t.y+_*n-g/Math.sin(o),z:_},y={z:e.baseHeight-e.wallThickness-(e.hingeThickness+e.hingeTolerance)/2,y:v.y+(e.baseHeight-e.wallThickness-(e.hingeThickness+e.hingeTolerance)/2-v.z)*n},b={y:y.y-Math.hypot(y.y-v.y,y.z-v.z)-e.hingeThickness,z:y.z},x={y:b.y-h,z:r.z},S={y:b.y-h,z:b.z},C={y:b.y,z:b.z-h},w={y:t.y+C.z*n,z:C.z};return{start:t,atHeight:r,slope:n,center:a,radius:i,arcRadius:d,outer5:m,holeRadius:(e.baseHeight-e.wallThickness*2-e.standHingeTolerance)/2,offsetStart:s,rest1:l,rest2:c,outer3:p,outer4:f,hingeCenter:v,hingeCenter2:y,hingeCenter3:b,hingeRadius:h,midCut1:x,midCut2:S,midCut3:C,cutCorner:w}}function a(e){let{center:t,arcRadius:n,outer3:r,outer4:a,outer5:o,rest1:s,rest2:c}=i(e),l=Math.atan2(o.z-t.z,o.y-t.y),u=Math.atan2(a.z-t.z,a.y-t.y),d=Math.max(0,u-l),f=Math.max(1,Math.ceil(64*d/(2*Math.PI))),p=Array.from({length:f+1},(e,r)=>{let i=l+d*r/f;return[t.y+n*Math.cos(i),t.z+n*Math.sin(i)]});return p[0]=[o.y,o.z],p[p.length-1]=[a.y,a.z],[[c.y,c.z],...p,[r.y,r.z],[s.y,s.z]]}function o(e,t,n,r){let i=Math.max(1,Math.ceil(64*Math.abs(r-n)/(2*Math.PI)));return Array.from({length:i+1},(a,o)=>{let s=n+(r-n)*o/i;return[e.y+t*Math.cos(s),e.z+t*Math.sin(s)]})}let s=.001;function c(e){let{atHeight:t,midCut1:n,hingeCenter3:r,hingeRadius:a,cutCorner:c}=i(e);return[[t.y,t.z+s],[n.y,n.z+s],...o(r,a,Math.PI,1.5*Math.PI),[c.y,c.z]].map(([e,t])=>[e+s,t])}let l={hingeAngle:45,cellWidth:64,cellMidCutWidth:32,cellLength:24,wallThickness:2,hingeThickness:3,hingeProfileWidth:7,hingeTolerance:.25,rimWidth:7};function u(e){let t=e.cellWidth/2+e.wallThickness,n=e.wallThickness+(e.hingeThickness+e.hingeTolerance)/Math.sin(e.hingeAngle*Math.PI/180),r=-e.cellLength-e.wallThickness;return[{name:`cell outer 1`,x:t,y:n,xFormula:`cell width / 2 + wall thickness`,yFormula:`wall thickness + (hinge thickness + hinge tolerance) / sin(hinge angle)`},{name:`cell outer 2`,x:t,y:r,xFormula:`cell width / 2 + wall thickness`,yFormula:`-cell length - wall thickness`},{name:`cell outer 3`,x:-t,y:r,xFormula:`-(cell width / 2 + wall thickness)`,yFormula:`-cell length - wall thickness`},{name:`cell outer 4`,x:-t,y:n,xFormula:`-(cell width / 2 + wall thickness)`,yFormula:`wall thickness + (hinge thickness + hinge tolerance) / sin(hinge angle)`}]}function d(e){let t=e.cellWidth/2;return[{name:`cell inner 1`,x:t,y:0,xFormula:`cell width / 2`,yFormula:`0`},{name:`cell inner 2`,x:t,y:-e.cellLength,xFormula:`cell width / 2`,yFormula:`-cell length`},{name:`cell inner 3`,x:-t,y:-e.cellLength,xFormula:`-cell width / 2`,yFormula:`-cell length`},{name:`cell inner 4`,x:-t,y:0,xFormula:`-cell width / 2`,yFormula:`0`}]}function f(e){let t=u(e)[1],n=d(e)[1],r=t.x-e.wallThickness-e.rimWidth;return[{name:`rim R 1`,x:r,y:n.y,xFormula:`cell width / 2 - rim width`,yFormula:n.yFormula},{name:`rim R 2`,x:r,y:n.y-e.wallThickness,xFormula:`cell width / 2 - rim width`,yFormula:`-cell length - wall thickness`}]}function p(e){let t=u(e),n=d(e);return[...t.slice(0,2).map((e,t)=>({...e,name:`cell outer mid ${t+1}`,x:0,xFormula:`0`})),...n.slice(0,2).map((e,t)=>({...e,name:`cell inner mid ${t+1}`,x:0,xFormula:`0`}))]}function m(e){let t=p(e),n=[t[0],t[3]].map((t,n)=>({...t,name:`mid cut R ${n+1}`,x:e.cellMidCutWidth/2,xFormula:`cell mid cut width / 2`,y:t.y+(n===0?-e.wallThickness:e.wallThickness),yFormula:n===0?`(${t.yFormula}) - wall thickness`:`(${t.yFormula}) + wall thickness`})),r=n.map(e=>({...e,name:e.name.replace(` R `,` L `),x:-e.x,xFormula:`-cell mid cut width / 2`}));return[...n,...r.reverse()]}function h(e){let t=e.cellWidth/2-2*e.wallThickness-e.hingeProfileWidth-e.hingeTolerance,n=`cell width / 2 - 2 * wall thickness - hinge profile width - hinge tolerance`,r=[u(e)[0],d(e)[0]].map((e,r)=>({...e,name:`pad end ${r+1} R`,x:t,xFormula:n})),i=r.map(e=>({...e,name:e.name.replace(` R`,` L`),x:-e.x,xFormula:`-(${n})`}));return[...r,...i.reverse()]}({...l});function g(e){for(let[t,n]of Object.entries(e)){if(!Number.isFinite(n))throw Error(`${t} must be a finite number.`);if(n<0)throw Error(`${t} must not be negative.`)}if(!Number.isInteger(e.rows)||!Number.isInteger(e.columns)||e.rows<1||e.columns<1)throw Error(`Rows and columns must be positive whole numbers.`);if(e.cellWidth<=0||e.cellLength<=0||e.wallThickness<=0)throw Error(`Cell width, cell length, and wall thickness must be greater than zero.`);if(e.baseHeight<=e.hingeThickness+e.hingeTolerance)throw Error(`Base height must exceed hinge thickness + hinge tolerance.`);if(e.standAngle<=0||e.standAngle>=180)throw Error(`Stand angle must be greater than 0° and less than 180°.`);if(e.baseTiltAngle>=180-e.standAngle)throw Error(`Stand angle + base tilt angle must be less than 180°.`);let t=e.baseHeight/2,n=Math.acos(Math.min(1,t/(t+e.standTolerance)))*180/Math.PI;if(e.standAngle<n||e.standAngle>180-n)throw Error(`Stand angle must be between ${n.toFixed(1)}° and ${(180-n).toFixed(1)}° for this stand tolerance and base height.`);if(e.hingeAngle<=0||e.hingeAngle>90)throw Error(`Hinge angle must be greater than 0° and at most 90°.`)}function _(e){let t=u(e),n=d(e),r=p(e),i=f(e),a=[r[0],t[0],t[1],i[1],i[0],n[1],n[0],r[2]].map(({x:e,y:t})=>[e,t]);return[a,a.map(([e,t])=>[-e,t]).reverse()]}function v(e){let t=p(e),n=f(e),r=[t[3],n[0],n[1],t[1]].map(({x:e,y:t})=>[e,t]);return[r,r.map(([e,t])=>[-e,t]).reverse()]}function y(e){return e.cellLength+e.wallThickness*2+(e.hingeThickness+e.hingeTolerance)/Math.sin(e.hingeAngle*Math.PI/180)}function b(e){g(e);let{hingeCenter:t,hingeCenter2:n,hingeRadius:r,rest1:o,atHeight:s,start:l,rest2:d,center:f,holeRadius:p,slope:b}=i(e),x={base_end_points:[o,s,l,d].map(({y:e,z:t})=>[e,t]),base_end_inner_points:a(e),base_end_cut_points:c(e),base_end_hole_centre:[f.y,f.z],base_end_hole_radius:p,hinge_centres:[[t.y,t.z],[n.y,n.z]],hinge_radius:r,hinge_cut_length:e.wallThickness*2+e.hingeProfileWidth+e.hingeTolerance,cell_width:e.cellWidth,full_raised_profiles:_(e),semi_raised_profiles:v(e),base_height:e.baseHeight,semi_raised_height:e.baseHeight-e.wallThickness-e.hingeThickness-e.hingeTolerance,cell_pad_end_points:h(e).map(({x:e,y:t})=>[e,t]),cell_mid_cut_points:m(e).map(({x:e,y:t})=>[e,t]),cell_mid_cut_width:e.cellMidCutWidth,cell_outer_points:u(e).map(({x:e,y:t})=>[e,t]),rows:e.rows,columns:e.columns,column_pitch:e.cellWidth+e.wallThickness,row_pitch:y(e),wall_thickness:e.wallThickness,shear:b};return Object.entries(x).flatMap(([e,t])=>[`-D`,`${e}=${JSON.stringify(t)}`])}function x(e,t,n,r){let i=e.x-t.x,a=e.y-t.y,o=n.x-t.x,s=n.y-t.y,c=Math.hypot(i,a),l=Math.hypot(o,s),u=i/c,d=a/c,f=o/l,p=s/l,m=Math.acos(Math.max(-1,Math.min(1,u*f+d*p)))/2,h=r/Math.tan(m),g=Math.hypot(u+f,d+p),_=r/Math.sin(m);return{radius:r,start:{x:t.x+u*h,y:t.y+d*h},end:{x:t.x+f*h,y:t.y+p*h},centre:{x:t.x+(u+f)/g*_,y:t.y+(d+p)/g*_},turn:Math.sign((t.x-e.x)*(n.y-t.y)-(t.y-e.y)*(n.x-t.x))}}function S(e){let t=Math.atan2(e.start.y-e.centre.y,e.start.x-e.centre.x),n=Math.atan2(e.end.y-e.centre.y,e.end.x-e.centre.x)-t;e.turn>0&&n<0&&(n+=2*Math.PI),e.turn<0&&n>0&&(n-=2*Math.PI);let r=Math.max(1,Math.ceil(64*Math.abs(n)/(2*Math.PI)));return Array.from({length:r+1},(i,a)=>{let o=t+n*a/r;return[e.centre.x+e.radius*Math.cos(o),e.centre.y+e.radius*Math.sin(o)]})}function C(e){let{hingeCenter:t,hingeCenter2:n}=i(e),r=Math.hypot(n.y-t.y,n.z-t.z),a=e.hingeTopWidth/2,o=e.cellWidth/2;return[{name:`outer 1`,x:0,y:e.hingeHeight,xFormula:`0`,yFormula:`hinge height`},{name:`outer 2`,x:a,y:e.hingeHeight,xFormula:`hinge top width / 2`,yFormula:`hinge height`},{name:`outer 3`,x:o,y:r,xFormula:`cell width / 2`,yFormula:`distance(hinge centre 1, hinge centre 2)`},{name:`outer 4`,x:o,y:0,xFormula:`cell width / 2`,yFormula:`0`}]}function w(e){let[,t,n,r]=C(e),i={name:`inner 1`,x:0,y:e.hingeHeight-e.hingeProfileWidth,xFormula:`0`,yFormula:`hinge height - hinge profile width`},a=n.x-t.x,o=n.y-t.y,s=Math.hypot(a,o),c=-o/s,l=a/s;return c*-t.x+l*-t.y<0&&(c=-c,l=-l),[i,{name:`inner 2`,x:t.x+(e.hingeProfileWidth-l*(i.y-t.y))/c,y:i.y,xFormula:`outer 2–outer 3 shifted toward O by hinge profile width, at inner 1 Y`,yFormula:`hinge height - hinge profile width`},{name:`inner 3`,x:r.x-e.hingeProfileWidth,y:r.y,xFormula:`cell width / 2 - hinge profile width`,yFormula:`0`}]}function T(e){let[,,t,n]=C(e);return[t,n].map((t,n)=>({...t,name:`bridge ${n+1}`,x:t.x+e.wallThickness,xFormula:`cell width / 2 + wall thickness`}))}function E(e){let[t,n,r,i]=C(e),[a,o,s]=w(e),c=e.hingeProfileWidth/2;return{radius:c,outer1:t,outer3:r,outer4:i,inner3:s,inner1:a,outer2:x(t,n,r,c),inner2:x(s,o,a,c)}}function D(e){return{radius:e.hingeThickness/2,centre:{y:0,z:0}}}function O(e){let t=E(e);return[[t.outer1.x,t.outer1.y],...S(t.outer2),[t.outer3.x,t.outer3.y],[t.outer4.x,t.outer4.y],[t.inner3.x,t.inner3.y],...S(t.inner2),[t.inner1.x,t.inner1.y]]}function k(e){g(e);let{radius:t,centre:n}=D(e),r=w(e)[2],[,,i,a]=C(e),[o,s]=T(e),c={hinge_thickness:e.hingeThickness,hinge_outline_points:O(e),circle_centre:[n.y,n.z],circle_radius:t,circle_x:r.x,pin_extension:e.hingePinExtension,circle_length:e.hingeProfileWidth+e.wallThickness,bridge_points:[i,a,s,o].map(({x:e,y:t})=>[e,t]),columns:e.columns,column_pitch:e.cellWidth+e.wallThickness};return Object.entries(c).flatMap(([e,t])=>[`-D`,`${e}=${JSON.stringify(t)}`])}function A(e){return{outerRadius:(e.baseHeight-e.hingeTolerance)/2,innerRadius:i(e).holeRadius-e.boltTolerance/2}}function j(e){g(e);let{outerRadius:t,innerRadius:n}=A(e);if(n<=0)throw Error(`The bolt shank radius must be greater than zero.`);let r={wall_thickness:e.wallThickness,head_radius:t,shank_radius:n,shank_length:e.boltLength+e.wallThickness,chamfer:n/3};return Object.entries(r).flatMap(([e,t])=>[`-D`,`${e}=${JSON.stringify(t)}`])}function M(e){let{center:t,start:n,outer3:r,outer4:a,arcRadius:o}=i(e),[s,c]=u(e),l=Math.hypot(r.y-a.y,r.z-a.z),d=t.y-n.y,f=d+(s.y-c.y)*e.rows,p=e.standAngle*Math.PI/180,m=e.baseTiltAngle*Math.PI/180,h=p+m,g=h>=Math.PI/2?-o:-(o+e.wallThickness),_=(f*Math.sin(m)+t.z*Math.cos(m)+g*Math.cos(h))/Math.sin(h),v=(e.wallThickness*(e.columns+1)+e.cellWidth*e.columns)/2-e.wallThickness;return{yTop1:l,yTop2:d,fullLength:f,standLength:_,outer1:{x:v,y:l},outer2:{x:v,y:-_},outer3:{x:0,y:-_},outer4:{x:0,y:l},inner1:{x:0,y:-e.standProfileWidth},inner2:{x:v-e.standProfileWidth,y:-e.standProfileWidth},inner3:{x:v-e.standProfileWidth,y:-_+e.standProfileWidth},inner4:{x:0,y:-_+e.standProfileWidth}}}function N(e){let{inner1:t,inner2:n,inner3:r,inner4:i}=M(e),a=e.standProfileWidth/2;return{inner3:x(i,r,n,a),inner2:x(r,n,t,a)}}function P(e){let t=i(e).arcRadius,n=(e.baseHeight-e.standHingeTolerance)/2;return{outerRadius:(e.baseHeight-e.standHingeTolerance)/2,innerRadius:(e.baseHeight-2*e.wallThickness)/2,outer1:{y:n,z:0},outer2:{y:-n,z:0},outer3:{y:-n,z:-t},outer4:{y:n,z:-t},outer5:{y:-n,z:-t-e.wallThickness},outer6:{y:n,z:-t-e.wallThickness}}}function F(e){let t=M(e),n=N(e);return[...[t.outer1,t.outer2,t.outer3,t.inner4].map(({x:e,y:t})=>[e,t]),...S(n.inner3),...S(n.inner2),...[t.inner1,t.outer4].map(({x:e,y:t})=>[e,t])]}function I(e){let{outerRadius:t,outer3:n,outer4:r}=P(e);return[...Array.from({length:33},(e,n)=>{let r=Math.PI*n/32;return[t*Math.cos(r),t*Math.sin(r)]}),[n.y,n.z],[r.y,r.z]]}function L(e){g(e);let t={wall_thickness:e.wallThickness,top_points:F(e),side_points:I(e),side_hole_radius:P(e).innerRadius,side_x:M(e).outer1.x,top_z:P(e).outer3.z};return Object.entries(t).flatMap(([e,t])=>[`-D`,`${e}=${JSON.stringify(t)}`])}let R={base:{source:e,definitions:b},hinge:{source:t,definitions:k},bolt:{source:n,definitions:j},stand:{source:r,definitions:L}};self.onmessage=async({data:e})=>{let t=[];try{let n=R[e.model],r=e.format??`stl`,i=[...n.definitions(e.params),...e.color?[`-D`,`part_color=${JSON.stringify(e.color)}`]:[]],{default:a}=await import(
/* @vite-ignore */
e.runtimeUrl),o=await a({noInitialRun:!0,print:e=>t.push(e),printErr:e=>t.push(e)});o.FS.writeFile(`/model.scad`,n.source);let s=o.callMain([`/model.scad`,...i,`--export-format`,r===`stl`?`binstl`:`3mf`,`-o`,`/model.${r}`]);if(s!==0)throw Error(t.join(`
`)||`OpenSCAD exited with code ${s}.`);let c=o.FS.readFile(`/model.${r}`).slice().buffer;self.postMessage({stl:c},{transfer:[c]})}catch(e){self.postMessage({error:e instanceof Error?e.message:String(e)})}}})();