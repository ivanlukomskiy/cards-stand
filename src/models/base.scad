// Parameters and sketch profiles are supplied by src/model.ts.
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
