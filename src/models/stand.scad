// Parameters and sketch profiles are supplied by src/stand-model.ts.
union() {
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
