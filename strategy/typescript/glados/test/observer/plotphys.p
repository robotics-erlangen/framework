set decimalsign ','
set decimalsign locale

unset label
set xlabel "ball travel distance (meters)"
set ylabel "time difference (seconds)"

plot "physics.test" using 3:2 title "t_ball - t_robot" with line, "physics.test" using 3:4 title "" with line

set term png
set output "graph.png"
replot
