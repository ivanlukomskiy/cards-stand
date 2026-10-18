// Parameters and sketch profiles are supplied by src/stand-model.ts.
module stand_half() {
    // The Stand top sketch's blue outline minus its holes, extruded along -Z by wall thickness from Z = Stand side outer 3 Z.
    translate([0, 0, top_z - wall_thickness])
        linear_extrude(height = wall_thickness)
            difference() {
                polygon(points = top_points);
                for (hole = top_holes)
                    polygon(points = hole);
            }
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
