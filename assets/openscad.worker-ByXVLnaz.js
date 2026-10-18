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

// Pad end points (R 1, R 2, L 2, L 1) moved away from the Y axis by the wall thickness on sides shared with a neighbour.
function column_pad_end_points(column) =
    let(right = column < columns - 1 ? wall_thickness : 0, left = column > 0 ? wall_thickness : 0)
    [for (i = [0 : 3]) [cell_pad_end_points[i][0] + (i < 2 ? right : -left), cell_pad_end_points[i][1]]];

module cell(column) {
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
                    polygon(points = column_pad_end_points(column));
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
                    cell(column);
    }
}

// Overshoot past the side wall's outer face, so the cut does not share that face (avoids coincident-face artifacts).
hinge_cut_epsilon = 0.001;

// outward: -1 when the side wall's outer face is at x_start, +1 when it is at x_start + hinge cut length.
module hinge_capsule_cut(x_start, outward, length) {
    // The sketch's (Y,Z) capsule is extruded along X by the given length, plus epsilon past the outer face.
    multmatrix([
        [0, 0, 1, x_start - (outward < 0 ? hinge_cut_epsilon : 0)],
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
    ])
        linear_extrude(height = length + hinge_cut_epsilon)
            hull() {
                for (centre = hinge_centres)
                    translate(centre)
                        circle(r = hinge_radius, $fn = 64);
            }
}

