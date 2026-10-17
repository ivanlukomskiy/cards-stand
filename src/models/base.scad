// Parameters and sketch profiles are supplied by src/model.ts.
// Angle is measured from +Y toward +Z in the YOZ plane.
module angled_extrusion(z_distance) {
    multmatrix([
        [1, 0, 0, 0],
        [0, 1, 1 / tan(base_angle), 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ])
        linear_extrude(height = z_distance)
            children();
}

module cell() {
    union() {
        // Extrusion 1: inner rectangle, with wall thickness measured along Z.
        angled_extrusion(wall_thickness)
            polygon(points = cell_inner_points);
        // Two right profiles and their Y-axis mirrors, starting at Z=0.
        for (profile = raised_profiles)
            angled_extrusion(raised_height)
                polygon(points = profile);
        // Side and outer rim profiles use the full base height.
        for (profile = full_height_profiles)
            angled_extrusion(base_height)
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
    // The sketch's (Y,Z) capsule is extruded along X through one outside wall.
    multmatrix([
        [0, 0, 1, x_start],
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
    ])
        linear_extrude(height = wall_thickness)
            hull() {
                for (centre = hinge_centres)
                    translate(centre)
                        circle(r = hinge_radius, $fn = 64);
            }
}

module edge_hinge_cuts() {
    for (row = [0 : rows - 1])
        translate([0, -row * row_pitch, 0]) {
            hinge_capsule_cut(-cell_width / 2 - wall_thickness);
            hinge_capsule_cut((columns - 1) * column_pitch + cell_width / 2);
        }
}

module base_end() {
    // The sketch's (Y,Z) base end polygon is extruded along X across the full model width.
    multmatrix([
        [0, 0, 1, -cell_width / 2 - wall_thickness],
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
    ])
        linear_extrude(height = (columns - 1) * column_pitch + cell_width + 2 * wall_thickness)
            polygon(points = base_end_points);
}

union() {
    difference() {
        base_solid();
        edge_hinge_cuts();
    }
    // Fused to row 0 along the outer 1–outer 2 face.
    base_end();
}
