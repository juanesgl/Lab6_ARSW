package co.edu.eci.blueprints.filters;

import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.model.Point;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Elimina puntos consecutivos duplicados (x,y) para reducir redundancia.
 * Perfil: "redundancy"
 */
@Component
@Profile("redundancy")
public class RedundancyFilter implements BlueprintsFilter {
    @Override
    public Blueprint apply(Blueprint bp) {
        if (bp == null) return null;
        List<Point> in = bp.getPoints();
        if (in == null || in.isEmpty()) return bp;
        List<Point> out = new ArrayList<>();
        Point prev = null;
        for (Point p : in) {
            if (prev == null || !(prev.getX() == p.getX() && prev.getY() == p.getY())) {
                out.add(p);
                prev = p;
            }
        }
        return new Blueprint(bp.getAuthor(), bp.getName(), out);
    }
}
