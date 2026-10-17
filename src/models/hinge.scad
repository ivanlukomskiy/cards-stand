// Parameters and sketch profiles are supplied by src/hinge-model.ts.
module hinge_half() {
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
        linear_extrude(height = circle_length)
            translate(circle_centre)
                circle(r = circle_radius, $fn = 64);
}

// Mirror across the ZOY plane; the halves meet along outer 1–inner 1 at X = 0.
module hinge() {
    hinge_half();
    mirror([1, 0, 0])
        hinge_half();
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
            hinge();
    // The green bridge polygon, extruded like the blue outline, joins each pair of neighbours; none at the model's outer sides.
    if (columns > 1)
        for (column = [0 : columns - 2])
            translate([column * column_pitch, 0, 0])
                linear_extrude(height = hinge_thickness, center = true)
                    polygon(points = bridge_points);
}
