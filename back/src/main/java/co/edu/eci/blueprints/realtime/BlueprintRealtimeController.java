package co.edu.eci.blueprints.realtime;

import co.edu.eci.blueprints.model.Point;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.io.IOException;

@Controller
public class BlueprintRealtimeController {

    public static final int CANVAS_WIDTH = 520;
    public static final int CANVAS_HEIGHT = 360;

    private static final Logger log = LoggerFactory.getLogger(BlueprintRealtimeController.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final SimpMessagingTemplate messaging;

    public BlueprintRealtimeController(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @MessageMapping("/draw")
    public void draw(@Payload DrawEvent event) throws IOException {
        String author = sanitize(event.author());
        String name = sanitize(event.name());

        if (author.isEmpty() || name.isEmpty()) {
            throw new IllegalArgumentException(
                    "author and name are required and must match [A-Za-z0-9._- ]{1,64}");
        }
        if (event.point() == null) {
            throw new IllegalArgumentException("point is required");
        }

        Point point = MAPPER.convertValue(event.point(), Point.class);
        if (point.getX() < 0 || point.getX() > CANVAS_WIDTH
                || point.getY() < 0 || point.getY() > CANVAS_HEIGHT) {
            throw new IllegalArgumentException(
                    "point out of canvas bounds: 0.." + CANVAS_WIDTH + " x 0.." + CANVAS_HEIGHT);
        }

        messaging.convertAndSend(topicFor(author, name),
                new DrawEvent(author, name, point, sanitizeClientId(event.clientId())));
        log.info("draw point ({},{}) on blueprint {}/{}", point.getX(), point.getY(), author, name);
    }

    public static String topicFor(String author, String name) {
        return "/topic/blueprints." + author + "." + name;
    }

    private String sanitize(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.matches("[A-Za-z0-9._\\- ]{1,64}") ? trimmed : "";
    }

    // Se reenvía tal cual para que el emisor descarte su eco; si no es válido se omite.
    private String sanitizeClientId(String value) {
        return value != null && value.matches("[A-Za-z0-9-]{1,64}") ? value : null;
    }

    public record DrawEvent(String author, String name, Point point, String clientId) {
    }
}