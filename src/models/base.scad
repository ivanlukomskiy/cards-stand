// Parameters and cell_inner_points are supplied by src/model.ts.
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
    // Extrusion 1: inner rectangle, with wall thickness measured along Z.
    angled_extrusion(wall_thickness)
        polygon(points = cell_inner_points);
}

union() {
    for (row = [0 : rows - 1])
        for (column = [0 : columns - 1])
            translate([column * column_pitch, row * row_pitch, 0])
                cell();
}
