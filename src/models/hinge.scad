// Parameters and sketch profiles are supplied by src/hinge-model.ts.
// The Hinge top sketch's blue outline, extruded along Z by wall thickness.
linear_extrude(height = wall_thickness)
    polygon(points = hinge_outline_points);
