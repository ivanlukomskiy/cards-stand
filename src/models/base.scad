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

module cell() {
    union() {
        // Extrusion 1: outer rectangle floor, with wall thickness measured along Z.
        angled_extrusion(wall_thickness)
            polygon(points = cell_outer_points);
        // Full raised: right side wall and front strip, plus its Y-axis mirror, at the full base height.
        for (profile = full_raised_profiles)
            angled_extrusion(base_height)
                polygon(points = profile);
        // Semi raised: back strip between the rims, plus its mirror, lowered by the hinge thickness and tolerance.
        for (profile = semi_raised_profiles)
            angled_extrusion(semi_raised_height)
                polygon(points = profile);
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