// At both sides of every cell, cut inward from the outer face of the side wall;
// cuts at walls shared with a neighbour are shorter by the wall thickness.
module cell_hinge_cuts() {
    for (row = [0 : rows - 1])
        translate([0, -row * row_pitch, 0])
            for (column = [0 : columns - 1]) {
                left_length = hinge_cut_length - (column > 0 ? wall_thickness : 0);
                right_length = hinge_cut_length - (column < columns - 1 ? wall_thickness : 0);
                hinge_capsule_cut(column * column_pitch - cell_width / 2 - wall_thickness, -1, left_length);
                hinge_capsule_cut(column * column_pitch + cell_width / 2 + wall_thickness - right_length, 1, right_length);
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
    inset = wall_thickness + stand_thickness;
    // Blue polygon across the full model width.
    base_end_extrusion(base_end_points, 0);
    // Yellow outline, inset by the wall thickness plus the stand thickness on each side, leaving room for the stand's side walls.
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
    // The Stand top sketch's blue outline minus its holes, extruded along -Z by stand thickness from Z = Stand side outer 3 Z.
    translate([0, 0, top_z - stand_thickness])
        linear_extrude(height = stand_thickness)
            difference() {
                polygon(points = top_points);
                for (hole = top_holes)
                    polygon(points = hole);
            }
    // The Stand side sketch's green outline in (Y,Z) minus its red circle, extruded toward O from X = outer 1 X.
    multmatrix([
        [0, 0, 1, side_x - stand_thickness],
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
    ])
        linear_extrude(height = stand_thickness)
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
`;function i(e){let t={y:e.wallThickness+(e.hingeThickness+e.hingeTolerance)/Math.sin(e.hingeAngle*Math.PI/180),z:0},n=1/Math.tan(e.hingeAngle*Math.PI/180),r={y:t.y+e.baseHeight*n,z:e.baseHeight},i=e.baseHeight/2,a={y:t.y+i*n+i/Math.sin(e.hingeAngle*Math.PI/180),z:i},o=e.hingeAngle*Math.PI/180,s={y:t.y+e.wallThickness*Math.sin(o),z:t.z-e.wallThickness*Math.cos(o)},c={y:t.y+e.wallThickness/Math.sin(o),z:t.z},l={y:c.y+e.baseHeight*n,z:r.z};a.y+=l.y-r.y;let u=e.standAngle*Math.PI/180,d=i+e.standTolerance,f={y:a.y+d*Math.sin(u),z:a.z-d*Math.cos(u)},p={y:f.y+(r.z-f.z)*Math.cos(u)/Math.sin(u),z:r.z},m={y:a.y+Math.sqrt(Math.max(0,d**2-a.z**2)),z:0},h=(e.hingeThickness+e.hingeTolerance)/2,g=h,_=e.wallThickness+e.hingeThickness/2,v={y:t.y+_*n-g/Math.sin(o),z:_},y={z:e.baseHeight-e.wallThickness-(e.hingeThickness+e.hingeTolerance)/2,y:v.y+(e.baseHeight-e.wallThickness-(e.hingeThickness+e.hingeTolerance)/2-v.z)*n},b={y:y.y-Math.hypot(y.y-v.y,y.z-v.z)-e.hingeThickness,z:y.z},x={y:b.y-h,z:r.z},S={y:b.y-h,z:b.z},C={y:b.y,z:b.z-h},w={y:t.y+C.z*n,z:C.z};return{start:t,atHeight:r,slope:n,center:a,radius:i,arcRadius:d,outer5:m,holeRadius:(e.baseHeight-e.wallThickness*2-e.standHingeTolerance)/2,offsetStart:s,rest1:l,rest2:c,outer3:p,outer4:f,hingeCenter:v,hingeCenter2:y,hingeCenter3:b,hingeRadius:h,midCut1:x,midCut2:S,midCut3:C,cutCorner:w}}function a(e){let{hingeCenter:t,hingeCenter2:n}=i(e);return Math.hypot(n.y-t.y,n.z-t.z)}function o(e){let{center:t,arcRadius:n,outer3:r,outer4:a,outer5:o,rest1:s,rest2:c}=i(e),l=Math.atan2(o.z-t.z,o.y-t.y),u=Math.atan2(a.z-t.z,a.y-t.y),d=Math.max(0,u-l),f=Math.max(1,Math.ceil(64*d/(2*Math.PI))),p=Array.from({length:f+1},(e,r)=>{let i=l+d*r/f;return[t.y+n*Math.cos(i),t.z+n*Math.sin(i)]});return p[0]=[o.y,o.z],p[p.length-1]=[a.y,a.z],[[c.y,c.z],...p,[r.y,r.z],[s.y,s.z]]}function s(e,t,n,r){let i=Math.max(1,Math.ceil(64*Math.abs(r-n)/(2*Math.PI)));return Array.from({length:i+1},(a,o)=>{let s=n+(r-n)*o/i;return[e.y+t*Math.cos(s),e.z+t*Math.sin(s)]})}let c=.001;function l(e){let{atHeight:t,midCut1:n,hingeCenter3:r,hingeRadius:a,cutCorner:o}=i(e);return[[t.y,t.z+c],[n.y,n.z+c],...s(r,a,Math.PI,1.5*Math.PI),[o.y,o.z]].map(([e,t])=>[e+c,t])}function u(e,t,n,r){let i=e.x-t.x,a=e.y-t.y,o=n.x-t.x,s=n.y-t.y,c=Math.hypot(i,a),l=Math.hypot(o,s),u=i/c,d=a/c,f=o/l,p=s/l,m=Math.acos(Math.max(-1,Math.min(1,u*f+d*p)))/2,h=r/Math.tan(m),g=Math.hypot(u+f,d+p),_=r/Math.sin(m);return{radius:r,start:{x:t.x+u*h,y:t.y+d*h},end:{x:t.x+f*h,y:t.y+p*h},centre:{x:t.x+(u+f)/g*_,y:t.y+(d+p)/g*_},turn:Math.sign((t.x-e.x)*(n.y-t.y)-(t.y-e.y)*(n.x-t.x))}}function d(e){let t=Math.atan2(e.start.y-e.centre.y,e.start.x-e.centre.x),n=Math.atan2(e.end.y-e.centre.y,e.end.x-e.centre.x)-t;e.turn>0&&n<0&&(n+=2*Math.PI),e.turn<0&&n>0&&(n-=2*Math.PI);let r=Math.max(1,Math.ceil(64*Math.abs(n)/(2*Math.PI)));return Array.from({length:r+1},(i,a)=>{let o=t+n*a/r;return[e.centre.x+e.radius*Math.cos(o),e.centre.y+e.radius*Math.sin(o)]})}let f={hingeAngle:45,cellWidth:64,cellMidCutWidth:32,cellLength:24,wallThickness:1.6,hingeThickness:3,hingeProfileWidth:7,hingeTolerance:.18,rimWidth:7};function p(e){let t=e.cellWidth/2+e.wallThickness,n=e.wallThickness+(e.hingeThickness+e.hingeTolerance)/Math.sin(e.hingeAngle*Math.PI/180),r=-e.cellLength-e.wallThickness;return[{name:`cell outer 1`,x:t,y:n,xFormula:`cell width / 2 + wall thickness`,yFormula:`wall thickness + (hinge thickness + hinge tolerance) / sin(hinge angle)`},{name:`cell outer 2`,x:t,y:r,xFormula:`cell width / 2 + wall thickness`,yFormula:`-cell length - wall thickness`},{name:`cell outer 3`,x:-t,y:r,xFormula:`-(cell width / 2 + wall thickness)`,yFormula:`-cell length - wall thickness`},{name:`cell outer 4`,x:-t,y:n,xFormula:`-(cell width / 2 + wall thickness)`,yFormula:`wall thickness + (hinge thickness + hinge tolerance) / sin(hinge angle)`}]}function m(e){let t=e.cellWidth/2;return[{name:`cell inner 1`,x:t,y:0,xFormula:`cell width / 2`,yFormula:`0`},{name:`cell inner 2`,x:t,y:-e.cellLength,xFormula:`cell width / 2`,yFormula:`-cell length`},{name:`cell inner 3`,x:-t,y:-e.cellLength,xFormula:`-cell width / 2`,yFormula:`-cell length`},{name:`cell inner 4`,x:-t,y:0,xFormula:`-cell width / 2`,yFormula:`0`}]}function h(e){let t=p(e)[1],n=m(e)[1],r=t.x-e.wallThickness-e.rimWidth;return[{name:`rim R 1`,x:r,y:n.y,xFormula:`cell width / 2 - rim width`,yFormula:n.yFormula},{name:`rim R 2`,x:r,y:n.y-e.wallThickness,xFormula:`cell width / 2 - rim width`,yFormula:`-cell length - wall thickness`}]}function g(e){let t=p(e),n=m(e);return[...t.slice(0,2).map((e,t)=>({...e,name:`cell outer mid ${t+1}`,x:0,xFormula:`0`})),...n.slice(0,2).map((e,t)=>({...e,name:`cell inner mid ${t+1}`,x:0,xFormula:`0`}))]}function _(e){let t=g(e),n=[t[0],t[3]].map((t,n)=>({...t,name:`mid cut R ${n+1}`,x:e.cellMidCutWidth/2,xFormula:`cell mid cut width / 2`,y:t.y+(n===0?-e.wallThickness:e.wallThickness),yFormula:n===0?`(${t.yFormula}) - wall thickness`:`(${t.yFormula}) + wall thickness`})),r=n.map(e=>({...e,name:e.name.replace(` R `,` L `),x:-e.x,xFormula:`-cell mid cut width / 2`}));return[...n,...r.reverse()]}function v(e){let t=_(e);return t.map((n,r)=>u(t[(r+t.length-1)%t.length],n,t[(r+1)%t.length],e.wallThickness))}function y(e){return v(e).flatMap(d)}function b(e,t=0){let n=e.cellWidth/2-2*e.wallThickness-e.hingeProfileWidth-e.hingeTolerance-t,r=`cell width / 2 - 2 * wall thickness - hinge profile width - hinge tolerance - hinge travel ΔX`,i=[p(e)[0],m(e)[0]].map((e,t)=>({...e,name:`pad end ${t+1} R`,x:n,xFormula:r})),a=i.map(e=>({...e,name:e.name.replace(` R`,` L`),x:-e.x,xFormula:`-(${r})`}));return[...i,...a.reverse()]}function x(e){let t=a(e),n=e.hingeTopWidth/2,r=e.cellWidth/2;return[{name:`outer 1`,x:0,y:e.hingeHeight,xFormula:`0`,yFormula:`hinge height`},{name:`outer 2`,x:n,y:e.hingeHeight,xFormula:`hinge top width / 2`,yFormula:`hinge height`},{name:`outer 3`,x:r,y:t,xFormula:`cell width / 2`,yFormula:`distance(hinge centre 1, hinge centre 2)`},{name:`outer 4`,x:r,y:0,xFormula:`cell width / 2`,yFormula:`0`}]}function S(e){let[,t,n,r]=x(e),i={name:`inner 1`,x:0,y:e.hingeHeight-e.hingeProfileWidth,xFormula:`0`,yFormula:`hinge height - hinge profile width`},a=n.x-t.x,o=n.y-t.y,s=Math.hypot(a,o),c=-o/s,l=a/s;return c*-t.x+l*-t.y<0&&(c=-c,l=-l),[i,{name:`inner 2`,x:t.x+(e.hingeProfileWidth-l*(i.y-t.y))/c,y:i.y,xFormula:`outer 2–outer 3 shifted toward O by hinge profile width, at inner 1 Y`,yFormula:`hinge height - hinge profile width`},{name:`inner 3`,x:r.x-e.hingeProfileWidth,y:r.y,xFormula:`cell width / 2 - hinge profile width`,yFormula:`0`}]}function C(e){let[,t,n]=S(e);return a(e)*Math.abs(t.x-n.x)/Math.hypot(t.x-n.x,t.y-n.y)}function w(e){let[,,t,n]=x(e);return[t,n].map((t,n)=>({...t,name:`bridge ${n+1}`,x:t.x+e.wallThickness,xFormula:`cell width / 2 + wall thickness`}))}function T(e){let[t,n,r,i]=x(e),[a,o,s]=S(e),c=e.hingeProfileWidth/2;return{radius:c,outer1:t,outer3:r,outer4:i,inner3:s,inner1:a,outer2:u(t,n,r,c),inner2:u(s,o,a,c)}}({...f});function E(e){for(let[t,n]of Object.entries(e)){if(!Number.isFinite(n))throw Error(`${t} must be a finite number.`);if(n<0)throw Error(`${t} must not be negative.`)}if(!Number.isInteger(e.rows)||!Number.isInteger(e.columns)||e.rows<1||e.columns<1)throw Error(`Rows and columns must be positive whole numbers.`);if(e.cellWidth<=0||e.cellLength<=0||e.wallThickness<=0||e.standThickness<=0)throw Error(`Cell width, cell length, wall thickness, and stand thickness must be greater than zero.`);if(e.baseHeight<=e.hingeThickness+e.hingeTolerance)throw Error(`Base height must exceed hinge thickness + hinge tolerance.`);if(e.standAngle<=0||e.standAngle>=180)throw Error(`Stand angle must be greater than 0° and less than 180°.`);if(e.baseTiltAngle>=180-e.standAngle)throw Error(`Stand angle + base tilt angle must be less than 180°.`);let t=e.baseHeight/2,n=Math.acos(Math.min(1,t/(t+e.standTolerance)))*180/Math.PI;if(e.standAngle<n||e.standAngle>180-n)throw Error(`Stand angle must be between ${n.toFixed(1)}° and ${(180-n).toFixed(1)}° for this stand tolerance and base height.`);if(e.cellMidCutWidth>0&&e.cellMidCutWidth<2*e.wallThickness)throw Error(`Cell mid cut width must be 0 or at least twice the wall thickness.`);if(e.standPatternCellSize>0&&e.standPatternCellSize<5)throw Error(`Stand pattern cell size must be 0 or at least 5 mm.`);if(e.standPatternCellSize>0&&e.standPatternRibWidth<=0)throw Error(`Stand pattern rib width must be greater than zero.`);if(!Number.isInteger(e.standPatternSeed)||!Number.isInteger(e.standPatternRelaxations))throw Error(`Stand pattern seed and relaxations must be whole numbers.`);if(e.hingeAngle<=0||e.hingeAngle>90)throw Error(`Hinge angle must be greater than 0° and at most 90°.`)}function D(e){let t=p(e),n=m(e),r=g(e),i=h(e),a=[r[0],t[0],t[1],i[1],i[0],n[1],n[0],r[2]].map(({x:e,y:t})=>[e,t]);return[a,a.map(([e,t])=>[-e,t]).reverse()]}function O(e){let t=g(e),n=h(e),r=[t[3],n[0],n[1],t[1]].map(({x:e,y:t})=>[e,t]);return[r,r.map(([e,t])=>[-e,t]).reverse()]}function k(e){return e.cellLength+e.wallThickness*2+(e.hingeThickness+e.hingeTolerance)/Math.sin(e.hingeAngle*Math.PI/180)-.001}function A(e){E(e);let{hingeCenter:t,hingeCenter2:n,hingeRadius:r,rest1:a,atHeight:s,start:c,rest2:u,center:d,holeRadius:f,slope:m}=i(e),h={base_end_points:[a,s,c,u].map(({y:e,z:t})=>[e,t]),base_end_inner_points:o(e),base_end_cut_points:l(e),base_end_hole_centre:[d.y,d.z],base_end_hole_radius:f,hinge_centres:[[t.y,t.z],[n.y,n.z]],hinge_radius:r,hinge_cut_length:e.wallThickness*2+e.hingeProfileWidth+e.hingeTolerance+C(e),cell_width:e.cellWidth,full_raised_profiles:D(e),semi_raised_profiles:O(e),base_height:e.baseHeight,semi_raised_height:e.baseHeight-e.wallThickness-e.hingeThickness-e.hingeTolerance,cell_pad_end_points:b(e,C(e)).map(({x:e,y:t})=>[e,t]),cell_mid_cut_points:e.cellMidCutWidth>0?y(e):[],cell_mid_cut_width:e.cellMidCutWidth,cell_outer_points:p(e).map(({x:e,y:t})=>[e,t]),rows:e.rows,columns:e.columns,column_pitch:e.cellWidth+e.wallThickness,row_pitch:k(e),wall_thickness:e.wallThickness,stand_thickness:e.standThickness,shear:m};return Object.entries(h).flatMap(([e,t])=>[`-D`,`${e}=${JSON.stringify(t)}`])}function j(e){return{radius:e.hingeThickness/2,centre:{y:0,z:0}}}function M(e){let t=T(e);return[[t.outer1.x,t.outer1.y],...d(t.outer2),[t.outer3.x,t.outer3.y],[t.outer4.x,t.outer4.y],[t.inner3.x,t.inner3.y],...d(t.inner2),[t.inner1.x,t.inner1.y]]}function N(e){E(e);let{radius:t,centre:n}=j(e),r=S(e)[2],[,,i,a]=x(e),[o,s]=w(e),c={hinge_thickness:e.hingeThickness,hinge_outline_points:M(e),circle_centre:[n.y,n.z],circle_radius:t,circle_x:r.x,pin_extension:e.hingePinExtension,circle_length:e.hingeProfileWidth+e.wallThickness,bridge_points:[i,a,s,o].map(({x:e,y:t})=>[e,t]),columns:e.columns,column_pitch:e.cellWidth+e.wallThickness};return Object.entries(c).flatMap(([e,t])=>[`-D`,`${e}=${JSON.stringify(t)}`])}function P(e){return{outerRadius:(e.baseHeight-e.hingeTolerance)/2,innerRadius:i(e).holeRadius-e.boltTolerance/2}}function F(e){E(e);let{outerRadius:t,innerRadius:n}=P(e);if(n<=0)throw Error(`The bolt shank radius must be greater than zero.`);let r={wall_thickness:e.wallThickness,head_radius:t,shank_radius:n,shank_length:e.boltLength+e.wallThickness,chamfer:n/3};return Object.entries(r).flatMap(([e,t])=>[`-D`,`${e}=${JSON.stringify(t)}`])}function I(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function L(e,t,n,r){let i=[];return e.forEach((a,o)=>{let s=e[(o+1)%e.length],c=t*a[0]+n*a[1]-r,l=t*s[0]+n*s[1]-r;if(c<=0&&i.push(a),c<=0!=l<=0){let e=c/(c-l);i.push([a[0]+e*(s[0]-a[0]),a[1]+e*(s[1]-a[1])])}}),i}function R(e){return e.reduce((t,n,r)=>{let i=e[(r+1)%e.length];return t+n[0]*i[1]-i[0]*n[1]},0)/2}function z(e){let t=R(e),n=0,r=0;return e.forEach((t,i)=>{let a=e[(i+1)%e.length],o=t[0]*a[1]-a[0]*t[1];n+=(t[0]+a[0])*o,r+=(t[1]+a[1])*o}),[n/(6*t),r/(6*t)]}function B(e,t){let n=Math.sign(R(e)),r=e;return e.forEach((i,a)=>{let o=e[(a+1)%e.length],s=Math.hypot(o[0]-i[0],o[1]-i[1]);if(s<1e-12)return;let c=n*(o[1]-i[1])/s,l=n*-(o[0]-i[0])/s;r=L(r,c,l,c*i[0]+l*i[1]-t)}),r}function V(e,t){let n=e.filter((t,n)=>{let r=e[(n+1)%e.length];return Math.hypot(r[0]-t[0],r[1]-t[1])>1e-9}),r=R(n)>0?n:[...n].reverse(),i=(e,t)=>Math.atan2(-(t[0]-e[0]),t[1]-e[1]);return r.flatMap((e,n)=>{let a=r[(n+r.length-1)%r.length],o=r[(n+1)%r.length],s=i(a,e),c=i(e,o)-s;for(;c<0;)c+=2*Math.PI;for(;c>=2*Math.PI;)c-=2*Math.PI;let l=Math.max(1,Math.ceil(64*c/(2*Math.PI)));return Array.from({length:l+1},(n,r)=>{let i=s+c*r/l;return[e[0]+t*Math.cos(i),e[1]+t*Math.sin(i)]})})}function H(e,t,n,r){let[i,a]=t[n],o=e;return t.forEach(([e,t],s)=>{if(s===n||o.length===0)return;let c=Math.hypot(e-i,t-a);if(c<1e-9)return;let l=(e-i)/c,u=(t-a)/c;o=L(o,l,u,l*(i+e)/2+u*(a+t)/2-r)}),o}function U(e,{cellSize:t,ribWidth:n,cornerRadius:r,seed:i,relaxations:a=1,jitter:o=1.6}){let s=e.map(e=>e[0]),c=e.map(e=>e[1]),l=Math.max(...s),u=Math.min(...c),d=Math.max(...c),f=I(i),p=t*Math.sqrt(3)/2,m=t*.2,h=[];for(let e=0;u+p*(e+.5)<d;e++)for(let n=e%2?t/2:0;n<l;n+=t){let r=n+(f()-.5)*o*t,i=u+p*(e+.5)+(f()-.5)*o*p;h.push([r<m?0:Math.min(r,l),Math.min(Math.max(i,u),d)])}let g=e=>[...e,...e.filter(e=>e[0]>0).map(([e,t])=>[-e,t])];for(let t=0;t<a;t++){let t=g(h);h=h.map((n,r)=>{let i=H(e,t,r,0);if(i.length<3||Math.abs(R(i))<1e-9)return n;let[a,o]=z(i);return[n[0]===0||a<m/4?0:a,o]})}let _=g(h),v=B(e,r);return _.flatMap((e,t)=>{let i=H(v,_,t,n/2+r);return i.length<3||Math.abs(R(i))<1e-6?[]:[V(i,r)]})}function W(e){let{center:t,start:n,outer3:r,outer4:a,arcRadius:o}=i(e),[s,c]=p(e),l=Math.hypot(r.y-a.y,r.z-a.z),u=t.y-n.y,d=u+(s.y-c.y)+k(e)*(e.rows-1),f=e.standAngle*Math.PI/180,m=e.baseTiltAngle*Math.PI/180,h=f+m,g=h>=Math.PI/2?-o:-(o+e.standThickness),_=(d*Math.sin(m)+t.z*Math.cos(m)+g*Math.cos(h))/Math.sin(h),v=(e.wallThickness*(e.columns+1)+e.cellWidth*e.columns)/2-e.wallThickness;return{yTop1:l,yTop2:u,fullLength:d,standLength:_,outer1:{x:v,y:l},outer2:{x:v,y:-_},outer3:{x:0,y:-_},outer4:{x:0,y:l},inner1:{x:0,y:-e.standProfileWidthVertical},inner2:{x:v-e.standProfileWidthHorizontal,y:-e.standProfileWidthVertical},inner3:{x:v-e.standProfileWidthHorizontal,y:-_+e.standProfileWidthVertical},inner4:{x:0,y:-_+e.standProfileWidthVertical}}}function G(e){let{inner1:t,inner2:n,inner3:r,inner4:i}=W(e),a=Math.min(e.standProfileWidthVertical/2,e.standProfileWidthHorizontal/2,(n.y-r.y)/2,n.x);return{inner3:u(i,r,n,a),inner2:u(r,n,t,a)}}function K(e){let{inner2:t,inner3:n}=G(e),r=[...d(n),...d(t)],i=r.map(([e,t])=>[-e,t]).reverse();return[...r,...i]}function q(e){let{inner2:t,inner3:n}=W(e);if(t.x<=0||t.y-n.y<=0)return[];let r=K(e);return e.standPatternCellSize<=0?[r]:U(r,{cellSize:e.standPatternCellSize,ribWidth:e.standPatternRibWidth,cornerRadius:e.standPatternCornerRadius,seed:e.standPatternSeed,jitter:e.standPatternJitter,relaxations:e.standPatternRelaxations})}function J(e){let t=i(e).arcRadius,n=(e.baseHeight-e.standHingeTolerance)/2,r={y:W(e).yTop1,z:-t},a=e.hingeAngle*Math.PI/180,o=Math.PI/2+a,s={y:-(n+t*Math.cos(a))/Math.sin(a),z:-t},c=Math.hypot(r.y,r.z),l=Math.atan2(r.z,r.y)+Math.acos(n/c);return{outerRadius:n,innerRadius:(e.baseHeight-2*e.wallThickness)/2,outer1Angle:l,outer2Angle:o,outer1:{y:n*Math.cos(l),z:n*Math.sin(l)},outer2:{y:n*Math.cos(o),z:n*Math.sin(o)},outer3:s,outer4:r,outer5:{y:s.y,z:-t-e.standThickness},outer6:{y:r.y,z:-t-e.standThickness}}}function Y(e){let t=W(e);return[t.outer1,t.outer2,t.outer3,t.outer4].map(({x:e,y:t})=>[e,t])}function X(e){let{outerRadius:t,outer1Angle:n,outer2Angle:r,outer3:i,outer4:a}=J(e),o=2*Math.PI/64,s=[n];for(let e=Math.floor(n/o+1e-9)+1;e*o<r-1e-9;e++)s.push(e*o);return s.push(r),[...s.map(e=>[t*Math.cos(e),t*Math.sin(e)]),[i.y,i.z],[a.y,a.z]]}function Z(e){E(e);let t={stand_thickness:e.standThickness,top_points:Y(e),top_holes:q(e),side_points:X(e),side_hole_radius:J(e).innerRadius,side_x:W(e).outer1.x,top_z:J(e).outer3.z};return Object.entries(t).flatMap(([e,t])=>[`-D`,`${e}=${JSON.stringify(t)}`])}function Q(e,t){let n=[];for(let r of t.filter((e,t)=>t%2==1)){let t=r.slice(0,r.indexOf(`=`)).trim(),i=RegExp(`^${t}\\s*=.*;[ \\t]*$`,`m`);i.test(e)?e=e.replace(i,()=>`${r};`):n.push(`${r};`)}return[e,...n].join(`
`)}let $={base:{source:e,definitions:A},hinge:{source:t,definitions:N},bolt:{source:n,definitions:F},stand:{source:r,definitions:Z}};self.onmessage=async({data:e})=>{let t=[];try{let n=$[e.model],r=e.format??`stl`,i=[...n.definitions(e.params),...e.color?[`-D`,`part_color=${JSON.stringify(e.color)}`]:[]],{default:a}=await import(
/* @vite-ignore */
e.runtimeUrl),o=await a({noInitialRun:!0,print:e=>t.push(e),printErr:e=>t.push(e)});o.FS.writeFile(`/model.scad`,Q(n.source,i));let s=o.callMain([`/model.scad`,`--export-format`,r===`stl`?`binstl`:`3mf`,`-o`,`/model.${r}`]);if(s!==0)throw Error(t.join(`
`)||`OpenSCAD exited with code ${s}.`);let c=o.FS.readFile(`/model.${r}`).slice().buffer;self.postMessage({stl:c},{transfer:[c]})}catch(e){self.postMessage({error:e instanceof Error?e.message:String(e)})}}})();