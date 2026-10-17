// Parameters are supplied by src/bolt-model.ts.
union() {
    // The Bolt sketch's red circle, extruded along Z by wall thickness.
    cylinder(r = head_radius, h = wall_thickness, $fn = 64);
    // The green circle, extruded by bolt length + wall thickness, with a 45° chamfer at its end.
    cylinder(r = shank_radius, h = shank_length - chamfer, $fn = 64);
    translate([0, 0, shank_length - chamfer])
        cylinder(r1 = shank_radius, r2 = shank_radius - chamfer, h = chamfer, $fn = 64);
}
