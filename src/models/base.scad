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
        // Outer rim segments use the full base height.
        for (profile = rim_profiles)
            angled_extrusion(base_height)
                polygon(points = profile);
    }
}

union() {
    for (row = [0 : rows - 1])
        for (column = [0 : columns - 1])
            translate([column * column_pitch, row * row_pitch, 0])
                cell();
}
