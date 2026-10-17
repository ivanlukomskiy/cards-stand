// All dimensions are millimeters. Keep the base centered on the build plate.
side_length = 50;

module base(side) {
    translate([-side / 2, -side / 2, 0])
        cube([side, side, side]);
}

base(side_length);
