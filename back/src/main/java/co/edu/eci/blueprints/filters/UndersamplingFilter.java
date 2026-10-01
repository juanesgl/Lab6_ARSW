package co.edu.eci.blueprints.filters;

import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.model.Point;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Undersampling: conserva 1 de cada 2 puntos (índices pares), reduciendo la densidad.
 * Perfil: "undersampling"
 */
@Component
@Profile("undersampling")
public class UndersamplingFilter implements BlueprintsFilter {
    @Override
    public Blueprint apply(Blueprint bp) {
        if (bp == null) return null;
        List<Point> in = bp.getPoints();
        if (in == null || in.isEmpty()) return bp;
        List<Point> out = new ArrayList<>();
        for (int i = 0; i < in.size(); i += 2) {
            out.add(in.get(i));
        }
        return new Blueprint(bp.getAuthor(), bp.getName(), out);
    }
}
